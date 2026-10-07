import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { searchGlobal } from '../../services/api';
import type { SearchResultItem } from '../../types/api';

export interface MapSearchBarProps {
  onSelectTrain: (trainNumber: string) => void;
  onSelectStation?: (stationCode: string, stationName: string) => void;
  onClear?: () => void;
  recentSearches?: string[];
  placeholder?: string;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  onSelectTrain,
  onSelectStation,
  onClear,
  recentSearches = ['12046', '12301', '12002', 'NDLS'],
  placeholder = 'Search train number, name, or station...',
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, SearchResultItem[]>>(new Map());

  // Debounced live search with client-side query caching
  useEffect(() => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    const cacheKey = cleanQuery.toLowerCase();
    if (searchCacheRef.current.has(cacheKey)) {
      setResults(searchCacheRef.current.get(cacheKey)!);
      setIsLoading(false);
      setHasSearched(true);
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const items = await searchGlobal(cleanQuery, { signal: controller.signal });
        searchCacheRef.current.set(cacheKey, items);
        setResults(items);
        setHasSearched(true);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    onClear?.();
  }, [onClear]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      if (item.type === 'TRAIN' && item.trainNumber) {
        onSelectTrain(item.trainNumber);
        setQuery(`${item.trainNumber} - ${item.trainName || ''}`);
        setIsOpen(false);
      } else if (item.type === 'STATION' && item.stationCode) {
        if (onSelectStation) {
          onSelectStation(item.stationCode, item.stationName || item.stationCode);
          setQuery(`${item.stationName} (${item.stationCode})`);
          setIsOpen(false);
        } else {
          // When a station is clicked, filter search to that station code to reveal its trains
          setQuery(item.stationCode);
        }
      }
    },
    [onSelectTrain, onSelectStation]
  );

  const handleQuickChip = useCallback(
    (chip: string) => {
      if (/^\d{5}$/.test(chip)) {
        onSelectTrain(chip);
        setQuery(chip);
        setIsOpen(false);
      } else if (onSelectStation && /^[A-Z]{2,5}$/.test(chip)) {
        onSelectStation(chip, chip);
        setQuery(chip);
        setIsOpen(false);
      } else {
        setQuery(chip);
      }
    },
    [onSelectTrain, onSelectStation]
  );

  return (
    <View style={styles.container}>
      {/* Search Input Box */}
      <View style={[styles.searchBarBox, isOpen && styles.searchBarBoxOpen]}>
        <Ionicons name="search" size={18} color={theme.colors.accent} style={styles.searchIcon} />

        <TextInput
          style={styles.textInput}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 || results.length > 0) {
              setIsOpen(true);
            }
          }}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search train by number, name, or station"
          accessibilityHint="Type to see live railway search suggestions"
        />

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.colors.accent} style={styles.actionIcon} />
        ) : query.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.actionIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search text"
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Quick Recent Search Chips (shown when not actively searching dropdown) */}
      {!isOpen && recentSearches && recentSearches.length > 0 && (
        <View style={styles.recentChipsRow}>
          <Text style={styles.recentLabel}>QUICK:</Text>
          {recentSearches.slice(0, 4).map((chip) => (
            <TouchableOpacity
              key={chip}
              style={styles.chip}
              onPress={() => handleQuickChip(chip)}
              activeOpacity={0.7}
              accessibilityLabel={`Search ${chip}`}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Suggestions Dropdown Overlay */}
      {isOpen && query.trim().length >= 2 && (
        <View style={styles.dropdown}>
          {isLoading && results.length === 0 ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.statusText}>Searching Indian Railway services...</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item, index) =>
                item.type === 'TRAIN'
                  ? `TRAIN_${item.trainNumber}_${index}`
                  : `STN_${item.stationCode}_${index}`
              }
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              style={styles.list}
              renderItem={({ item }) => {
                if (item.type === 'TRAIN') {
                  return (
                    <TouchableOpacity
                      style={styles.resultItem}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Train ${item.trainNumber} ${item.trainName}`}
                    >
                      <View style={styles.itemIconCol}>
                        <View style={styles.trainBadge}>
                          <Ionicons name="train-sharp" size={14} color={theme.colors.accent} />
                        </View>
                      </View>
                      <View style={styles.itemDetailsCol}>
                        <View style={styles.itemTitleRow}>
                          <Text style={styles.trainNumber}>{item.trainNumber}</Text>
                          <Text style={styles.trainName} numberOfLines={1}>
                            {item.trainName}
                          </Text>
                        </View>
                        {item.source && item.destination && (
                          <Text style={styles.routeSubtext}>
                            {item.source.code} ({item.source.name}) → {item.destination.code} (
                            {item.destination.name})
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  );
                }

                // Station Result
                return (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Station ${item.stationName} (${item.stationCode})`}
                  >
                    <View style={styles.itemIconCol}>
                      <View style={styles.stationBadge}>
                        <Text style={styles.stationBadgeCode}>{item.stationCode}</Text>
                      </View>
                    </View>
                    <View style={styles.itemDetailsCol}>
                      <Text style={styles.stationName} numberOfLines={1}>
                        {item.stationName}
                      </Text>
                      {(item.city || item.state) && (
                        <Text style={styles.routeSubtext}>
                          {[item.city, item.state].filter(Boolean).join(', ')}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="search-outline" size={15} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                );
              }}
            />
          ) : hasSearched ? (
            <View style={styles.statusRow}>
              <Ionicons name="alert-circle-outline" size={18} color={theme.colors.textMuted} />
              <Text style={styles.statusText}>No trains or stations found for "{query}".</Text>
            </View>
          ) : null}

          {/* Close Dropdown Bar */}
          <TouchableOpacity
            style={styles.closeDropdownBtn}
            onPress={() => setIsOpen(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.closeDropdownText}>Close Suggestions</Text>
            <Ionicons name="chevron-up" size={14} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    zIndex: 1000,
    marginBottom: theme.spacing.sm,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  searchBarBoxOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: theme.colors.accent,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  textInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineWidth: 0,
      } as any,
    }),
  },
  actionIcon: {
    marginLeft: theme.spacing.xs,
    padding: 4,
  },
  recentChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 6,
  },
  recentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginRight: 2,
  },
  chip: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 1001,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.accent,
    borderBottomLeftRadius: theme.borderRadius.lg,
    borderBottomRightRadius: theme.borderRadius.lg,
    maxHeight: 280,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  list: {
    maxHeight: 240,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  itemIconCol: {
    marginRight: 10,
  },
  trainBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationBadgeCode: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  itemDetailsCol: {
    flex: 1,
    marginRight: 6,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trainNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  trainName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  stationName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  routeSubtext: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  closeDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    gap: 4,
  },
  closeDropdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
});

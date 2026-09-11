import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useDebounce } from '../../hooks/useDebounce';
import { searchStationsApi } from '../../services/api';
import type { StationSearchResult } from '../../types/api';

export interface StationAutocompleteInputProps {
  label: string;
  placeholder?: string;
  selectedStation: StationSearchResult | null;
  onSelectStation: (station: StationSearchResult | null) => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  isError?: boolean;
}

export function StationAutocompleteInput({
  label,
  placeholder = 'Search station name or code...',
  selectedStation,
  onSelectStation,
  iconName = 'location-outline',
  isError = false,
}: StationAutocompleteInputProps) {
  const [inputText, setInputText] = useState(
    selectedStation ? `${selectedStation.name} (${selectedStation.code})` : ''
  );
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<StationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Sync external changes (such as station swap or reset)
  useEffect(() => {
    if (selectedStation) {
      setInputText(`${selectedStation.name} (${selectedStation.code})`);
    } else if (!isFocused) {
      setInputText('');
    }
  }, [selectedStation, isFocused]);

  const debouncedQuery = useDebounce(inputText, 350);

  useEffect(() => {
    let isCancelled = false;

    // Do not trigger search if query is formatted "Name (CODE)" and matches selectedStation
    if (selectedStation && inputText === `${selectedStation.name} (${selectedStation.code})`) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    searchStationsApi(trimmed)
      .then((results) => {
        if (!isCancelled) {
          setSuggestions(results);
          setIsLoading(false);
          setHasSearched(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSuggestions([]);
          setIsLoading(false);
          setHasSearched(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, selectedStation, inputText]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (selectedStation) {
      onSelectStation(null);
    }
  };

  const handleSelect = (station: StationSearchResult) => {
    setInputText(`${station.name} (${station.code})`);
    onSelectStation(station);
    setSuggestions([]);
    setIsFocused(false);
  };

  const handleClear = () => {
    setInputText('');
    onSelectStation(null);
    setSuggestions([]);
    setHasSearched(false);
  };

  const trimmedLen = inputText.trim().length;
  const showDropdown = isFocused && trimmedLen >= 1 && !selectedStation;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          isError && styles.inputWrapperError,
          selectedStation && styles.inputWrapperSelected,
        ]}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={selectedStation ? theme.colors.accent : theme.colors.textMuted}
          style={styles.leadingIcon}
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          value={inputText}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay closing dropdown slightly so click/tap on suggestion item registers
            setTimeout(() => setIsFocused(false), 200);
          }}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="done"
          accessibilityLabel={label}
        />

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={theme.colors.accent}
            style={styles.trailingIcon}
          />
        )}

        {!isLoading && inputText.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Clear station search input"
          >
            <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}

        {selectedStation && (
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{selectedStation.code}</Text>
          </View>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <View style={styles.dropdownContainer}>
          {trimmedLen === 1 ? (
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.hintText}>Type 2 or more letters to search stations...</Text>
            </View>
          ) : isLoading && suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={styles.loadingText}>Searching stations...</Text>
            </View>
          ) : suggestions.length > 0 ? (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              style={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Select station ${item.name}, station code ${item.code}${item.city ? `, in ${item.city}` : ''}`}
                >
                  <View style={styles.suggestionLeft}>
                    <Text style={styles.stationName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {(item.city || item.state) && (
                      <Text style={styles.stationSubtext} numberOfLines={1}>
                        {[item.city, item.state].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.suggestionBadge}>
                    <Text style={styles.suggestionBadgeText}>{item.code}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : hasSearched ? (
            <View style={styles.noResultsRow}>
              <Ionicons name="alert-circle-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.noResultsText}>
                No stations found matching &quot;{inputText}&quot;
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
    position: 'relative',
    zIndex: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.cardBackground,
  },
  inputWrapperError: {
    borderColor: theme.colors.delayed,
  },
  inputWrapperSelected: {
    borderColor: theme.colors.borderSubtle,
  },
  leadingIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  trailingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  codeBadge: {
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginLeft: 8,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 4,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  list: {
    maxHeight: 220,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  suggestionLeft: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stationSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  suggestionBadge: {
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  noResultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.md,
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

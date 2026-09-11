import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ResponsiveContainer } from '../../components/common/ResponsiveContainer';
import { MOCK_TRAINS } from '../../data/mockTrains';
import { TrainSummaryCard } from '../../components/train/TrainSummaryCard';

const FILTER_TAGS = ['All', 'Rajdhani', 'Shatabdi', 'Vande Bharat', 'On Time', 'Delayed'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const allTrains = useMemo(() => Object.values(MOCK_TRAINS), []);

  const filteredTrains = useMemo(() => {
    return allTrains.filter((train) => {
      // Text query match (number, name, source, or dest)
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        train.trainNumber.toLowerCase().includes(q) ||
        train.trainName.toLowerCase().includes(q) ||
        train.sourceStation.toLowerCase().includes(q) ||
        train.destinationStation.toLowerCase().includes(q) ||
        train.sourceCode.toLowerCase().includes(q) ||
        train.destinationCode.toLowerCase().includes(q);

      if (!matchesQuery) return false;

      // Filter tag match
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Rajdhani') return train.trainName.includes('Rajdhani');
      if (activeFilter === 'Shatabdi') return train.trainName.includes('Shatabdi');
      if (activeFilter === 'Vande Bharat') return train.trainName.includes('Vande Bharat');
      if (activeFilter === 'On Time') return train.status === 'ON_TIME';
      if (activeFilter === 'Delayed') return train.status === 'DELAYED';

      return true;
    });
  }, [allTrains, query, activeFilter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ResponsiveContainer>
          <View style={styles.content}>
            {/* Screen Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Find Train</Text>
              <Text style={styles.headerSubtitle}>
                Search by 5-digit number, name, or station code
              </Text>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search train name, number, station..."
                placeholderTextColor={theme.colors.textMuted}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Chips Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScroll}
              style={styles.filtersWrapper}
            >
              {FILTER_TAGS.map((tag) => {
                const isActive = activeFilter === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Train List / Results */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            >
              <View style={styles.countRow}>
                <Text style={styles.resultsCount}>
                  Showing {filteredTrains.length} {filteredTrains.length === 1 ? 'train' : 'trains'}
                </Text>
              </View>

              {filteredTrains.length > 0 ? (
                filteredTrains.map((train) => (
                  <TrainSummaryCard key={train.trainNumber} train={train} />
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Ionicons name="train-outline" size={36} color={theme.colors.textMuted} />
                  <Text style={styles.emptyTitle}>No matching trains</Text>
                  <Text style={styles.emptySubtitle}>
                    Try searching for &quot;12301&quot;, &quot;Rajdhani&quot;, or &quot;NDLS&quot;
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </ResponsiveContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    marginBottom: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    marginLeft: theme.spacing.sm,
  },
  clearBtn: {
    padding: 4,
  },
  filtersWrapper: {
    maxHeight: 38,
    marginBottom: theme.spacing.md,
  },
  filtersScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#070B14',
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: theme.spacing.xl,
  },
  countRow: {
    marginBottom: theme.spacing.sm,
  },
  resultsCount: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.6,
  },
  emptyBox: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});


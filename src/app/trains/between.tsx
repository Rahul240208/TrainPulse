import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { ResponsiveContainer } from '../../components/common/ResponsiveContainer';
import { fetchTrainsBetween } from '../../services/api';
import { ErrorCard } from '../../components/common/ErrorCard';
import { TrainResultCard } from '../../components/journey/TrainResultCard';
import type { TrainsBetweenResult, TrainBetweenItem } from '../../types/api';

export default function TrainsBetweenScreen() {
  const params = useLocalSearchParams<{
    from?: string;
    to?: string;
    fromName?: string;
    toName?: string;
  }>();

  const router = useRouter();

  const fromCode = (params.from || '').trim().toUpperCase();
  const toCode = (params.to || '').trim().toUpperCase();
  const fromName = params.fromName || fromCode;
  const toName = params.toName || toCode;

  const [data, setData] = useState<TrainsBetweenResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; statusCode?: number } | null>(null);

  const loadTrains = useCallback(async (isPullToRefresh = false) => {
    if (!fromCode || !toCode) {
      setError({
        message: 'Invalid search route parameters. Please select both stations.',
        code: 'INVALID_PARAMS',
        statusCode: 400,
      });
      setIsLoading(false);
      return;
    }

    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await fetchTrainsBetween(fromCode, toCode);
      setData(result);
    } catch (err: any) {
      setError({
        message: err.message || 'Unable to fetch trains for this route.',
        code: err.code || 'UNKNOWN_ERROR',
        statusCode: err.statusCode || 500,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fromCode, toCode]);

  useEffect(() => {
    loadTrains();
  }, [loadTrains]);

  const handleTrackTrain = (trainNumber: string) => {
    router.push({
      pathname: '/(tabs)/map',
      params: { trainNumber },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ResponsiveContainer>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerRoute}>
            <View style={styles.headerCodesRow}>
              <Text style={styles.headerCode}>{fromCode}</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.accent} />
              <Text style={styles.headerCode}>{toCode}</Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {fromName} ➔ {toName}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => loadTrains(true)}
            style={styles.refreshButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles.loadingText}>Searching trains on route...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorWrapper}>
            <ErrorCard
              code={error.code}
              message={error.message}
              statusCode={error.statusCode}
              onRetry={() => loadTrains()}
              onBack={() => router.back()}
            />
          </View>
        ) : !data || data.totalTrains === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="train-outline" size={40} color={theme.colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No trains found for this route.</Text>
            <Text style={styles.emptySubtitle}>
              There are no direct services scheduled between {fromName} ({fromCode}) and {toName} ({toCode}) in the database.
            </Text>
            <TouchableOpacity
              style={styles.backSearchButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.backSearchText}>Modify Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadTrains(true)}
                tintColor={theme.colors.accent}
                colors={[theme.colors.accent]}
              />
            }
          >
            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <View>
                <Text style={styles.sectionTitle}>Available Trains</Text>
                <Text style={styles.sectionSubtitle}>
                  {data.totalTrains} {data.totalTrains === 1 ? 'train service' : 'train services'} found
                </Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live Telemetry Ready</Text>
              </View>
            </View>

            {/* Trains List */}
            {data.trains.map((train) => (
              <TrainResultCard
                key={train.trainNumber}
                train={train}
                onTrack={() => handleTrackTrain(train.trainNumber)}
              />
            ))}
          </ScrollView>
        )}
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.cardBackground,
  },
  backButton: {
    padding: 4,
  },
  headerRoute: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: theme.spacing.sm,
  },
  headerCodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCode: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  refreshButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  errorWrapper: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
    maxWidth: 320,
  },
  backSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
  },
  backSearchText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.onTime,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.onTime,
    letterSpacing: 0.2,
  },
});

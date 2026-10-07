import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import type { LiveTrainData } from '../../types/api';
import type { MockTrain } from '../../data/mockTrains';

export interface MapStatusPanelProps {
  train: LiveTrainData | MockTrain | null;
  isLoading?: boolean;
  isStale?: boolean;
  backgroundError?: string | null;
  lastSuccessfulUpdate?: Date | null;
  onRefresh?: () => void;
}

export type StatusCategory =
  | 'RUNNING'
  | 'ON_TIME'
  | 'DELAYED'
  | 'NOT_STARTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DIVERTED'
  | 'UNKNOWN';

export interface StatusPresentation {
  category: StatusCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

/**
 * Normalizes status string and determines visual/textual indicator.
 * Strictly supports:
 * - Running
 * - On Time
 * - Delayed
 * - Not Started
 * - Completed
 * - Cancelled
 * - Diverted
 * - Unknown
 */
export function getStatusPresentation(
  theme: any,
  status?: string | null,
  delayMinutes?: number | null
): StatusPresentation {
  const normalized = (status || '').toUpperCase().trim();
  const delay = typeof delayMinutes === 'number' && !isNaN(delayMinutes) ? delayMinutes : 0;

  if (normalized === 'CANCELLED') {
    return {
      category: 'CANCELLED',
      label: 'Cancelled',
      icon: 'close-circle',
      color: theme.colors.delayed,
      bg: 'rgba(239, 68, 68, 0.14)',
    };
  }

  if (normalized === 'DIVERTED') {
    return {
      category: 'DIVERTED',
      label: 'Diverted',
      icon: 'git-branch',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.14)',
    };
  }

  if (normalized === 'NOT_STARTED') {
    return {
      category: 'NOT_STARTED',
      label: 'Not Started',
      icon: 'time',
      color: theme.colors.textMuted,
      bg: 'rgba(148, 163, 184, 0.14)',
    };
  }

  if (normalized === 'ARRIVED' || normalized === 'COMPLETED') {
    return {
      category: 'COMPLETED',
      label: 'Completed',
      icon: 'checkmark-circle',
      color: theme.colors.accent,
      bg: 'rgba(56, 189, 248, 0.14)',
    };
  }

  if (normalized === 'ON_TIME') {
    return {
      category: 'ON_TIME',
      label: 'On Time',
      icon: 'radio-button-on',
      color: theme.colors.onTime,
      bg: 'rgba(16, 185, 129, 0.14)',
    };
  }

  if (normalized === 'DELAYED') {
    return {
      category: 'DELAYED',
      label: delay > 0 ? `Delayed (${delay} min)` : 'Delayed',
      icon: 'alert-circle',
      color: theme.colors.delayed,
      bg: 'rgba(239, 68, 68, 0.14)',
    };
  }

  if (normalized === 'RUNNING') {
    if (delay > 0) {
      return {
        category: 'RUNNING',
        label: `Running • ${delay}m late`,
        icon: 'alert-circle',
        color: theme.colors.delayed,
        bg: 'rgba(239, 68, 68, 0.14)',
      };
    }
    return {
      category: 'RUNNING',
      label: 'Running • On Time',
      icon: 'radio-button-on',
      color: theme.colors.onTime,
      bg: 'rgba(16, 185, 129, 0.14)',
    };
  }

  return {
    category: 'UNKNOWN',
    label: status && status.trim() ? status : 'Unknown Status',
    icon: 'help-circle',
    color: theme.colors.textMuted,
    bg: 'rgba(148, 163, 184, 0.14)',
  };
}

export const MapStatusPanel: React.FC<MapStatusPanelProps> = ({
  train,
  isLoading = false,
  isStale = false,
  backgroundError = null,
  lastSuccessfulUpdate = null,
  onRefresh,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();

  if (isLoading && !train) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Fetching live telemetry & route...</Text>
        </View>
      </View>
    );
  }

  if (!train) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyBox}>
          <Ionicons name="map-outline" size={24} color={theme.colors.textMuted} />
          <Text style={styles.emptyTitle}>No Train Selected</Text>
          <Text style={styles.emptySubtitle}>Search above to track any Indian Railway service.</Text>
        </View>
      </View>
    );
  }

  // Safe extraction supporting either LiveTrainData or MockTrain
  const isLive = 'currentLocation' in train;
  const trainNumber = train.trainNumber;
  const trainName = train.trainName;
  const srcCode = isLive ? (train as LiveTrainData).sourceCode : (train as MockTrain).sourceCode;
  const destCode = isLive
    ? (train as LiveTrainData).destinationCode
    : (train as MockTrain).destinationCode;

  const srcName = isLive ? (train as LiveTrainData).sourceStation : (train as MockTrain).sourceStation;
  const destName = isLive
    ? (train as LiveTrainData).destinationStation
    : (train as MockTrain).destinationStation;

  const delayMinutes = isLive
    ? (train as LiveTrainData).delayMinutes
    : (train as MockTrain).delay;

  const currentLocName = train.currentLocation?.name || 'Not available';

  const positionType = train.currentLocation?.positionType || 'ESTIMATED_SCHEDULE';
  const isGps = positionType === 'ACTUAL_GPS';
  const isStationDeparture = positionType === 'STATION_DEPARTURE';

  const speed =
    isLive
      ? (train as LiveTrainData).currentLocation?.speedKmH
      : (train as MockTrain).speed;
  const speedText =
    typeof speed === 'number' && !isNaN(speed) && speed > 0 ? `${speed} km/h` : 'Not available';

  const delayText =
    typeof delayMinutes === 'number' && !isNaN(delayMinutes)
      ? delayMinutes <= 0
        ? 'On Time'
        : `${delayMinutes} min`
      : 'Not available';

  const nextStationName = train.nextStation?.name || train.nextStation?.code || 'Terminated';
  const nextPlatform = train.nextStation?.platform;

  // Format last updated timestamp
  let lastUpdatedDate: Date | null = null;
  if (train.lastUpdatedTime && typeof train.lastUpdatedTime === 'string' && train.lastUpdatedTime.trim()) {
    const parsed = new Date(train.lastUpdatedTime);
    if (!isNaN(parsed.getTime())) {
      lastUpdatedDate = parsed;
    }
  }
  if (!lastUpdatedDate && lastSuccessfulUpdate && !isNaN(lastSuccessfulUpdate.getTime())) {
    lastUpdatedDate = lastSuccessfulUpdate;
  }

  const lastUpdated = lastUpdatedDate
    ? lastUpdatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not available';

  const statusPres = getStatusPresentation(theme, train.status, delayMinutes);

  const hasRefreshIssue = isStale || Boolean(backgroundError);

  return (
    <View style={styles.container}>
      {/* Stale / Refresh Error Banner */}
      {hasRefreshIssue && (
        <View style={styles.staleBanner}>
          <Ionicons name="alert-circle" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.staleBannerTitle}>Unable to refresh</Text>
            <Text style={styles.staleBannerSubtext}>
              Showing last successful update{lastUpdated !== 'Not available' ? ` (${lastUpdated})` : ''}
            </Text>
          </View>
          {onRefresh && (
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.refreshIconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Retry refreshing live train data"
            >
              <Ionicons name="refresh" size={15} color="#F59E0B" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Train Header: Number, Name, Route */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.trainNumberRow}>
            <Text style={styles.trainNumberText}>{trainNumber}</Text>
            <Text style={styles.trainNameText} numberOfLines={1}>
              {trainName}
            </Text>
          </View>
          <Text style={styles.routePillText}>
            {srcName || srcCode || 'Origin'} → {destName || destCode || 'Destination'}
          </Text>
        </View>

        {/* Running Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusPres.bg }]}>
          <Ionicons name={statusPres.icon} size={14} color={statusPres.color} style={{ marginRight: 5 }} />
          <Text style={[styles.statusBadgeText, { color: statusPres.color }]}>
            {statusPres.label.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Truthful Telemetry Accuracy Indicator */}
      <View style={styles.truthfulRow}>
        <View
          style={[
            styles.accuracyPill,
            isGps
              ? styles.accuracyPillGps
              : isStationDeparture
              ? styles.accuracyPillStation
              : styles.accuracyPillEst,
          ]}
        >
          <Ionicons
            name={isGps ? 'radio' : isStationDeparture ? 'trail-sign' : 'time-outline'}
            size={11}
            color={
              isGps ? theme.colors.onTime : isStationDeparture ? '#F59E0B' : theme.colors.textMuted
            }
            style={{ marginRight: 3 }}
          />
          <Text
            style={[
              styles.accuracyPillText,
              isGps
                ? styles.accuracyPillTextGps
                : isStationDeparture
                ? styles.accuracyPillTextStation
                : styles.accuracyPillTextEst,
            ]}
          >
            {isGps ? 'ACTUAL GPS' : isStationDeparture ? 'STATION DEPARTURE' : 'ESTIMATED POSITION'}
          </Text>
        </View>
        <Text style={styles.updatedText}>Last updated: {lastUpdated}</Text>
      </View>

      {/* Detailed Status Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>CURRENT LOCATION</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {currentLocName}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <Text style={styles.statLabel}>NEXT STATION</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {nextStationName}
            {nextPlatform ? ` (PF ${nextPlatform})` : ''}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statColSmall}>
          <Text style={styles.statLabel}>SPEED</Text>
          <Text style={styles.statValue}>{speedText}</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statColSmall}>
          <Text style={styles.statLabel}>DELAY</Text>
          <Text
            style={[
              styles.statValue,
              delayMinutes && delayMinutes > 0 ? styles.delayLate : styles.delayOnTime,
            ]}
          >
            {delayText}
          </Text>
        </View>
      </View>

      {/* Complete Journey Timeline Navigation */}
      <TouchableOpacity
        style={styles.detailsBtn}
        onPress={() =>
          router.push({
            pathname: '/train/[trainNumber]',
            params: { trainNumber },
          } as any)
        }
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`View complete train details for ${trainNumber}`}
      >
        <Text style={styles.detailsBtnText}>View Complete Journey Timeline</Text>
        <Ionicons name="arrow-forward" size={14} color="#0B0F19" />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
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
  loadingBox: {
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  emptyBox: {
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  staleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  staleBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  staleBannerSubtext: {
    fontSize: 11,
    color: '#FCD34D',
    marginTop: 1,
  },
  refreshIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  trainNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trainNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  trainNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  routePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  truthfulRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  accuracyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  accuracyPillGps: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  accuracyPillStation: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  accuracyPillEst: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  accuracyPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  accuracyPillTextGps: {
    color: theme.colors.onTime,
  },
  accuracyPillTextStation: {
    color: '#F59E0B',
  },
  accuracyPillTextEst: {
    color: theme.colors.textMuted,
  },
  updatedText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  statCol: {
    flex: 2,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statColSmall: {
    flex: 1.2,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.borderSubtle,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  delayOnTime: {
    color: theme.colors.onTime,
  },
  delayLate: {
    color: theme.colors.delayed,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 9,
    gap: 6,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B0F19',
  },
});

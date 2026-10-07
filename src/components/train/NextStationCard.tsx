import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NextStation, TrainStatus } from '../../types/api';
import { useTheme } from '../../theme/ThemeProvider';

interface NextStationCardProps {
  nextStation: NextStation | null;
  status?: TrainStatus;
  sourceStation?: string;
  destinationStation?: string;
}

export const NextStationCard: React.FC<NextStationCardProps> = ({
  nextStation,
  status,
  sourceStation,
  destinationStation,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  if (!nextStation) {
    let iconName: any = 'information-circle-outline';
    let iconColor = theme.colors.neutral;
    let message = 'Next station information temporarily unavailable.';

    if (status === 'CANCELLED') {
      iconName = 'close-circle';
      iconColor = theme.colors.delayed;
      message = 'Train service is cancelled. No upcoming stops.';
    } else if (status === 'NOT_STARTED') {
      iconName = 'time-outline';
      iconColor = theme.colors.warning;
      message = `Train is scheduled to depart from ${sourceStation || 'origin'}.`;
    } else if (status === 'DIVERTED') {
      iconName = 'alert-circle-outline';
      iconColor = theme.colors.warning;
      message = 'Train is on a diverted route. Next stop timings updating.';
    } else if (status === 'ARRIVED') {
      iconName = 'checkmark-circle';
      iconColor = theme.colors.onTime;
      message = `Train has arrived at ${destinationStation || 'destination station'}.`;
    }

    return (
      <View style={styles.card}>
        <View style={styles.completedContainer}>
          <Ionicons name={iconName} size={24} color={iconColor} />
          <Text style={styles.completedText}>{message}</Text>
        </View>
      </View>
    );
  }

  const hasDelayInfo =
    nextStation.delayMinutes !== null &&
    nextStation.delayMinutes !== undefined &&
    !isNaN(nextStation.delayMinutes);
  const isLate = hasDelayInfo && nextStation.delayMinutes > 5;
  const distance =
    nextStation.distanceRemainingKm !== undefined && nextStation.distanceRemainingKm !== null
      ? `${nextStation.distanceRemainingKm} km away`
      : null;
  const eta = nextStation.actualArrival || nextStation.scheduledArrival || '--:--';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="navigate-circle-outline" size={16} color={theme.colors.accent} />
          <Text style={styles.headerTitle}>NEXT STATION</Text>
        </View>
        <View style={styles.platformBadge}>
          <Text style={styles.platformText}>
            PF {nextStation.platform ? nextStation.platform : 'TBD'}
          </Text>
        </View>
      </View>

      <View style={styles.stationNameRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.stationName}>{nextStation.name}</Text>
          <Text style={styles.stationCode}>({nextStation.code})</Text>
        </View>
        {distance && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{distance}</Text>
          </View>
        )}
      </View>

      <View style={styles.timeGrid}>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>SCHEDULED</Text>
          <Text style={styles.timeValue}>{nextStation.scheduledArrival || '--:--'}</Text>
        </View>

        <Ionicons name="chevron-forward" size={16} color={theme.colors.border} />

        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>ESTIMATED ETA</Text>
          <Text style={[styles.timeValue, isLate && styles.delayedTime]}>{eta}</Text>
        </View>

        <View
          style={[
            styles.delayPill,
            !hasDelayInfo
              ? styles.delayPillNeutral
              : isLate
              ? styles.delayPillLate
              : styles.delayPillOnTime,
          ]}
        >
          <Text
            style={[
              styles.delayText,
              !hasDelayInfo
                ? styles.delayTextNeutral
                : isLate
                ? styles.delayTextLate
                : styles.delayTextOnTime,
            ]}
          >
            {!hasDelayInfo
              ? '--'
              : nextStation.delayMinutes > 0
              ? `+${nextStation.delayMinutes}m`
              : 'On Time'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  platformBadge: {
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  platformText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  stationNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flex: 1,
  },
  stationName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  stationCode: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  timeGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardSecondary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'space-between',
  },
  timeItem: {
    alignItems: 'flex-start',
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  delayedTime: {
    color: theme.colors.delayed,
  },
  delayPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  delayPillOnTime: {
    backgroundColor: theme.colors.onTimeBackground,
  },
  delayPillLate: {
    backgroundColor: theme.colors.delayedBackground,
  },
  delayPillNeutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  delayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  delayTextOnTime: {
    color: theme.colors.onTime,
  },
  delayTextLate: {
    color: theme.colors.delayed,
  },
  delayTextNeutral: {
    color: theme.colors.textMuted,
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: theme.spacing.xs,
  },
  completedText: {
    fontSize: 13,
    color: theme.colors.onTime,
    fontWeight: '600',
  },
});

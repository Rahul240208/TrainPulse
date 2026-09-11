import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { TrainBetweenItem } from '../../types/api';
import { formatPlatformDisplay } from '../train/PlatformCard';

export interface TrainResultCardProps {
  train: TrainBetweenItem;
  onTrack: () => void;
}

/**
 * Formats running days safely without fabricating data.
 * If 7 days are provided -> 'Daily'
 * If fewer days -> formatted comma list e.g. 'Mon, Tue, Wed'
 * If missing/empty -> 'Not available'
 */
export function formatRunningDays(days?: string[]): string {
  if (!days || !Array.isArray(days) || days.length === 0) {
    return 'Not available';
  }

  const cleanDays = days.map((d) => d.trim().toUpperCase());
  if (cleanDays.length === 7) {
    return 'Daily';
  }

  const dayMap: Record<string, string> = {
    MON: 'Mon',
    TUE: 'Tue',
    WED: 'Wed',
    THU: 'Thu',
    FRI: 'Fri',
    SAT: 'Sat',
    SUN: 'Sun',
    MONDAY: 'Mon',
    TUESDAY: 'Tue',
    WEDNESDAY: 'Wed',
    THURSDAY: 'Thu',
    FRIDAY: 'Fri',
    SATURDAY: 'Sat',
    SUNDAY: 'Sun',
  };

  const formatted = cleanDays
    .map((d) => dayMap[d] || d.slice(0, 3))
    .filter(Boolean);

  return formatted.length > 0 ? formatted.join(', ') : 'Not available';
}

/**
 * Formats duration safely.
 * Returns 'Not available' if missing or empty.
 */
export function formatDuration(duration?: string | null): string {
  if (!duration || typeof duration !== 'string' || duration.trim() === '') {
    return 'Not available';
  }
  return duration.trim();
}

/**
 * Formats delay minutes safely.
 * Returns 'On Time' if 0.
 * Returns 'Xm late' if > 0.
 * Returns 'Not available' if null/undefined.
 */
export function formatDelay(delayMinutes?: number | null): string {
  if (delayMinutes === null || delayMinutes === undefined || typeof delayMinutes !== 'number' || isNaN(delayMinutes)) {
    return 'Not available';
  }

  if (delayMinutes === 0) {
    return 'On Time';
  }

  if (delayMinutes > 0) {
    return `${delayMinutes}m late`;
  }

  return `${Math.abs(delayMinutes)}m early`;
}

/**
 * Formats current status safely.
 * Prioritizes explicit status string or calculates from delayMinutes.
 * Returns 'Not available' if status cannot be determined.
 */
export function formatStatus(status?: string | null, delayMinutes?: number | null): string {
  if (status && typeof status === 'string' && status.trim() !== '') {
    const s = status.trim().toUpperCase();
    if (s === 'ON_TIME' || s === 'ON TIME') return 'On Time';
    if (s === 'DELAYED') return 'Delayed';
    if (s === 'RUNNING') return 'Running';
    if (s === 'ARRIVED') return 'Arrived';
    if (s === 'CANCELLED') return 'Cancelled';
    if (s === 'DIVERTED') return 'Diverted';
    if (s === 'NOT_STARTED') return 'Not Started';
    return status.trim();
  }

  if (typeof delayMinutes === 'number' && !isNaN(delayMinutes)) {
    return delayMinutes > 0 ? 'Delayed' : 'On Time';
  }

  return 'Not available';
}

/**
 * Formats platform number safely using unified platform utility.
 * Returns 'Platform X' or 'Not available'.
 */
export const formatPlatform = formatPlatformDisplay;

/**
 * Formats departure or arrival time.
 * Returns 'Not available' if missing or blank.
 */
export function formatTime(time?: string | null): string {
  if (!time || typeof time !== 'string' || time.trim() === '') {
    return 'Not available';
  }
  return time.trim();
}

export const TrainResultCard: React.FC<TrainResultCardProps> = ({ train, onTrack }) => {
  const departureTime = formatTime(train.departure);
  const arrivalTime = formatTime(train.arrival);
  const durationText = formatDuration(train.duration);
  const runningDaysText = formatRunningDays(train.runningDays);
  const delayText = formatDelay(train.delayMinutes);
  const statusText = formatStatus(train.status, train.delayMinutes);
  const platformText = formatPlatform(train.platform);

  const isDelayed = typeof train.delayMinutes === 'number' && train.delayMinutes > 0;
  const isCancelled = train.status?.toUpperCase() === 'CANCELLED';
  const isOnTime = (typeof train.delayMinutes === 'number' && train.delayMinutes === 0) || train.status?.toUpperCase() === 'ON_TIME';

  const badgeTheme = isCancelled
    ? styles.statusCancelled
    : isDelayed
    ? styles.statusDelayed
    : isOnTime
    ? styles.statusOnTime
    : styles.statusNeutral;

  const badgeTextTheme = isCancelled
    ? styles.statusTextCancelled
    : isDelayed
    ? styles.statusTextDelayed
    : isOnTime
    ? styles.statusTextOnTime
    : styles.statusTextNeutral;

  const accessibleLabel = `${train.trainNumber} ${train.trainName}, route ${train.source.code} to ${train.destination.code}, departure ${departureTime}, arrival ${arrivalTime}, status ${statusText}, delay ${delayText}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onTrack}
      activeOpacity={0.88}
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={accessibleLabel}
      accessibilityHint="Opens live train status and map"
    >
      {/* Top Header: Train Title & Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.numberRow}>
            <Text style={styles.trainTitle}>
              <Text style={styles.trainNumberText}>{train.trainNumber}</Text> {train.trainName}
            </Text>
          </View>
          <View style={styles.routePill}>
            <Text style={styles.routePillText}>
              {train.source.code} → {train.destination.code}
            </Text>
            {train.trainType && (
              <>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.trainTypeText}>{train.trainType}</Text>
              </>
            )}
          </View>
        </View>

        <View style={[styles.statusBadge, badgeTheme]}>
          <Text style={[styles.statusBadgeText, badgeTextTheme]}>
            {statusText.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Schedule & Timing Visualizer */}
      <View style={styles.timingSection}>
        {/* Source / Departure */}
        <View style={styles.timingCol}>
          <Text style={styles.timingTime}>{departureTime}</Text>
          <Text style={styles.stationLabel} numberOfLines={1}>
            {train.source.name || train.source.code}
          </Text>
          <Text style={styles.stationCodeBadge}>{train.source.code}</Text>
        </View>

        {/* Route Line with Duration */}
        <View style={styles.visualTrackCol}>
          <View style={styles.durationChip}>
            <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={styles.durationChipText}>{durationText}</Text>
          </View>
          <View style={styles.trackLineContainer}>
            <View style={styles.trackDot} />
            <View style={styles.trackLine} />
            <Ionicons name="train-sharp" size={14} color={theme.colors.accent} style={styles.trackTrainIcon} />
            <View style={styles.trackLine} />
            <View style={[styles.trackDot, styles.trackDotEnd]} />
          </View>
        </View>

        {/* Destination / Arrival */}
        <View style={[styles.timingCol, styles.timingColRight]}>
          <Text style={styles.timingTime}>{arrivalTime}</Text>
          <Text style={[styles.stationLabel, styles.stationLabelRight]} numberOfLines={1}>
            {train.destination.name || train.destination.code}
          </Text>
          <Text style={styles.stationCodeBadge}>{train.destination.code}</Text>
        </View>
      </View>

      {/* Detailed Information Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>{durationText}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Running Days:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{runningDaysText}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text
              style={[
                styles.infoValue,
                isDelayed ? styles.valueDelayed : isOnTime ? styles.valueOnTime : null,
              ]}
            >
              {statusText}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Delay:</Text>
            <Text
              style={[
                styles.infoValue,
                isDelayed ? styles.valueDelayed : isOnTime ? styles.valueOnTime : null,
              ]}
            >
              {delayText}
            </Text>
          </View>
        </View>

        <View style={styles.infoRowSingle}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Platform:</Text>
            <Text style={styles.infoValue}>{platformText}</Text>
          </View>
        </View>
      </View>

      {/* View Live Status CTA Badge */}
      <View style={styles.ctaButton}>
        <Ionicons name="pulse" size={16} color="#0B0F19" style={{ marginRight: 6 }} />
        <Text style={styles.ctaButtonText}>View Live Status</Text>
        <Ionicons name="arrow-forward" size={14} color="#0B0F19" style={{ marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.28)',
        transition: 'transform 0.15s ease, border-color 0.15s ease',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  titleCol: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  trainTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  trainNumberText: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  routePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  bulletDot: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginHorizontal: 6,
  },
  trainTypeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusOnTime: {
    backgroundColor: theme.colors.onTimeBackground,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusDelayed: {
    backgroundColor: theme.colors.delayedBackground,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  statusNeutral: {
    backgroundColor: theme.colors.neutralBackground,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusTextOnTime: {
    color: theme.colors.onTime,
  },
  statusTextDelayed: {
    color: theme.colors.delayed,
  },
  statusTextCancelled: {
    color: theme.colors.delayed,
  },
  statusTextNeutral: {
    color: theme.colors.textMuted,
  },
  timingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  timingCol: {
    alignItems: 'flex-start',
    minWidth: 80,
    maxWidth: '32%',
  },
  timingColRight: {
    alignItems: 'flex-end',
  },
  timingTime: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  stationLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  stationLabelRight: {
    textAlign: 'right',
  },
  stationCodeBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accent,
    marginTop: 2,
  },
  visualTrackCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  durationChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  trackLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  trackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.onTime,
  },
  trackDotEnd: {
    backgroundColor: theme.colors.accent,
  },
  trackLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: 3,
  },
  trackTrainIcon: {
    marginHorizontal: 2,
  },
  infoGrid: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowSingle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  valueOnTime: {
    color: theme.colors.onTime,
    fontWeight: '700',
  },
  valueDelayed: {
    color: theme.colors.delayed,
    fontWeight: '700',
  },
  ctaButton: {
    backgroundColor: theme.colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  ctaButtonText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});


import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import type { PlatformInfo, PlatformStatus } from '../../types/api';

export interface PlatformCardProps {
  platformInfo?: PlatformInfo | null;
  // Optional station fallback context
  currentStationName?: string;
  nextStationName?: string;
}

/**
 * Calculates human-readable relative time string from ISO timestamp.
 */
export function formatRelativeTime(isoTimestamp?: string | null): string {
  if (!isoTimestamp) return 'Updated recently';

  try {
    const timeMs = new Date(isoTimestamp).getTime();
    if (isNaN(timeMs)) return 'Updated recently';

    const nowMs = Date.now();
    const diffSec = Math.max(0, Math.floor((nowMs - timeMs) / 1000));

    if (diffSec < 45) return 'Updated just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Updated ${diffMin} ${diffMin === 1 ? 'min' : 'mins'} ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Updated ${diffHours} ${diffHours === 1 ? 'hr' : 'hrs'} ago`;
    return 'Updated today';
  } catch {
    return 'Updated recently';
  }
}

/**
 * Formats platform number safely.
 * Returns 'Platform X' or 'Not available'.
 */
export function formatPlatformDisplay(platformNumber?: string | null): string {
  if (!platformNumber || typeof platformNumber !== 'string' || platformNumber.trim() === '') {
    return 'Not available';
  }

  const clean = platformNumber.trim();
  if (clean.toLowerCase().startsWith('platform')) {
    return clean;
  }
  if (clean.toLowerCase().startsWith('pf')) {
    const num = clean.replace(/^pf\.?\s*/i, '');
    return num ? `Platform ${num}` : clean;
  }
  return `Platform ${clean}`;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({
  platformInfo,
  currentStationName,
  nextStationName,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const status: PlatformStatus = platformInfo?.status || 'UNKNOWN';
  const hasPlatform = !!platformInfo?.platformNumber && status !== 'UNAVAILABLE' && status !== 'UNKNOWN';

  const platformDisplay = hasPlatform
    ? formatPlatformDisplay(platformInfo?.platformNumber)
    : 'Not available';

  const statusLabel =
    status === 'CONFIRMED'
      ? 'Confirmed'
      : status === 'EXPECTED'
      ? 'Expected'
      : status === 'UNAVAILABLE'
      ? 'Unavailable'
      : 'Unknown';

  const statusBadgeStyle =
    status === 'CONFIRMED'
      ? styles.statusConfirmed
      : status === 'EXPECTED'
      ? styles.statusExpected
      : styles.statusMuted;

  const statusTextStyle =
    status === 'CONFIRMED'
      ? styles.statusTextConfirmed
      : status === 'EXPECTED'
      ? styles.statusTextExpected
      : styles.statusTextMuted;

  const stationLabel =
    platformInfo?.station?.name
      ? `${platformInfo.station.name}${platformInfo.station.code ? ` (${platformInfo.station.code})` : ''}`
      : currentStationName || nextStationName || null;

  const relativeTime = formatRelativeTime(platformInfo?.updatedAt);

  const accessibleLabel = `Platform Information: ${platformDisplay}, Status: ${statusLabel}, ${
    stationLabel ? `Station: ${stationLabel}, ` : ''
  }${relativeTime}. Platform information may change.`;

  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={accessibleLabel}>
      {/* Header Row: Title & Status Badge */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Ionicons name="business" size={16} color={theme.colors.accent} />
          <Text style={styles.titleText}>PLATFORM INFORMATION</Text>
        </View>

        <View style={[styles.statusBadge, statusBadgeStyle]}>
          <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusLabel.toUpperCase()}</Text>
        </View>
      </View>

      {/* Main Platform Number Display */}
      <View style={styles.bodyRow}>
        <View style={styles.platformMain}>
          <Text style={styles.platformLabel}>Platform</Text>
          <Text style={[styles.platformValue, !hasPlatform && styles.platformValueMuted]}>
            {platformDisplay}
          </Text>
          {stationLabel && (
            <Text style={styles.stationSubtitle} numberOfLines={1}>
              {status === 'CONFIRMED' ? 'At ' : 'Approaching '}
              {stationLabel}
            </Text>
          )}
        </View>

        <View style={styles.timeCol}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
          <Text style={styles.timeText}>{relativeTime}</Text>
        </View>
      </View>

      {/* User Warning Notice Banner */}
      <View style={styles.warningNotice}>
        <Ionicons name="alert-circle-outline" size={14} color={theme.colors.warning} style={{ marginRight: 6 }} />
        <Text style={styles.warningNoticeText}>
          Platform information may change. Please verify with station displays.
        </Text>
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
    marginBottom: theme.spacing.sm,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  statusConfirmed: {
    backgroundColor: theme.colors.onTimeBackground,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusExpected: {
    backgroundColor: theme.colors.warningBackground,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  statusMuted: {
    backgroundColor: theme.colors.neutralBackground,
    borderColor: 'rgba(100, 116, 139, 0.3)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextConfirmed: {
    color: theme.colors.onTime,
  },
  statusTextExpected: {
    color: theme.colors.warning,
  },
  statusTextMuted: {
    color: theme.colors.textMuted,
  },
  bodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.cardSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  platformMain: {
    flex: 1,
  },
  platformLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformValue: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  platformValueMuted: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  stationSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 3,
    fontWeight: '500',
  },
  timeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  timeText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  warningNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  warningNoticeText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});

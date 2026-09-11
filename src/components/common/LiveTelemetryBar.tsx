import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface LiveTelemetryBarProps {
  isRefreshing: boolean;
  isPolling: boolean;
  refreshIntervalSeconds: number;
  lastSuccessfulUpdate: Date | null;
  backgroundError: string | null;
  isStale?: boolean;
  onRetry: () => void;
  onDismissError?: () => void;
}

export const LiveTelemetryBar: React.FC<LiveTelemetryBarProps> = ({
  isRefreshing,
  isPolling,
  refreshIntervalSeconds,
  lastSuccessfulUpdate,
  backgroundError,
  isStale = false,
  onRetry,
  onDismissError,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isDataOutdated = isStale || Boolean(backgroundError);

  useEffect(() => {
    if (isPolling && !isRefreshing && !isDataOutdated) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPolling, isRefreshing, isDataOutdated, pulseAnim]);

  const formatLastTime = (d: Date | null) => {
    if (!d) return '--:--:--';
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <View style={styles.wrapper}>
      {/* 1. Transient Background Error Banner: Milestone 18 Exact Match */}
      {backgroundError && (
        <View style={styles.errorBanner}>
          <View style={styles.errorLeft}>
            <Ionicons name="warning" size={16} color={theme.colors.delayed} />
            <Text style={styles.errorText} numberOfLines={2}>
              Unable to refresh. Showing last successful update.
            </Text>
          </View>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryChip} onPress={onRetry} activeOpacity={0.7}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            {onDismissError && (
              <TouchableOpacity onPress={onDismissError} style={styles.dismissBtn}>
                <Ionicons name="close" size={14} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 2. Main Telemetry Status Row */}
      <View style={styles.container}>
        <View style={styles.statusCol}>
          {isRefreshing ? (
            <View style={styles.updatingRow}>
              <ActivityIndicator size="small" color={theme.colors.accent} style={styles.spinner} />
              <Text style={styles.updatingText}>UPDATING TELEMETRY...</Text>
            </View>
          ) : isDataOutdated ? (
            <View style={styles.staleRow}>
              <View style={styles.staleDot} />
              <Text style={styles.staleText}>DATA MAY BE OUTDATED</Text>
            </View>
          ) : isPolling ? (
            <View style={styles.liveRow}>
              <Animated.View
                style={[
                  styles.pulseDot,
                  {
                    opacity: pulseAnim,
                  },
                ]}
              />
              <Text style={styles.liveText}>
                LIVE AUTO-REFRESH ({refreshIntervalSeconds}s)
              </Text>
            </View>
          ) : (
            <View style={styles.pausedRow}>
              <View style={styles.pausedDot} />
              <Text style={styles.pausedText}>POLLING PAUSED</Text>
            </View>
          )}
        </View>

        {/* Last Successful Update Time */}
        <View style={styles.timeCol}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
          <Text style={styles.timeText}>
            Updated {formatLastTime(lastSuccessfulUpdate)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: theme.spacing.sm,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  staleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.warning,
  },
  staleText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.warning,
    letterSpacing: 0.6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.onTime,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.onTime,
    letterSpacing: 0.6,
  },
  updatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  updatingText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.6,
  },
  pausedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pausedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.warning,
  },
  pausedText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.warning,
    letterSpacing: 0.5,
  },
  timeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  errorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  errorText: {
    fontSize: 11,
    color: theme.colors.delayed,
    fontWeight: '600',
    flex: 1,
  },
  errorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryChip: {
    backgroundColor: theme.colors.delayed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  retryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissBtn: {
    padding: 2,
  },
});


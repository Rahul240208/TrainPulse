import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { PositionAccuracy } from '../../types/api';
import { theme } from '../../theme';

export type TruthfulLocationType =
  | PositionAccuracy
  | 'ACTUAL'
  | 'ESTIMATED'
  | 'STALE'
  | 'UNAVAILABLE';

export interface PositionBadgeProps {
  positionType?: TruthfulLocationType | string;
  isStale?: boolean;
  isUnavailable?: boolean;
  showExplanation?: boolean;
}

export const PositionBadge: React.FC<PositionBadgeProps> = ({
  positionType = 'ESTIMATED_SCHEDULE',
  isStale = false,
  isUnavailable = false,
  showExplanation = false,
}) => {
  const getConfig = () => {
    // 1. Unavailable Location State
    if (isUnavailable || positionType === 'UNAVAILABLE') {
      return {
        label: 'Location Unavailable',
        description: 'Current train location telemetry is temporarily unavailable.',
        color: theme.colors.textMuted,
        bg: 'rgba(148, 163, 184, 0.12)',
      };
    }

    // 2. Stale Location State
    if (isStale || positionType === 'STALE') {
      return {
        label: 'Stale Position',
        description: 'Location telemetry has not refreshed recently and may be outdated.',
        color: theme.colors.warning,
        bg: 'rgba(245, 158, 11, 0.16)',
      };
    }

    // 3. Dynamic Telemetry Accuracies
    switch (positionType) {
      case 'ACTUAL_GPS':
      case 'ACTUAL':
        return {
          label: 'Actual GPS Telemetry',
          description: 'Verified direct GPS fix from locomotive device.',
          color: theme.colors.gpsLive,
          bg: theme.colors.gpsLiveBg,
        };
      case 'STATION_DEPARTURE':
        return {
          label: 'Station Departure (Estimated)',
          description: 'Position estimated from confirmed station departure.',
          color: theme.colors.stationFixed,
          bg: theme.colors.stationFixedBg,
        };
      case 'ESTIMATED_SCHEDULE':
      case 'ESTIMATED':
      default:
        return {
          label: 'Estimated Position',
          description: 'Interpolated between stations via speed and timetable.',
          color: theme.colors.estimated,
          bg: theme.colors.estimatedBg,
        };
    }
  };

  const config = getConfig();

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Position accuracy: ${config.label}. ${config.description}`}
    >
      <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.color }]}>
        <View style={[styles.dot, { backgroundColor: config.color }]} />
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      </View>
      {showExplanation && (
        <Text style={styles.explanation}>{config.description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  explanation: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
});


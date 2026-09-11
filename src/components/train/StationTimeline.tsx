import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StationPoint } from '../../types/api';
import { theme } from '../../theme';

interface StationTimelineProps {
  stations: StationPoint[];
}

export const StationTimeline: React.FC<StationTimelineProps> = ({ stations }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!stations || stations.length === 0) return null;

  // Find index of the currently active station (first one that hasn't departed yet)
  const currentIdx = stations.findIndex((s) => !s.hasDeparted);
  const activeIdx = currentIdx >= 0 ? currentIdx : stations.length - 1;

  const displayedStations = isExpanded
    ? stations
    : stations.slice(
        Math.max(0, activeIdx - 1),
        Math.min(stations.length, activeIdx + 4)
      );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="git-commit-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.headerTitle}>Route & Station Timeline</Text>
        </View>
        <Text style={styles.stationCount}>
          {stations.filter((s) => s.hasDeparted).length} of {stations.length} passed
        </Text>
      </View>

      <View style={styles.list}>
        {displayedStations.map((station, index) => {
          const isPassed = station.hasDeparted;
          const originalIdx = stations.findIndex((s) => s.code === station.code);
          const isCurrent = originalIdx === activeIdx && !isPassed;
          const isLast = index === displayedStations.length - 1;

          return (
            <View key={`${station.code}-${index}`} style={styles.stationRow}>
              {/* Timeline indicator column */}
              <View style={styles.indicatorCol}>
                <View
                  style={[
                    styles.node,
                    isPassed && styles.nodePassed,
                    isCurrent && styles.nodeCurrent,
                    !isPassed && !isCurrent && styles.nodeUpcoming,
                  ]}
                >
                  {isPassed ? (
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  ) : isCurrent ? (
                    <View style={styles.currentDot} />
                  ) : null}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.verticalLine,
                      isPassed ? styles.linePassed : styles.lineUpcoming,
                    ]}
                  />
                )}
              </View>

              {/* Station Info Box */}
              <View
                style={[
                  styles.stationContent,
                  isCurrent && styles.stationContentCurrent,
                ]}
              >
                <View style={styles.infoCol}>
                  <View style={styles.nameRow}>
                    <Text
                      style={[
                        styles.stationName,
                        isPassed && styles.textPassed,
                        isCurrent && styles.textCurrent,
                      ]}
                      numberOfLines={1}
                    >
                      {station.name}
                    </Text>
                    <Text style={styles.stationCode}>({station.code})</Text>
                    {station.platform && (
                      <View style={styles.pfBadge}>
                        <Text style={styles.pfText}>PF {station.platform}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>
                      Arr: {station.actualArrival || station.scheduledArrival || '--:--'}
                    </Text>
                    <Text style={styles.timeDivider}>•</Text>
                    <Text style={styles.timeText}>
                      Dep: {station.actualDeparture || station.scheduledDeparture || '--:--'}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusCol}>
                  {station.delayMinutes == null || isNaN(station.delayMinutes) ? (
                    <Text style={styles.naText}>--</Text>
                  ) : station.delayMinutes > 0 ? (
                    <Text style={styles.lateText}>+{station.delayMinutes}m</Text>
                  ) : (
                    <Text style={styles.onTimeText}>On Time</Text>
                  )}
                  {isCurrent && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {stations.length > 5 && (
        <TouchableOpacity
          style={styles.expandToggle}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.colors.accent}
          />
          <Text style={styles.expandText}>
            {isExpanded ? 'Collapse Timeline' : `View All ${stations.length} Stops`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    marginBottom: theme.spacing.sm,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  stationCount: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  list: {
    paddingVertical: 2,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 52,
  },
  indicatorCol: {
    width: 24,
    alignItems: 'center',
  },
  node: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodePassed: {
    backgroundColor: theme.colors.neutral,
  },
  nodeCurrent: {
    backgroundColor: theme.colors.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nodeUpcoming: {
    backgroundColor: theme.colors.border,
  },
  currentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  linePassed: {
    backgroundColor: theme.colors.neutral,
  },
  lineUpcoming: {
    backgroundColor: theme.colors.borderSubtle,
  },
  stationContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  stationContentCurrent: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  stationName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  textPassed: {
    color: theme.colors.textMuted,
  },
  textCurrent: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  stationCode: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  pfBadge: {
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pfText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  timeDivider: {
    color: theme.colors.border,
    fontSize: 10,
  },
  statusCol: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  lateText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.delayed,
  },
  onTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.onTime,
  },
  naText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  currentPill: {
    backgroundColor: theme.colors.accentGlow,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    marginTop: 2,
  },
  currentPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  expandText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '600',
  },
});

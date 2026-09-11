import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { PositionBadge } from '../common/PositionBadge';
import type { NormalizedMapData } from './types';

interface MapTruthfulBannerProps {
  data: NormalizedMapData;
}

export const MapTruthfulBanner: React.FC<MapTruthfulBannerProps> = ({ data }) => {
  const isDelayed = data.delayMinutes > 0;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <PositionBadge positionType={data.positionType} />

        <View style={styles.statsPill}>
          <Ionicons name="speedometer-outline" size={12} color={theme.colors.accent} />
          <Text style={styles.speedText}>{data.speedKmH} km/h</Text>
          <View style={styles.divider} />
          <Text style={[styles.delayText, isDelayed ? styles.delayed : styles.onTime]}>
            {data.delayMinutes <= 0 ? 'On Time' : `+${data.delayMinutes}m`}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.sectorRow}>
          <Ionicons name="git-commit-outline" size={12} color={theme.colors.accent} />
          <Text style={styles.sectorText} numberOfLines={1}>
            {data.currentStationName}
            {data.nextStation ? ` → Next: ${data.nextStation.name}` : ''}
          </Text>
        </View>

        <Text style={styles.updatedText}>
          {data.lastUpdatedTime}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  speedText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: theme.colors.border,
  },
  delayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  onTime: {
    color: theme.colors.onTime,
  },
  delayed: {
    color: theme.colors.delayed,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  sectorText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  updatedText: {
    fontSize: 9,
    color: theme.colors.textMuted,
  },
});


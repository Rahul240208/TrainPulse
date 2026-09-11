import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MockTrain } from '../../data/mockTrains';
import type { LiveTrainData } from '../../types/api';
import { theme } from '../../theme';
import { PositionBadge } from '../common/PositionBadge';

interface MapPlaceholderProps {
  train?: LiveTrainData | MockTrain;
  height?: number;
  showDetailsOverlay?: boolean;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  train,
  height = 320,
  showDetailsOverlay = true,
}) => {
  const speedDisplay = train
    ? 'speed' in train
      ? `${(train as MockTrain).speed} km/h`
      : `${(train as LiveTrainData).currentLocation.speedKmH} km/h`
    : 'TRACKING';

  const sectorDisplay = train
    ? 'lastReportedStation' in (train.currentLocation as any)
      ? `${(train.currentLocation as any).lastReportedStation} SECTOR`
      : `${train.sourceCode}-${train.destinationCode} SECTOR`
    : 'LIVE SECTOR';

  return (
    <View style={[styles.container, { height }]}>
      {/* Grid Background Patterns */}
      <View style={styles.gridOverlay}>
        <View style={styles.gridHorizontalLine1} />
        <View style={styles.gridHorizontalLine2} />
        <View style={styles.gridHorizontalLine3} />
        <View style={styles.gridVerticalLine1} />
        <View style={styles.gridVerticalLine2} />
        
        {/* Radar concentric rings */}
        <View style={styles.radarRingOuter} />
        <View style={styles.radarRingInner} />

        {/* Schematic Railway Track Line */}
        <View style={styles.trackLineContainer}>
          <View style={styles.stationOriginNode}>
            <View style={styles.stationDot} />
            <Text style={styles.stationNodeText}>{train ? train.sourceCode : 'ORIGIN'}</Text>
          </View>
          
          <View style={styles.dashedTrack} />
          
          {/* Active Train Beacon on track */}
          <View style={styles.trainBeaconWrapper}>
            <View style={styles.pulseRing} />
            <View style={styles.trainIconCircle}>
              <Ionicons name="train" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.trainCallout}>
              <Text style={styles.trainCalloutNumber}>{train ? train.trainNumber : 'TRAIN'}</Text>
              <Text style={styles.trainCalloutSpeed}>{speedDisplay}</Text>
            </View>
          </View>
          
          <View style={styles.dashedTrackRemaining} />
          
          <View style={styles.stationDestNode}>
            <View style={[styles.stationDot, styles.stationDotDest]} />
            <Text style={styles.stationNodeText}>{train ? train.destinationCode : 'DEST'}</Text>
          </View>
        </View>
      </View>

      {/* Top Telemetry Header */}
      {showDetailsOverlay && train && (
        <View style={styles.topOverlay}>
          <PositionBadge positionType={train.currentLocation.positionType} />
          <View style={styles.coordinatesPill}>
            <Ionicons name="compass-outline" size={12} color={theme.colors.accent} />
            <Text style={styles.coordinatesText}>
              {sectorDisplay}
            </Text>
          </View>
        </View>
      )}

      {/* Milestone 5 Notice Badge */}
      <View style={styles.watermarkBadge}>
        <Ionicons name="map-outline" size={14} color={theme.colors.accent} />
        <Text style={styles.watermarkText}>
          Live OpenStreetMap & Leaflet Integration (Milestone 5)
        </Text>
      </View>

      {/* Mock Map Control Buttons */}
      <View style={styles.controlsCol}>
        <TouchableOpacity style={styles.controlBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} activeOpacity={0.7}>
          <Ionicons name="remove" size={18} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} activeOpacity={0.7}>
          <Ionicons name="locate" size={16} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070B14',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridHorizontalLine1: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  gridHorizontalLine2: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  gridHorizontalLine3: {
    position: 'absolute',
    top: '75%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  gridVerticalLine1: {
    position: 'absolute',
    left: '30%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  gridVerticalLine2: {
    position: 'absolute',
    left: '70%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  radarRingOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.08)',
  },
  radarRingInner: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.12)',
  },
  trackLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  stationOriginNode: {
    alignItems: 'center',
    gap: 4,
  },
  stationDestNode: {
    alignItems: 'center',
    gap: 4,
  },
  stationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.onTime,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stationDotDest: {
    backgroundColor: theme.colors.accent,
  },
  stationNodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  dashedTrack: {
    flex: 1,
    height: 3,
    backgroundColor: theme.colors.onTime,
    marginHorizontal: 8,
    borderRadius: 2,
    opacity: 0.7,
  },
  dashedTrackRemaining: {
    flex: 1,
    height: 3,
    backgroundColor: theme.colors.cardSecondary,
    marginHorizontal: 8,
    borderRadius: 2,
    borderStyle: 'dashed',
  },
  trainBeaconWrapper: {
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 4,
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    top: -6,
  },
  trainIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  trainCallout: {
    position: 'absolute',
    top: 36,
    backgroundColor: theme.colors.cardBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    minWidth: 70,
  },
  trainCalloutNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.accent,
  },
  trainCalloutSpeed: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  topOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  coordinatesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(19, 27, 46, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coordinatesText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  watermarkBadge: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(19, 27, 46, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 10,
  },
  watermarkText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  controlsCol: {
    position: 'absolute',
    right: 12,
    top: 50,
    gap: 6,
    zIndex: 10,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(19, 27, 46, 0.9)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


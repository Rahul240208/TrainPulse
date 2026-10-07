import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { MockTrain } from '../../data/mockTrains';
import { useTheme } from '../../theme/ThemeProvider';
import { StatusPill } from '../common/StatusPill';

interface TrainSummaryCardProps {
  train: MockTrain;
}

export const TrainSummaryCard: React.FC<TrainSummaryCardProps> = ({ train }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: '/train/[trainNumber]',
          params: { trainNumber: train.trainNumber },
        } as any)
      }
    >
      <View style={styles.topRow}>
        <View style={styles.numberContainer}>
          <Text style={styles.trainNumber}>{train.trainNumber}</Text>
          <Text style={styles.trainType}>{train.trainType}</Text>
        </View>
        <StatusPill status={train.status} delayMinutes={train.delay} size="small" />
      </View>

      <Text style={styles.trainName} numberOfLines={1}>
        {train.trainName}
      </Text>

      <View style={styles.routeRow}>
        <Text style={styles.stationText} numberOfLines={1}>
          {train.sourceStation} ({train.sourceCode})
        </Text>
        <Ionicons name="arrow-forward" size={14} color={theme.colors.accent} style={styles.arrow} />
        <Text style={styles.stationText} numberOfLines={1}>
          {train.destinationStation} ({train.destinationCode})
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {train.currentLocation.name}
          </Text>
        </View>

        <View style={styles.speedPill}>
          <Text style={styles.speedText}>{train.speed} km/h</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 0.5,
  },
  trainType: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  trainName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  stationText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    maxWidth: '45%',
  },
  arrow: {
    marginHorizontal: 6,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: theme.spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  locationText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  speedPill: {
    backgroundColor: theme.colors.cardSecondary,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  speedText: {
    fontSize: 11,
    color: theme.colors.accent,
    fontWeight: '700',
  },
});


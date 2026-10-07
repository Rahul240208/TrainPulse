import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

interface LoadingCardProps {
  trainNumber?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ trainNumber }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconRing,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Ionicons name="train" size={36} color={theme.colors.accent} />
      </Animated.View>

      <Text style={styles.title}>Tracking Train #{trainNumber || '...'}</Text>
      <Text style={styles.subtitle}>Connecting to TrainPulse live telemetry...</Text>

      <View style={styles.spinnerRow}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={styles.spinnerText}>Fetching real-time coordinates</Text>
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 380,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    margin: theme.spacing.md,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.cardSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  spinnerText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
});


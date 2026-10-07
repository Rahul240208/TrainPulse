import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { TrainStatus } from '../../types/api';

export type StatusType = TrainStatus | 'ON_TIME' | 'DELAYED';

interface StatusPillProps {
  status: StatusType | string;
  delayMinutes?: number | null;
  size?: 'small' | 'medium';
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  delayMinutes,
  size = 'medium',
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const getConfig = () => {
    switch (status) {
      case 'RUNNING':
        if (delayMinutes === undefined || delayMinutes === null || isNaN(delayMinutes)) {
          return {
            label: 'RUNNING',
            color: theme.colors.accent,
            bg: theme.colors.accentGlow,
          };
        }
        if (delayMinutes > 0) {
          return {
            label: `LATE +${delayMinutes}m`,
            color: theme.colors.delayed,
            bg: theme.colors.delayedBackground,
          };
        }
        return {
          label: 'ON TIME',
          color: theme.colors.onTime,
          bg: theme.colors.onTimeBackground,
        };
      case 'ON_TIME':
        return {
          label: 'ON TIME',
          color: theme.colors.onTime,
          bg: theme.colors.onTimeBackground,
        };
      case 'DELAYED':
        return {
          label: delayMinutes != null && delayMinutes > 0 ? `LATE +${delayMinutes}m` : 'DELAYED',
          color: theme.colors.delayed,
          bg: theme.colors.delayedBackground,
        };
      case 'NOT_STARTED':
        return {
          label: 'YET TO START',
          color: theme.colors.warning,
          bg: theme.colors.warningBackground,
        };
      case 'ARRIVED':
        return {
          label: 'ARRIVED',
          color: theme.colors.accent,
          bg: theme.colors.accentGlow,
        };
      case 'CANCELLED':
        return {
          label: 'CANCELLED',
          color: theme.colors.delayed,
          bg: theme.colors.delayedBackground,
        };
      case 'DIVERTED':
        return {
          label: 'DIVERTED',
          color: theme.colors.warning,
          bg: theme.colors.warningBackground,
        };
      default:
        return {
          label: status,
          color: theme.colors.neutral,
          bg: theme.colors.neutralBackground,
        };
    }
  };

  const config = getConfig();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.pill,
        isSmall ? styles.pillSmall : styles.pillMedium,
        { backgroundColor: config.bg, borderColor: config.color },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${config.label}`}
    >
      <View
        style={[
          styles.dot,
          isSmall ? styles.dotSmall : styles.dotMedium,
          { backgroundColor: config.color },
        ]}
      />
      <Text
        style={[
          styles.label,
          isSmall ? styles.labelSmall : styles.labelMedium,
          { color: config.color },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillMedium: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  pillSmall: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  dot: {
    borderRadius: theme.borderRadius.full,
  },
  dotMedium: {
    width: 6,
    height: 6,
    marginRight: 6,
  },
  dotSmall: {
    width: 5,
    height: 5,
    marginRight: 4,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelMedium: {
    fontSize: 11,
  },
  labelSmall: {
    fontSize: 10,
  },
});

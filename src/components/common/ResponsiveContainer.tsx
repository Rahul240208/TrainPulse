import React from 'react';
import { View, StyleSheet, Platform, type ViewProps } from 'react-native';
import { theme } from '../../theme';

interface ResponsiveContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: number;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 640,
  style,
  ...rest
}) => {
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth }, style]} {...rest}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});


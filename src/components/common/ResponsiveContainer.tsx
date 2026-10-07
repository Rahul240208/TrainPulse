import React from 'react';
import { View, StyleSheet, Platform, type ViewProps } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

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
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { maxWidth }, style]} {...rest}>
        {children}
      </View>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
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


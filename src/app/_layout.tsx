import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

import { ThemeProvider } from '../theme/ThemeProvider';

function AppContent() {
  const { theme, isDarkMode } = useTheme();
  return (
    <SafeAreaProvider>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="train/[trainNumber]"
          options={{
            title: 'Train Details',
            headerBackTitle: 'Back',
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

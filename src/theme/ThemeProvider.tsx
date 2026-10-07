import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { theme as baseTheme, lightColors } from './index';

type ThemeType = typeof baseTheme;

interface ThemeContextType {
  theme: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: baseTheme,
  isDarkMode: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark' || systemColorScheme === null);

  // Sync with system theme on mount or when system theme changes
  useEffect(() => {
    setIsDarkMode(systemColorScheme === 'dark' || systemColorScheme === null);
  }, [systemColorScheme]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const theme: ThemeType = {
    ...baseTheme,
    colors: isDarkMode ? baseTheme.colors : lightColors,
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};


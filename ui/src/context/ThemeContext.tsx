import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppStyleType, DEFAULT_STYLE, DARK_STYLE } from '../constants/styleTypes';
import { switchAppStyle } from '../helpers/switchAppStyle';

const THEME_STORAGE_KEY = 'focus-theme';

interface ThemeContextValue {
  theme: AppStyleType;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<AppStyleType>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === DARK_STYLE ? DARK_STYLE : DEFAULT_STYLE;
  });

  useEffect(() => {
    switchAppStyle(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === DEFAULT_STYLE ? DARK_STYLE : DEFAULT_STYLE));
  }, []);

  const isDark = theme === DARK_STYLE;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return ctx;
}

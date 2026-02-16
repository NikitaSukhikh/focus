import { useThemeContext } from '@/context/ThemeContext';

export function useThemeToggle() {
  const { isDark, toggleTheme } = useThemeContext();
  return { isDark, toggleTheme };
}

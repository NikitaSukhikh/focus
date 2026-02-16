import { AppStyleType, DEFAULT_STYLE, DARK_STYLE, CYBERPUNK_STYLE } from '@/constants/styleTypes';
import { defaultTheme } from '@/styles/themes/default';
import { darkTheme } from '@/styles/themes/dark';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { StyleTheme } from '@/styles/themes/types';

const styleMap: Record<AppStyleType, StyleTheme> = {
  [DEFAULT_STYLE]: defaultTheme,
  [DARK_STYLE]: darkTheme,
  [CYBERPUNK_STYLE]: cyberpunkTheme,
};

const cssVarMap: Record<keyof StyleTheme, string> = {
  primaryColor: '--primary-color',
  primaryDark: '--primary-dark',
  primaryLight: '--primary-light',
  backgroundDark: '--background-dark',
  backgroundLight: '--background-light',
  colorSurfacePage: '--color-surface-page',
  colorSurfacePanel: '--color-surface-panel',
  colorSurfaceMuted: '--color-surface-muted',
  colorSurfaceTile: '--color-surface-tile',
  textColor: '--text-color',
  colorTextPrimary: '--color-text-primary',
  colorTextSecondary: '--color-text-secondary',
  colorTextMuted: '--color-text-muted',
  colorBorderStrong: '--color-border-strong',
  colorBorderSubtle: '--color-border-subtle',
  accentColor: '--accent-color',
  colorAccent: '--color-accent',
  colorAccentStrong: '--color-accent-strong',
  secondaryColor: '--secondary-color',
  successColor: '--success-color',
  success: '--success',
  errorColor: '--error-color',
  error: '--error',
  warningColor: '--warning-color',
  warning: '--warning',
  infoColor: '--info-color',
  info: '--info',
  borderRadius: '--border-radius',
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',
  shadow: '--shadow',
  glow: '--glow',
  shadowSoft: '--shadow-soft',
  shadowStrong: '--shadow-strong',
  glowText: '--glow-text',
  glowBox: '--glow-box',
  transitionFast: '--transition-fast',
  transitionBase: '--transition-base',
  transitionSlow: '--transition-slow',
  glassBg: '--glass-bg',
  glassBorder: '--glass-border',
  glassBlur: '--glass-blur',
  iconOpacity: '--icon-opacity',
  tileRingOpacity: '--tile-ring-opacity',
  tileGlowOpacity: '--tile-glow-opacity',
};

export function switchAppStyle(styleType: AppStyleType): void {
  const theme = styleMap[styleType];

  if (!theme) {
    console.error(`Unknown style type: ${styleType}`);
    return;
  }

  const root = document.documentElement;

  Object.entries(theme).forEach(([key, value]) => {
    const cssVar = cssVarMap[key as keyof StyleTheme];
    if (cssVar) {
      root.style.setProperty(cssVar, value);
    }
  });

  console.log(`Switched to ${styleType} style`);
}

export function getCurrentStyle(): AppStyleType {
  const root = document.documentElement;
  const primaryColor = getComputedStyle(root).getPropertyValue('--primary-color').trim();

  if (primaryColor === cyberpunkTheme.primaryColor) {
    return CYBERPUNK_STYLE;
  }

  return DEFAULT_STYLE;
}

export function getTheme(styleType: AppStyleType): StyleTheme {
  return styleMap[styleType];
}

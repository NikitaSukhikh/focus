import { StyleTheme } from './types';

/**
 * Generates CSS tokens string from a theme object
 * This is used to keep tokens.css in sync with the selected theme
 */
export function generateTokensCSS(theme: StyleTheme): string {
  return `:root {
  /* Primary Colors */
  --primary-color: ${theme.primaryColor};
  --primary-dark: ${theme.primaryDark};
  --primary-light: ${theme.primaryLight};

  /* Backgrounds */
  --background-dark: ${theme.backgroundDark};
  --background-light: ${theme.backgroundLight};
  --color-surface-page: ${theme.colorSurfacePage};
  --color-surface-panel: ${theme.colorSurfacePanel};
  --color-surface-muted: ${theme.colorSurfaceMuted};

  /* Text */
  --text-color: ${theme.textColor};
  --color-text-primary: ${theme.colorTextPrimary};
  --color-text-secondary: ${theme.colorTextSecondary};
  --color-text-muted: ${theme.colorTextMuted};

  /* Borders */
  --color-border-strong: ${theme.colorBorderStrong};
  --color-border-subtle: ${theme.colorBorderSubtle};

  /* Accents */
  --accent-color: ${theme.accentColor};
  --color-accent: ${theme.colorAccent};
  --color-accent-strong: ${theme.colorAccentStrong};
  --secondary-color: ${theme.secondaryColor};

  /* Status Colors */
  --success-color: ${theme.successColor};
  --success: ${theme.success};
  --error-color: ${theme.errorColor};
  --error: ${theme.error};
  --warning-color: ${theme.warningColor};
  --warning: ${theme.warning};
  --info-color: ${theme.infoColor};
  --info: ${theme.info};

  /* Radii */
  --border-radius: ${theme.borderRadius};
  --radius-sm: ${theme.radiusSm};
  --radius-md: ${theme.radiusMd};
  --radius-lg: ${theme.radiusLg};

  /* Shadows & Glow */
  --shadow: ${theme.shadow};
  --glow: ${theme.glow};
  --shadow-soft: ${theme.shadowSoft};
  --shadow-strong: ${theme.shadowStrong};
  --glow-text: ${theme.glowText};
  --glow-box: ${theme.glowBox};

  /* Motion */
  --transition-fast: ${theme.transitionFast};
  --transition-base: ${theme.transitionBase};
  --transition-slow: ${theme.transitionSlow};

  /* Glass-morphism */
  --glass-bg: ${theme.glassBg};
  --glass-border: ${theme.glassBorder};
  --glass-blur: ${theme.glassBlur};
}
`;
}

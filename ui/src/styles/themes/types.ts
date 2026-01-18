export interface StyleTheme {
  /* Primary Colors */
  primaryColor: string;
  primaryDark: string;
  primaryLight: string;

  /* Backgrounds */
  backgroundDark: string;
  backgroundLight: string;
  colorSurfacePage: string;
  colorSurfacePanel: string;
  colorSurfaceMuted: string;

  /* Text */
  textColor: string;
  colorTextPrimary: string;
  colorTextSecondary: string;
  colorTextMuted: string;

  /* Borders */
  colorBorderStrong: string;
  colorBorderSubtle: string;

  /* Accents */
  accentColor: string;
  colorAccent: string;
  colorAccentStrong: string;
  secondaryColor: string;

  /* Status Colors */
  successColor: string;
  success: string;
  errorColor: string;
  error: string;
  warningColor: string;
  warning: string;
  infoColor: string;
  info: string;

  /* Radii */
  borderRadius: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;

  /* Shadows & Glow */
  shadow: string;
  glow: string;
  shadowSoft: string;
  shadowStrong: string;
  glowText: string;
  glowBox: string;

  /* Motion */
  transitionFast: string;
  transitionBase: string;
  transitionSlow: string;

  /* Glass-morphism */
  glassBg: string;
  glassBorder: string;
  glassBlur: string;

  /* Icons */
  iconOpacity: string;
}

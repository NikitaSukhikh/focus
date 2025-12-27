#!/usr/bin/env node

/**
 * Sync tokens.css with the current CURRENT_APP_STYLE
 *
 * This script reads the selected style from appStyle.ts and generates
 * tokens.css to match, ensuring no flash of unstyled content on load.
 *
 * Run: node ui/scripts/syncTokens.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const projectRoot = join(__dirname, '..', '..');
const appStylePath = join(projectRoot, 'ui', 'src', 'config', 'appStyle.ts');
const tokensPath = join(projectRoot, 'ui', 'src', 'styles', 'tokens.css');
const defaultThemePath = join(projectRoot, 'ui', 'src', 'styles', 'themes', 'default', 'index.ts');
const cyberpunkThemePath = join(projectRoot, 'ui', 'src', 'styles', 'themes', 'cyberpunk', 'index.ts');

// Simple theme data (extracted from theme files)
const themes = {
  DEFAULT_STYLE: {
    name: 'DEFAULT_STYLE (white/black)',
    primaryColor: '#2196f3',
    primaryDark: '#1976d2',
    primaryLight: '#64b5f6',
    backgroundDark: '#ffffff',
    backgroundLight: '#f5f5f5',
    colorSurfacePage: '#ffffff',
    colorSurfacePanel: 'rgba(255, 255, 255, 0.9)',
    colorSurfaceMuted: 'rgba(245, 245, 245, 0.8)',
    textColor: '#212121',
    colorTextPrimary: '#212121',
    colorTextSecondary: 'rgba(0, 0, 0, 0.7)',
    colorTextMuted: 'rgba(0, 0, 0, 0.5)',
    colorBorderStrong: 'rgba(0, 0, 0, 0.2)',
    colorBorderSubtle: 'rgba(0, 0, 0, 0.1)',
    accentColor: '#ff9800',
    colorAccent: '#2196f3',
    colorAccentStrong: '#1976d2',
    secondaryColor: '#757575',
    successColor: '#4caf50',
    success: '#4caf50',
    errorColor: '#f44336',
    error: '#f44336',
    warningColor: '#ff9800',
    warning: '#ff9800',
    infoColor: '#2196f3',
    info: '#2196f3',
    borderRadius: '8px',
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '12px',
    shadow: 'rgba(0, 0, 0, 0.2)',
    glow: 'rgba(33, 150, 243, 0.3)',
    shadowSoft: '0 2px 8px rgba(0, 0, 0, 0.1)',
    shadowStrong: '0 4px 16px rgba(0, 0, 0, 0.15)',
    glowText: '0 0 0px transparent',
    glowBox: '0 0 0px transparent',
    transitionFast: '120ms ease',
    transitionBase: '200ms ease',
    transitionSlow: '300ms ease',
    glassBg: 'rgba(255, 255, 255, 0.8)',
    glassBorder: 'rgba(0, 0, 0, 0.1)',
    glassBlur: 'blur(10px)',
  },
  CYBERPUNK_STYLE: {
    name: 'CYBERPUNK_STYLE (dark/green)',
    primaryColor: '#4caf50',
    primaryDark: '#3e8e41',
    primaryLight: '#81c784',
    backgroundDark: '#050510',
    backgroundLight: '#0a0a20',
    colorSurfacePage: '#050510',
    colorSurfacePanel: 'rgba(10, 10, 32, 0.7)',
    colorSurfaceMuted: 'rgba(10, 10, 32, 0.5)',
    textColor: '#f5f5f5',
    colorTextPrimary: '#f5f5f5',
    colorTextSecondary: 'rgba(245, 245, 245, 0.7)',
    colorTextMuted: 'rgba(245, 245, 245, 0.5)',
    colorBorderStrong: 'rgba(76, 175, 80, 0.3)',
    colorBorderSubtle: 'rgba(76, 175, 80, 0.15)',
    accentColor: '#ffc107',
    colorAccent: '#4caf50',
    colorAccentStrong: '#3e8e41',
    secondaryColor: '#757575',
    successColor: '#4caf50',
    success: '#4caf50',
    errorColor: '#f44336',
    error: '#f44336',
    warningColor: '#ff9800',
    warning: '#ff9800',
    infoColor: '#2196f3',
    info: '#2196f3',
    borderRadius: '12px',
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '16px',
    shadow: 'rgba(76, 175, 80, 0.3)',
    glow: 'rgba(76, 175, 80, 0.6)',
    shadowSoft: '0 8px 30px rgba(76, 175, 80, 0.3)',
    shadowStrong: '0 16px 60px rgba(76, 175, 80, 0.6)',
    glowText: '0 0 10px rgba(76, 175, 80, 0.6), 0 0 20px rgba(76, 175, 80, 0.6)',
    glowBox: '0 0 15px rgba(76, 175, 80, 0.3), 0 0 30px rgba(76, 175, 80, 0.3)',
    transitionFast: '120ms ease',
    transitionBase: '200ms ease',
    transitionSlow: '300ms ease',
    glassBg: 'rgba(10, 10, 32, 0.6)',
    glassBorder: 'rgba(76, 175, 80, 0.2)',
    glassBlur: 'blur(10px)',
  },
};

// Read current style from appStyle.ts
const appStyleContent = readFileSync(appStylePath, 'utf-8');
const currentStyleMatch = appStyleContent.match(/CURRENT_APP_STYLE:\s*AppStyleType\s*=\s*(\w+)/);

if (!currentStyleMatch) {
  console.error('❌ Could not find CURRENT_APP_STYLE in appStyle.ts');
  process.exit(1);
}

const currentStyleName = currentStyleMatch[1];
const theme = themes[currentStyleName];

if (!theme) {
  console.error(`❌ Unknown style: ${currentStyleName}`);
  console.error(`   Available: ${Object.keys(themes).join(', ')}`);
  process.exit(1);
}

// Generate tokens.css content
const tokensContent = `/*
 * CSS Design Tokens
 *
 * These tokens provide initial CSS variable values that are loaded before JavaScript runs.
 * They are automatically overridden by the theme switcher in main.tsx based on CURRENT_APP_STYLE.
 *
 * To update these values to match your default theme:
 * 1. Set CURRENT_APP_STYLE in ui/src/config/appStyle.ts
 * 2. Run: npm run sync-tokens (or manually update this file to match the theme)
 *
 * Current tokens: ${theme.name}
 */

:root {
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

// Write tokens.css
writeFileSync(tokensPath, tokensContent, 'utf-8');

console.log(`✅ tokens.css synced with ${theme.name}`);
console.log(`   File: ${tokensPath}`);

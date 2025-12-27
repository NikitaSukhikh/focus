# Ocean App Style System

## Overview

The Ocean app supports multiple visual themes through a centralized style switching system.

## Available Styles

- **DEFAULT_STYLE**: Clean white background with black text (standard UI)
- **CYBERPUNK_STYLE**: Dark background with green theme and glow effects

## Quick Start

### Manual Style Selection (Simple)

1. Edit [appStyle.ts](../../config/appStyle.ts) and change the constant:

```typescript
// Default style (white/black)
export const CURRENT_APP_STYLE: AppStyleType = DEFAULT_STYLE;

// or Cyberpunk style (dark/green)
export const CURRENT_APP_STYLE: AppStyleType = CYBERPUNK_STYLE;
```

2. (Optional but recommended) Sync the CSS tokens to prevent flash on load:

```bash
npm run sync-tokens
```

This updates [tokens.css](../tokens.css) to match your selected theme, ensuring seamless loading without style flashes.

### Runtime Style Switching (Advanced)

Use the `useAppStyle` hook in any component:

```typescript
import { useAppStyle } from '../hooks/useAppStyle';
import { DEFAULT_STYLE, CYBERPUNK_STYLE } from '../constants/styleTypes';

function MyComponent() {
  const { currentStyle, changeStyle } = useAppStyle();

  return (
    <button onClick={() => changeStyle(CYBERPUNK_STYLE)}>
      Switch to Cyberpunk
    </button>
  );
}
```

### Programmatic Style Switching

Use the helper function directly:

```typescript
import { switchAppStyle } from '../helpers/switchAppStyle';
import { CYBERPUNK_STYLE } from '../constants/styleTypes';

switchAppStyle(CYBERPUNK_STYLE);
```

## File Structure

```
ui/src/
├── config/
│   └── appStyle.ts              # Manual style selection
├── constants/
│   └── styleTypes.ts            # Style type constants
├── helpers/
│   └── switchAppStyle.ts        # Style switching orchestrator
├── hooks/
│   └── useAppStyle.ts           # React hook for runtime switching
└── styles/
    └── themes/
        ├── types.ts             # Shared StyleTheme interface
        ├── index.ts             # Main themes export
        ├── default/             # Default theme
        │   ├── colors.ts
        │   ├── effects.ts
        │   ├── fonts.ts
        │   └── index.ts
        ├── cyberpunk/           # Cyberpunk theme
        │   ├── colors.ts
        │   ├── effects.ts
        │   ├── fonts.ts
        │   └── index.ts
        └── README.md            # This file
```

## Creating a New Style

1. Create a new theme directory in `styles/themes/`:

```bash
mkdir ui/src/styles/themes/my-theme
```

2. Create the theme files:

**colors.ts**:
```typescript
export const myThemeColors = {
  primaryColor: '#your-color',
  // ... other color properties
};
```

**effects.ts**:
```typescript
export const myThemeEffects = {
  borderRadius: '8px',
  // ... other effect properties
};
```

**fonts.ts** (optional):
```typescript
export const myThemeFonts = {
  fontSans: "'Your Font', sans-serif",
  // ... other font properties
};
```

**index.ts**:
```typescript
import { StyleTheme } from '../types';
import { myThemeColors } from './colors';
import { myThemeEffects } from './effects';

export const myTheme: StyleTheme = {
  ...myThemeColors,
  ...myThemeEffects,
};

export * from './colors';
export * from './effects';
export * from './fonts';
```

3. Add a constant in [styleTypes.ts](../../constants/styleTypes.ts):

```typescript
export const MY_THEME = 'my-theme' as const;
export type AppStyleType = typeof DEFAULT_STYLE | typeof CYBERPUNK_STYLE | typeof MY_THEME;
```

4. Register in [switchAppStyle.ts](../../helpers/switchAppStyle.ts):

```typescript
import { myTheme } from '../styles/themes/my-theme';

const styleMap: Record<AppStyleType, StyleTheme> = {
  [DEFAULT_STYLE]: defaultTheme,
  [CYBERPUNK_STYLE]: cyberpunkTheme,
  [MY_THEME]: myTheme,
};
```

5. Export from [themes/index.ts](./index.ts):

```typescript
export { myTheme } from './my-theme';
```

## Style Properties

All themes must implement the `StyleTheme` interface defined in [types.ts](./types.ts):

## Theme Organization

Each theme is organized into separate files for maintainability:

- **colors.ts**: All color-related properties
- **effects.ts**: Shadows, glows, borders, transitions, glass effects
- **fonts.ts**: Font family definitions (optional, can vary per theme)
- **index.ts**: Combines all theme parts and exports

### Required Properties

### Colors
- Primary: `primaryColor`, `primaryDark`, `primaryLight`
- Backgrounds: `backgroundDark`, `backgroundLight`, `colorSurfacePage`, `colorSurfacePanel`, `colorSurfaceMuted`
- Text: `textColor`, `colorTextPrimary`, `colorTextSecondary`, `colorTextMuted`
- Borders: `colorBorderStrong`, `colorBorderSubtle`
- Accents: `accentColor`, `colorAccent`, `colorAccentStrong`, `secondaryColor`
- Status: `successColor`, `errorColor`, `warningColor`, `infoColor` (and their aliases)

### Layout
- Radii: `borderRadius`, `radiusSm`, `radiusMd`, `radiusLg`

### Effects
- Shadows: `shadow`, `shadowSoft`, `shadowStrong`
- Glow: `glow`, `glowText`, `glowBox`
- Glass: `glassBg`, `glassBorder`, `glassBlur`

### Motion
- Transitions: `transitionFast`, `transitionBase`, `transitionSlow`

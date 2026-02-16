import { StyleTheme } from '@/styles/themes/types';
import { cyberpunkColors } from '@/styles/themes/cyberpunk/colors';
import { cyberpunkEffects } from '@/styles/themes/cyberpunk/effects';

export const cyberpunkTheme: StyleTheme = {
  ...cyberpunkColors,
  ...cyberpunkEffects,
};

export * from '@/styles/themes/cyberpunk/colors';
export * from '@/styles/themes/cyberpunk/effects';

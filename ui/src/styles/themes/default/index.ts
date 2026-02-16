import { StyleTheme } from '@/styles/themes/types';
import { defaultColors } from '@/styles/themes/default/colors';
import { defaultEffects } from '@/styles/themes/default/effects';

export const defaultTheme: StyleTheme = {
  ...defaultColors,
  ...defaultEffects,
};

export * from '@/styles/themes/default/colors';
export * from '@/styles/themes/default/effects';
export * from '@/styles/themes/default/fonts';

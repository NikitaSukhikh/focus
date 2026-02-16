import { StyleTheme } from '@/styles/themes/types';
import { darkColors } from '@/styles/themes/dark/colors';
import { darkEffects } from '@/styles/themes/dark/effects';

export const darkTheme: StyleTheme = {
  ...darkColors,
  ...darkEffects,
};

export * from '@/styles/themes/dark/colors';
export * from '@/styles/themes/dark/effects';

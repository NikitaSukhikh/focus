import { StyleTheme } from '../types';
import { defaultColors } from './colors';
import { defaultEffects } from './effects';

export const defaultTheme: StyleTheme = {
  ...defaultColors,
  ...defaultEffects,
};

export * from './colors';
export * from './effects';
export * from './fonts';

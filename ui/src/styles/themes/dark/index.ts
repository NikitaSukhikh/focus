import { StyleTheme } from '../types';
import { darkColors } from './colors';
import { darkEffects } from './effects';

export const darkTheme: StyleTheme = {
  ...darkColors,
  ...darkEffects,
};

export * from './colors';
export * from './effects';

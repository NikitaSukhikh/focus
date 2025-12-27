import { StyleTheme } from '../types';
import { cyberpunkColors } from './colors';
import { cyberpunkEffects } from './effects';

export const cyberpunkTheme: StyleTheme = {
  ...cyberpunkColors,
  ...cyberpunkEffects,
};

export * from './colors';
export * from './effects';

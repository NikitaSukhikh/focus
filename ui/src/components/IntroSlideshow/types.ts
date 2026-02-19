import type en from '@/i18n/locales/en.json';

type TranslationKey = keyof typeof en;

export interface Slide {
  title: TranslationKey;
  description: TranslationKey;
  image?: string;
  subtext?: string;
  descriptionAlign?: 'left' | 'center';
}

import { useCallback } from 'react';
import { settingsApi } from '@/api/settings';
import type { LanguageCode } from '@/i18n/config';

export function useSettingsSync() {
  const loadLanguage = useCallback(async (): Promise<LanguageCode | null> => {
    try {
      const data = await settingsApi.get();
      return data.language as LanguageCode;
    } catch {
      return null;
    }
  }, []);

  const saveLanguage = useCallback(async (language: LanguageCode): Promise<void> => {
    try {
      await settingsApi.update({ language });
    } catch {
      // localStorage already holds the value; fail silently
    }
  }, []);

  return { loadLanguage, saveLanguage };
}

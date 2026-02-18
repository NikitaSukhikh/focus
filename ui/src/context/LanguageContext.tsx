import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import i18n, { LanguageCode, LANGUAGE_STORAGE_KEY, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n/config';
import { useSettingsSync } from '@/hooks/useSettingsSync';

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(
    () => (localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode) ?? DEFAULT_LANGUAGE
  );
  const { loadLanguage, saveLanguage } = useSettingsSync();

  useEffect(() => {
    const init = async () => {
      // On first install, the installer writes the chosen language to a file
      // which the main process reads and returns once, then deletes.
      const installerLang = await window.desktopAPI?.getInitialLanguage?.();
      if (installerLang && !localStorage.getItem(LANGUAGE_STORAGE_KEY)) {
        setLanguageState(installerLang as LanguageCode);
        localStorage.setItem(LANGUAGE_STORAGE_KEY, installerLang);
        void i18n.changeLanguage(installerLang);
        void saveLanguage(installerLang as LanguageCode);
        return;
      }
      // Otherwise sync from backend DB
      const code = await loadLanguage();
      if (!code || code === language) return;
      setLanguageState(code);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      void i18n.changeLanguage(code);
    };
    void init();
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    void i18n.changeLanguage(code);
    void saveLanguage(code);
  }, [saveLanguage]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguageContext must be used within LanguageProvider');
  }
  return ctx;
}

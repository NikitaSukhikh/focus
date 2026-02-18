import { useLanguageContext } from '@/context/LanguageContext';

export function useLanguage() {
  const { language, setLanguage, supportedLanguages } = useLanguageContext();
  return { language, setLanguage, supportedLanguages };
}

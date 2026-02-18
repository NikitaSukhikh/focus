import { useState, useEffect } from 'react';
import { settingsApi } from '@/api/settings';

interface UseIntroSeenReturn {
  introSeen: boolean | null; // null = still loading
  markIntroSeen: () => Promise<void>;
}

export function useIntroSeen(): UseIntroSeenReturn {
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);

  useEffect(() => {
    settingsApi.get()
      .then((s) => setIntroSeen(s.intro_seen))
      .catch(() => setIntroSeen(true)); // fail-safe: don't block app
  }, []);

  const markIntroSeen = async () => {
    setIntroSeen(true);
    await settingsApi.update({ intro_seen: true });
  };

  return { introSeen, markIntroSeen };
}

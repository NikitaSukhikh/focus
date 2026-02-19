import { useState, useEffect, useRef } from 'react';
import { settingsApi } from '@/api/settings';

const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 8000;
const RETRY_MAX_ATTEMPTS = 6;

interface UseIntroSeenReturn {
  introSeen: boolean | null; // null = still loading
  markIntroSeen: () => Promise<void>;
}

export function useIntroSeen(): UseIntroSeenReturn {
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fetchWithRetry = () => {
      settingsApi.get()
        .then((s) => setIntroSeen(s.intro_seen))
        .catch(() => {
          if (attemptRef.current < RETRY_MAX_ATTEMPTS) {
            const delay = Math.min(RETRY_BASE_MS * Math.pow(2, attemptRef.current), RETRY_MAX_MS);
            attemptRef.current += 1;
            timerRef.current = setTimeout(fetchWithRetry, delay);
          } else {
            setIntroSeen(true); // give up after max retries
          }
        });
    };

    fetchWithRetry();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const markIntroSeen = async () => {
    setIntroSeen(true);
    await settingsApi.update({ intro_seen: true });
  };

  return { introSeen, markIntroSeen };
}

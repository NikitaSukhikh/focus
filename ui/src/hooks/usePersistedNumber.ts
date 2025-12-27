/**
 * Persisted Number Hook
 *
 * Purpose: Manages number state with localStorage persistence
 * Responsibilities:
 * - Reading initial value from localStorage
 * - Persisting value changes to localStorage
 * - Providing state and setter similar to useState
 */

import { useState, useEffect } from 'react';

export const usePersistedNumber = (storageKey: string, fallback: number) => {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : fallback;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, value.toString());
  }, [storageKey, value]);

  return [value, setValue] as const;
};

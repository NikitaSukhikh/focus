/**
 * Telegram Add Event Listener Hook
 *
 * Purpose: Listens for custom 'centerpane:add-telegram' events
 * Responsibilities:
 * - Registering event listener for telegram account addition
 * - Calling handler when event is triggered
 * - Cleaning up event listener on unmount
 */

import { useEffect } from 'react';

export const useTelegramEventListener = (onAddTelegram: () => void) => {
  useEffect(() => {
    const handleAddTelegram = () => {
      onAddTelegram();
    };

    window.addEventListener('centerpane:add-telegram', handleAddTelegram);

    return () => {
      window.removeEventListener('centerpane:add-telegram', handleAddTelegram);
    };
  }, [onAddTelegram]);
};

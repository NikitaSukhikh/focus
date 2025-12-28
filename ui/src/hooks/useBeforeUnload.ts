/**
 * Before Unload Hook
 *
 * Ensures all pending API requests are flushed before the app closes.
 * Particularly important for Electron apps where window can close immediately.
 */

import { useEffect } from 'react';
import { requestTracker } from '../utils/requestTracker';

export const useBeforeUnload = () => {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const pendingCount = requestTracker.getPendingCount();

      if (pendingCount > 0) {
        console.log(`[BeforeUnload] ${pendingCount} pending requests, waiting...`);

        // For web: Show warning dialog
        e.preventDefault();
        e.returnValue = '';

        // Try to flush pending requests
        // Note: This is best-effort since browsers limit execution time in beforeunload
        requestTracker.waitForPending(2000).then(() => {
          console.log('[BeforeUnload] Pending requests flushed');
        });

        return '';
      }
    };

    // Handle visibility change (app going to background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const pendingCount = requestTracker.getPendingCount();
        if (pendingCount > 0) {
          console.log(`[VisibilityChange] ${pendingCount} pending requests when app hidden`);
        }
      }
    };

    // Handle page hide (more reliable than beforeunload in some cases)
    const handlePageHide = () => {
      const pendingCount = requestTracker.getPendingCount();
      if (pendingCount > 0) {
        console.log(`[PageHide] ${pendingCount} pending requests, attempting flush...`);
        // Use sendBeacon or synchronous XHR as last resort
        // For now, just wait
        requestTracker.waitForPending(1000);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);
};

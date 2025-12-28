/**
 * Debounced Position Update Hook
 *
 * Purpose: Debounce position update API calls while maintaining instant UI feedback
 * Responsibilities:
 * - Debounce position updates per object (300ms)
 * - Track pending positions for flush on window close
 * - Provide immediate UI update with delayed API sync
 */

import { useCallback, useRef, useEffect } from 'react';
import { objectsApi } from '../api/objects';

interface PendingPosition {
  x: number;
  y: number;
}

const DEBOUNCE_MS = 300;

export const useDebouncedPositionUpdate = () => {
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingPositionsRef = useRef<Map<string, PendingPosition>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const updatePosition = useCallback((objectId: string, x: number, y: number) => {
    // Store the pending position
    pendingPositionsRef.current.set(objectId, { x, y });

    // Clear existing timer for this object
    const existingTimer = timersRef.current.get(objectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const pending = pendingPositionsRef.current.get(objectId);
      if (pending) {
        objectsApi.updatePosition(objectId, pending.x, pending.y).catch((err) => {
          console.error('[DebouncedPositionUpdate] Failed to update position:', err);
        });
        pendingPositionsRef.current.delete(objectId);
      }
      timersRef.current.delete(objectId);
    }, DEBOUNCE_MS);

    timersRef.current.set(objectId, timer);
  }, []);

  const flushPending = useCallback(async () => {
    // Cancel all timers and execute immediately
    const promises: Promise<any>[] = [];

    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    pendingPositionsRef.current.forEach((pos, objectId) => {
      const promise = objectsApi.updatePosition(objectId, pos.x, pos.y).catch((err) => {
        console.error('[DebouncedPositionUpdate] Failed to flush position:', err);
      });
      promises.push(promise);
    });

    pendingPositionsRef.current.clear();

    await Promise.allSettled(promises);
  }, []);

  return { updatePosition, flushPending };
};

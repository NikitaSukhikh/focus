/**
 * Request Tracker Utility
 *
 * Tracks pending API requests to ensure they complete before app closes.
 * Provides debouncing for position updates to reduce API call frequency.
 */

type PendingRequest = Promise<any>;

class RequestTracker {
  private pendingRequests: Set<PendingRequest> = new Set();
  private positionUpdateTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly POSITION_UPDATE_DEBOUNCE_MS = 300;

  /**
   * Track a request and automatically remove it when completed
   */
  track<T>(promise: Promise<T>): Promise<T> {
    this.pendingRequests.add(promise);

    promise
      .finally(() => {
        this.pendingRequests.delete(promise);
      })
      .catch((err) => {
        console.error('[RequestTracker] Request failed:', err);
      });

    return promise;
  }

  /**
   * Debounce position updates for the same object
   * Returns a promise that resolves when the update is sent
   */
  debouncedPositionUpdate(
    objectId: string,
    x: number,
    y: number,
    updateFn: (id: string, x: number, y: number) => Promise<any>
  ): Promise<any> {
    // Clear existing timer for this object
    const existingTimer = this.positionUpdateTimers.get(objectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Create a promise that will be resolved when the update is sent
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.positionUpdateTimers.delete(objectId);
        const promise = updateFn(objectId, x, y);
        this.track(promise);
        promise.then(resolve).catch(reject);
      }, this.POSITION_UPDATE_DEBOUNCE_MS);

      this.positionUpdateTimers.set(objectId, timer);
    });
  }

  /**
   * Flush all pending position updates immediately (for window close)
   */
  async flushPositionUpdates(
    updateFn: (id: string, x: number, y: number) => Promise<any>,
    positions: Map<string, { x: number; y: number }>
  ): Promise<void> {
    // Cancel all pending timers and execute immediately
    const promises: Promise<any>[] = [];

    for (const [objectId, timer] of this.positionUpdateTimers.entries()) {
      clearTimeout(timer);
      const pos = positions.get(objectId);
      if (pos) {
        const promise = updateFn(objectId, pos.x, pos.y);
        this.track(promise);
        promises.push(promise);
      }
    }

    this.positionUpdateTimers.clear();

    await Promise.allSettled(promises);
  }

  /**
   * Wait for all pending requests to complete
   * Used during window unload
   */
  async waitForPending(timeoutMs: number = 5000): Promise<void> {
    if (this.pendingRequests.size === 0) {
      return;
    }

    console.log(`[RequestTracker] Waiting for ${this.pendingRequests.size} pending requests...`);

    const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
    const allPending = Promise.allSettled(Array.from(this.pendingRequests));

    await Promise.race([allPending, timeout]);

    if (this.pendingRequests.size > 0) {
      console.warn(`[RequestTracker] ${this.pendingRequests.size} requests still pending after timeout`);
    } else {
      console.log('[RequestTracker] All pending requests completed');
    }
  }

  /**
   * Get count of pending requests
   */
  getPendingCount(): number {
    return this.pendingRequests.size + this.positionUpdateTimers.size;
  }

  /**
   * Check if there are any pending requests
   */
  hasPending(): boolean {
    return this.pendingRequests.size > 0 || this.positionUpdateTimers.size > 0;
  }
}

// Global singleton instance
export const requestTracker = new RequestTracker();

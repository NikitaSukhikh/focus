// Tests lock in close-target selection so Alt+F4-like flows do not close the whole app unexpectedly.
import { describe, expect, it, vi } from 'vitest';

import {
  closeFocusedOrMainWindow,
  closeWindowIfAvailable,
  isAltF4KeyDown,
  type CloseableWindowLike,
} from './windowClosePolicy';

const createWindowMock = (destroyed: boolean = false): CloseableWindowLike & {
  close: ReturnType<typeof vi.fn>;
  isDestroyed: ReturnType<typeof vi.fn>;
} => {
  return {
    close: vi.fn(),
    isDestroyed: vi.fn(() => destroyed),
  };
};

describe('windowClosePolicy', () => {
  describe('isAltF4KeyDown', () => {
    it('returns true for Alt+F4 keyDown', () => {
      expect(isAltF4KeyDown({ key: 'F4', alt: true, type: 'keyDown' })).toBe(true);
      expect(isAltF4KeyDown({ key: 'f4', alt: true, type: 'rawKeyDown' })).toBe(true);
    });

    it('returns false for non-close keyboard combinations', () => {
      expect(isAltF4KeyDown({ key: 'F4', alt: false, type: 'keyDown' })).toBe(false);
      expect(isAltF4KeyDown({ key: 'F5', alt: true, type: 'keyDown' })).toBe(false);
      expect(isAltF4KeyDown({ key: 'F4', alt: true, type: 'keyUp' })).toBe(false);
    });
  });

  describe('closeWindowIfAvailable', () => {
    it('closes a non-destroyed window', () => {
      const target = createWindowMock(false);
      const didClose = closeWindowIfAvailable(target);

      expect(didClose).toBe(true);
      expect(target.close).toHaveBeenCalledTimes(1);
    });

    it('does not close a destroyed or missing window', () => {
      const destroyedWindow = createWindowMock(true);

      expect(closeWindowIfAvailable(destroyedWindow)).toBe(false);
      expect(closeWindowIfAvailable(null)).toBe(false);
      expect(destroyedWindow.close).not.toHaveBeenCalled();
    });
  });

  describe('closeFocusedOrMainWindow', () => {
    it('prefers closing the focused window over main window', () => {
      const focusedWindow = createWindowMock(false);
      const mainWindow = createWindowMock(false);

      const didClose = closeFocusedOrMainWindow(focusedWindow, mainWindow);

      expect(didClose).toBe(true);
      expect(focusedWindow.close).toHaveBeenCalledTimes(1);
      expect(mainWindow.close).not.toHaveBeenCalled();
    });

    it('falls back to main window when no focused window exists', () => {
      const mainWindow = createWindowMock(false);

      const didClose = closeFocusedOrMainWindow(null, mainWindow);

      expect(didClose).toBe(true);
      expect(mainWindow.close).toHaveBeenCalledTimes(1);
    });
  });
});


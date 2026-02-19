/**
 * Centralizes close-target selection and Alt+F4 detection to keep window behavior consistent and testable.
 */
export interface KeyboardInputLike {
  key?: string;
  alt?: boolean;
  type?: string;
}

export interface CloseableWindowLike {
  close: () => void;
  isDestroyed: () => boolean;
}

export const isAltF4KeyDown = (input: KeyboardInputLike): boolean => {
  const key = input.key?.toLowerCase();
  const isAltF4 = key === 'f4' && !!input.alt;
  const isKeyDownEvent = input.type === 'keyDown' || input.type === 'rawKeyDown';
  return isAltF4 && isKeyDownEvent;
};

export const closeWindowIfAvailable = (window: CloseableWindowLike | null | undefined): boolean => {
  if (!window || window.isDestroyed()) {
    return false;
  }

  window.close();
  return true;
};

export const closeFocusedOrMainWindow = (
  focusedWindow: CloseableWindowLike | null | undefined,
  mainWindow: CloseableWindowLike | null | undefined
): boolean => {
  return closeWindowIfAvailable(focusedWindow ?? mainWindow);
};


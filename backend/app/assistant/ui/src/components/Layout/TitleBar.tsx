// Custom title bar for the Tauri window.

import React, { useState, useEffect, useRef } from 'react';
import { appWindow } from '@tauri-apps/api/window';
import { Minimize, Maximize, X, Minus, Settings as SettingsIcon } from 'lucide-react';
import { getGDriveAuthStatus } from '../../services/api';

interface Props {
  onLinkGoogle?: () => void;
  onAuthChange?: (isAuthenticated: boolean) => void;
  onOpenSettings?: () => void;
}

export function TitleBar({ onLinkGoogle, onAuthChange, onOpenSettings }: Props) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Check Google auth status on mount and periodically
  useEffect(() => {
    const checkAuthStatus = async () => {
      const result = await getGDriveAuthStatus();
      if (result.success) {
        const authenticated = result.authenticated || false;
        setIsGoogleAuthenticated(authenticated);
        onAuthChange?.(authenticated);
      }
    };

    checkAuthStatus();
    // Check every 30 seconds
    const interval = setInterval(checkAuthStatus, 30000);
    return () => clearInterval(interval);
  }, [onAuthChange]);

  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleMaximize = async () => {
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    // This will hide the window instead of closing it (see main.rs)
    await appWindow.close();
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 bg-gray-900 border-b border-gray-800 select-none relative z-50"
    >
      <div
        data-tauri-drag-region
        className="flex items-center gap-2 px-3 flex-1 relative"
      >
        <span className="text-sm font-semibold text-gray-200">Alfy</span>
        <div
          className="relative"
          ref={menuRef}
          data-tauri-drag-region="false"
        >
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center space-x-1 text-xs text-gray-300 hover:text-white px-2 py-1 rounded hover:bg-gray-800"
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings</span>
          </button>
          {showMenu && (
            <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onOpenSettings?.();
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Integrations
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onLinkGoogle?.();
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Link with Google
              </button>
            </div>
          )}
        </div>
        <div
          data-tauri-drag-region="false"
          className="flex items-center space-x-1.5 px-2 py-1"
          title={isGoogleAuthenticated ? 'Google Drive: Connected' : 'Google Drive: Not connected'}
        >
          <div className={`w-2 h-2 rounded-full ${isGoogleAuthenticated ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-400">Google Auth</span>
        </div>
      </div>

      <div className="flex items-center h-full">
        <button
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-gray-800 transition-colors"
          aria-label="Minimize"
        >
          <Minus className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-gray-800 transition-colors"
          aria-label="Maximize"
        >
          <Maximize className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 hover:bg-red-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

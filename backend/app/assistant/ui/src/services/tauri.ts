// Tauri bridge helpers for commands/hotkeys.

import { invoke } from '@tauri-apps/api/tauri';

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
}

/**
 * Tauri command wrappers for the Alfy desktop app
 */
export const TauriCommands = {
  // Window management
  async minimizeToTray(): Promise<void> {
    return invoke('minimize_to_tray');
  },

  async showFromTray(): Promise<void> {
    return invoke('show_from_tray');
  },

  async toggleWindow(): Promise<void> {
    return invoke('toggle_window');
  },

  async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
    return invoke('set_always_on_top', { alwaysOnTop });
  },

  async isWindowVisible(): Promise<boolean> {
    return invoke('is_window_visible');
  },

  async setWindowSize(width: number, height: number): Promise<void> {
    return invoke('set_window_size', { width, height });
  },

  async centerWindow(): Promise<void> {
    return invoke('center_window');
  },

  // Backend communication
  async pingBackend(backendUrl: string): Promise<boolean> {
    return invoke('ping_backend', { backendUrl });
  },

  async sendMessage(backendUrl: string, message: string, model: 'local' | 'claude' | 'chatgpt' = 'local'): Promise<string> {
    return invoke('send_message', { backendUrl, message, model });
  },

  // System info
  async getSystemInfo(): Promise<SystemInfo> {
    return invoke('get_system_info');
  },
};

/**
 * React hook for Tauri commands
 */
export function useTauriCommands() {
  return TauriCommands;
}

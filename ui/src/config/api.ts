/**
 * API configuration
 * Handles different base URLs for development (Vite proxy) vs production (Electron)
 */

const isElectron = () => {
  return !!(window as any).desktopAPI;
};

export const getApiBaseUrl = (): string => {
  if (isElectron()) {
    // In Electron, connect directly to the backend server
    return 'http://localhost:8000/api';
  }
  // In development, use Vite proxy
  return '/api';
};

export const API_BASE = getApiBaseUrl();

import { getApiBaseUrl } from '../config/api';

const API_BASE = `${getApiBaseUrl()}/internal-storage`;

export const internalStorageApi = {
  async open(): Promise<void> {
    const res = await fetch(`${API_BASE}/open`, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to open internal storage: ${res.status} ${text}`);
    }
  },
};

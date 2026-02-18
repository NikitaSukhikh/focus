import { API_BASE } from '@/config/api';

export interface UserSettings {
  language: string;
  intro_seen: boolean;
}

export const settingsApi = {
  async get(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json() as Promise<UserSettings>;
  },

  async update(data: Partial<UserSettings>): Promise<UserSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json() as Promise<UserSettings>;
  },
};

const API_BASE = '/api';

export interface Island {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  position: number;
  object_count: number;
  created_at: string;
  updated_at: string;
}

export interface IslandCreate {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface IslandUpdate {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
}

export const islandsApi = {
  async getAll(): Promise<{ islands: Island[]; total: number }> {
    const res = await fetch(`${API_BASE}/islands?sort_by=created_at&sort_order=desc`);
    if (!res.ok) throw new Error('Failed to fetch islands');
    return res.json();
  },

  async create(data: IslandCreate): Promise<Island> {
    const res = await fetch(`${API_BASE}/islands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create island');
    return res.json();
  },

  async update(id: string, data: IslandUpdate): Promise<Island> {
    const res = await fetch(`${API_BASE}/islands/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update island');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/islands/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete island');
  },
};

const API_BASE = '/api';

export interface Space {
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

export interface SpaceCreate {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface SpaceUpdate {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
}

export const spacesApi = {
  async getAll(): Promise<{ spaces: Space[]; total: number }> {
    const res = await fetch(`${API_BASE}/spaces?sort_by=created_at&sort_order=desc`);
    if (!res.ok) throw new Error('Failed to fetch spaces');
    return res.json();
  },

  async create(data: SpaceCreate): Promise<Space> {
    const res = await fetch(`${API_BASE}/spaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create space');
    return res.json();
  },

  async update(id: string, data: SpaceUpdate): Promise<Space> {
    const res = await fetch(`${API_BASE}/spaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update space');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/spaces/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete space');
  },
};

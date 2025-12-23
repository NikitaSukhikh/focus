const API_BASE = '/api';

export type ObjectType = 'link' | 'file' | 'google_drive' | 'gmail' | 'text';

export interface ObjectCreatePayload {
  type: ObjectType;
  title: string;
  description?: string;
  tags?: string[];
  // Position metadata
  x?: number;
  y?: number;
  // Type-specific fields
  url?: string;
  favicon_url?: string;
  thumbnail_url?: string;
  drive_file_id?: string;
  drive_file_name?: string;
  web_view_link?: string;
  thread_id?: string;
  message_id?: string;
  subject?: string;
  sender?: string;
  snippet?: string;
  content?: string;
  service?: string;
  file_path?: string;
  mime_type?: string;
}

export interface ObjectResponse {
  id: string;
  island_id: string;
  type: ObjectType;
  title: string;
  description?: string;
  tags?: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const objectsApi = {
  async list(islandId: string): Promise<ObjectResponse[]> {
    const res = await fetch(`${API_BASE}/islands/${islandId}/objects`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list objects: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.objects || [];
  },

  async create(islandId: string, payload: ObjectCreatePayload): Promise<ObjectResponse> {
    const res = await fetch(`${API_BASE}/islands/${islandId}/objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create object: ${res.status} ${text}`);
    }
    return res.json();
  },

  async updatePosition(objectId: string, x: number, y: number): Promise<ObjectResponse> {
    const res = await fetch(`${API_BASE}/objects/${objectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { x, y } }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update position: ${res.status} ${text}`);
    }
    return res.json();
  },

  async updateTitle(objectId: string, title: string): Promise<ObjectResponse> {
    const res = await fetch(`${API_BASE}/objects/${objectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to update title: ${res.status} ${text}`);
    }
    return res.json();
  },

  async delete(objectId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/objects/${objectId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to delete object: ${res.status} ${text}`);
    }
  },

  async getAllByType(type: ObjectType): Promise<ObjectResponse[]> {
    const res = await fetch(`${API_BASE}/objects/by-type/${type}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list objects by type: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.objects || [];
  },
};

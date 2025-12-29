import { truncateLinkTitle } from '../utils/text';
import { requestTracker } from '../utils/requestTracker';

const API_BASE = '/api';

export type ObjectType = 'link' | 'file' | 'google_drive' | 'gmail' | 'text';

export interface ObjectCreatePayload {
  type: ObjectType;
  title: string;
  description?: string;
  tags?: string[];
  custom_title?: string;
  custom_description?: string;
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
  default_title: string;
  default_description?: string;
  custom_title?: string;
  custom_description?: string;
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
    const trimmedCustomTitle = payload.custom_title?.trim();
    const trimmedCustomDescription = payload.custom_description?.trim();
    const safePayload: ObjectCreatePayload = {
      ...payload,
      title: payload.title ? truncateLinkTitle(payload.title) : payload.title,
      custom_title: trimmedCustomTitle && trimmedCustomTitle.length > 1 ? truncateLinkTitle(trimmedCustomTitle) : undefined,
      custom_description: trimmedCustomDescription ? trimmedCustomDescription : undefined,
      description: payload.description?.trim(),
    };

    const promise = (async () => {
      const res = await fetch(`${API_BASE}/islands/${islandId}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safePayload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to create object: ${res.status} ${text}`);
      }
      return res.json();
    })();

    return requestTracker.track(promise);
  },

  async updatePosition(objectId: string, x: number, y: number): Promise<ObjectResponse> {
    const promise = (async () => {
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
    })();

    return requestTracker.track(promise);
  },

  async updateTitle(objectId: string, title: string): Promise<ObjectResponse> {
    const safeTitle = truncateLinkTitle(title);

    const promise = (async () => {
      const res = await fetch(`${API_BASE}/objects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_title: safeTitle }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update title: ${res.status} ${text}`);
      }
      return res.json();
    })();

    return requestTracker.track(promise);
  },

  async updateLink(
    objectId: string,
    url: string,
    defaultTitle: string,
    defaultDescription: string,
    favicon_url: string,
    customTitle?: string | null,
    customDescription?: string | null,
  ): Promise<ObjectResponse> {
    const safeDefaultTitle = truncateLinkTitle(defaultTitle);
    const trimmedDefaultDescription = defaultDescription?.trim() ?? '';
    const trimmedCustomTitle = customTitle === null ? null : customTitle?.trim();
    const trimmedCustomDescription = customDescription === null ? null : customDescription?.trim();
    const body: Record<string, unknown> = {
      default_title: safeDefaultTitle,
      default_description: trimmedDefaultDescription,
      metadata: { url, favicon_url }
    };

    if (trimmedCustomTitle) {
      body.custom_title = truncateLinkTitle(trimmedCustomTitle);
    } else if (customTitle === null) {
      body.custom_title = null;
    }

    if (trimmedCustomDescription) {
      body.custom_description = trimmedCustomDescription;
    } else if (customDescription === null) {
      body.custom_description = null;
    }

    const promise = (async () => {
      const res = await fetch(`${API_BASE}/objects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update link: ${res.status} ${text}`);
      }
      return res.json();
    })();

    return requestTracker.track(promise);
  },

  async delete(objectId: string): Promise<void> {
    const promise = (async () => {
      const res = await fetch(`${API_BASE}/objects/${objectId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to delete object: ${res.status} ${text}`);
      }
    })();

    return requestTracker.track(promise);
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

  async updateMetadata(objectId: string, metadata: Record<string, unknown>): Promise<ObjectResponse> {
    const promise = (async () => {
      const res = await fetch(`${API_BASE}/objects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to update metadata: ${res.status} ${text}`);
      }
      return res.json();
    })();

    return requestTracker.track(promise);
  },
};

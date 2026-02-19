import { truncateLinkTitle } from '@/utils/text';
import { requestTracker } from '@/utils/requestTracker';
import { TagValue } from '@/types/tags';
import { API_BASE } from '@/config/api';

export type ObjectType = 'link' | 'file' | 'google_drive' | 'gmail' | 'text' | 'web_article';

export interface ObjectCreatePayload {
  type: ObjectType;
  title: string;
  description?: string;
  tags?: string[];
  tag?: TagValue;
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
  space_id: string;
  type: ObjectType;
  title: string;
  description?: string;
  default_title: string;
  default_description?: string;
  custom_title?: string;
  custom_description?: string;
  tags?: string[];
  tag?: TagValue;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const objectsApi = {
  async patchObject(objectId: string, patch: Record<string, unknown>): Promise<ObjectResponse> {
    const desktopApi = (window as any).desktopAPI as {
      queueObjectPatch?: (_objectId: string, _patch: Record<string, unknown>) => Promise<unknown>;
    } | undefined;

    if (desktopApi?.queueObjectPatch) {
      const promise = (async () => {
        const result = await desktopApi.queueObjectPatch(objectId, patch);
        return result as ObjectResponse;
      })();
      return requestTracker.track(promise);
    }

    const promise = (async () => {
      const res = await fetch(`${API_BASE}/objects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // keepalive helps persist patch updates during window close
        keepalive: true,
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to patch object: ${res.status} ${text}`);
      }
      return res.json();
    })();

    return requestTracker.track(promise);
  },

  async list(spaceId: string): Promise<ObjectResponse[]> {
    const res = await fetch(`${API_BASE}/spaces/${spaceId}/objects`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to list objects: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.objects || [];
  },

  async create(spaceId: string, payload: ObjectCreatePayload): Promise<ObjectResponse> {
    const trimmedCustomTitle = payload.custom_title?.trim();
    const trimmedCustomDescription = payload.custom_description?.trim();
    const safePayload: ObjectCreatePayload = {
      ...payload,
      tag: payload.tag ?? '',
      title: payload.title ? truncateLinkTitle(payload.title) : payload.title,
      custom_title: trimmedCustomTitle && trimmedCustomTitle.length > 1 ? truncateLinkTitle(trimmedCustomTitle) : undefined,
      custom_description: trimmedCustomDescription ? trimmedCustomDescription : undefined,
      description: payload.description?.trim(),
    };

    const promise = (async () => {
      const res = await fetch(`${API_BASE}/spaces/${spaceId}/objects`, {
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
        // keepalive ensures position persists even if window closes right after move
        keepalive: true,
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

  async updateSize(objectId: string, x: number, y: number, width: number, height: number): Promise<ObjectResponse> {
    return objectsApi.patchObject(objectId, { metadata: { x, y, width, height } });
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
    return objectsApi.patchObject(objectId, { metadata });
  },

  /**
   * Soft delete: mark object as deleted and clear coordinates.
   * Used instead of hard DELETE so undo/redo can restore from event payload.
   */
  async markDeleted(objectId: string): Promise<ObjectResponse> {
    const deletedAt = new Date().toISOString();
    const promise = (async () => {
      const res = await fetch(`${API_BASE}/objects/${objectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // keepalive helps when window closes soon after deletion
        keepalive: true,
        body: JSON.stringify({ metadata: { x: -1, y: -1, deleted_at: deletedAt } }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to mark deleted: ${res.status} ${text}`);
      }
      return res.json();
    })();

    return requestTracker.track(promise);
  },

  async renameFile(objectId: string, newName: string): Promise<FileRenameResponse> {
    const promise = (async () => {
      const res = await fetch(`${API_BASE}/objects/${objectId}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: newName }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to rename file: ${res.status} ${text}`);
      }
      return res.json();
    })();

    return requestTracker.track(promise);
  },
};

export interface FileRenameResponse {
  success: boolean;
  object_id: string;
  old_path: string;
  new_path: string;
  new_title: string;
}

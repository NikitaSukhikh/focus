const API_BASE = '/api';

export interface PreviewResponse {
  object_type?: string;
  text_preview?: string | null;
  content_preview?: string | null;
  mime_type?: string | null;
  file_path?: string | null;
  title?: string | null;
}

export const previewApi = {
  async getObjectPreview(objectId: string): Promise<PreviewResponse> {
    const res = await fetch(`${API_BASE}/objects/${objectId}/preview`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch preview: ${res.status} ${text}`);
    }
    return res.json();
  },
};

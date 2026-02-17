import { API_BASE } from '@/config/api';
import { SpaceShareFilters } from '@/components/dialogs/share/types';

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
  id?: string; // Optional client-provided UUID
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

export interface SpaceShareExportFilters {
  links: boolean;
  web_articles: boolean;
  files: boolean;
  text_notes: boolean;
}

export interface SpaceShareExportItem {
  object_id: string;
  type: 'link' | 'web_article' | 'file' | 'text';
  category: 'links' | 'web_articles' | 'files' | 'text_notes';
  title: string;
  share_data?: string;
  file_path?: string;
  file_size_bytes?: number;
  file_exists?: boolean;
  is_too_large?: boolean;
}

export interface SpaceShareExportResponse {
  space_id: string;
  space_name: string;
  filters: SpaceShareExportFilters;
  total_items: number;
  share_text: string;
  summary_lines: string[];
  warnings: string[];
  first_share_url?: string;
  items: SpaceShareExportItem[];
  organized_data: {
    links: Record<string, string>;
    web_articles: Record<string, string>;
    files: Record<string, {
      title: string;
      file_path: string;
      file_size_bytes?: number;
      file_exists?: boolean;
      is_too_large?: boolean;
    }>;
    text_notes: Record<string, string>;
  };
}

export const spacesApi = {
  async getAll(): Promise<{ spaces: Space[]; total: number }> {
    const res = await fetch(`${API_BASE}/spaces?sort_by=created_at&sort_order=desc`);
    if (!res.ok) throw new Error('Failed to fetch spaces');
    return res.json();
  },

  async create(data: SpaceCreate): Promise<Space> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const res = await fetch(`${API_BASE}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Failed to create space');
      return res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timeout - is the backend running at http://localhost:8000?');
      }
      throw error;
    }
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

  async exportShare(id: string, filters: SpaceShareFilters): Promise<SpaceShareExportResponse> {
    const res = await fetch(`${API_BASE}/spaces/${id}/share-export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        links: filters.links,
        web_articles: filters.webArticles,
        files: filters.files,
        text_notes: filters.textNotes,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to export space share payload: ${res.status} ${text}`);
    }

    return res.json();
  },
};

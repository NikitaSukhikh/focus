/**
 * Undo/Redo API Client
 *
 * Handles communication with the backend undo/redo endpoints.
 */

const API_BASE = '/api';

export type UndoEventType =
  | 'tile_create'
  | 'tile_move'
  | 'tile_delete'
  | 'arrow_move'
  | 'arrow_create'
  | 'arrow_delete'
  | 'text_create'
  | 'text_delete';

export interface UndoEventCreate {
  event_type: UndoEventType;
  event_data: Record<string, any>;
}

export interface UndoEventResponse {
  id: string;
  island_id: string;
  event_type: UndoEventType;
  event_data: Record<string, any>;
  timestamp: string;
  is_undone: boolean;
}

export interface UndoRedoResponse {
  success: boolean;
  event: UndoEventResponse | null;
  message: string;
}

export const undoApi = {
  /**
   * Create a new undo event.
   * This clears the redo stack.
   */
  async createEvent(islandId: string, event: UndoEventCreate): Promise<UndoEventResponse> {
    const res = await fetch(`${API_BASE}/islands/${islandId}/undo-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to create undo event: ${text}`);
    }

    return res.json();
  },

  /**
   * Undo the last event.
   * Returns the event that was undone so the client can reverse it.
   */
  async undo(islandId: string): Promise<UndoRedoResponse> {
    const res = await fetch(`${API_BASE}/islands/${islandId}/undo`, {
      method: 'POST',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to undo event: ${text}`);
    }

    return res.json();
  },

  /**
   * Redo the last undone event.
   * Returns the event that was redone so the client can reapply it.
   */
  async redo(islandId: string): Promise<UndoRedoResponse> {
    const res = await fetch(`${API_BASE}/islands/${islandId}/redo`, {
      method: 'POST',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to redo event: ${text}`);
    }

    return res.json();
  },

  /**
   * Clear all undo/redo history for an island.
   */
  async clearHistory(islandId: string): Promise<{ cleared: number; message: string }> {
    const res = await fetch(`${API_BASE}/islands/${islandId}/undo-events`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to clear undo history: ${text}`);
    }

    return res.json();
  },
};

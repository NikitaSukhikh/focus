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
  | 'text_move'
  | 'arrow_move'
  | 'arrow_create'
  | 'arrow_delete'
  | 'text_create'
  | 'text_delete';

// Keep client event types aligned with backend undo events
export interface UndoEventCreate {
  event_type: UndoEventType;
  event_data: Record<string, any>;
}

export interface UndoEventResponse {
  id: string;
  space_id: string;
  sequence: number;
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
  async createEvent(spaceId: string, event: UndoEventCreate): Promise<UndoEventResponse> {
    const res = await fetch(`${API_BASE}/spaces/${spaceId}/undo-events`, {
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
  async undo(spaceId: string): Promise<UndoRedoResponse> {
    const res = await fetch(`${API_BASE}/spaces/${spaceId}/undo`, {
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
  async redo(spaceId: string): Promise<UndoRedoResponse> {
    const res = await fetch(`${API_BASE}/spaces/${spaceId}/redo`, {
      method: 'POST',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to redo event: ${text}`);
    }

    return res.json();
  },

  /**
   * Clear all undo/redo history for an space.
   */
  async clearHistory(spaceId: string): Promise<{ cleared: number; message: string }> {
    const res = await fetch(`${API_BASE}/spaces/${spaceId}/undo-events`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to clear undo history: ${text}`);
    }

    return res.json();
  },
};

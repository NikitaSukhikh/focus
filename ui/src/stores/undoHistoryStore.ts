import { create } from 'zustand';

// Event types for the unified undo system
export type UndoEventType = 'tile_create' | 'tile_move' | 'tile_delete' | 'text_move' | 'arrow_move' | 'arrow_create' | 'arrow_delete' | 'text_create' | 'text_delete';

export interface TileCreateEvent {
  type: 'tile_create';
  timestamp: number;
  spaceId: string;
  tile: {
    id: string;
    type: string;
    title: string;
    x: number;
    y: number;
    url?: string;
    description?: string;
    faviconUrl?: string;
    filePath?: string;
    serviceKey?: string;
    service?: string;
    content?: string;
  };
}

export interface TileDeleteEvent {
  type: 'tile_delete';
  timestamp: number;
  spaceId: string;
  tile: {
    id: string;
    type: string;
    title: string;
    x: number;
    y: number;
    url?: string;
    description?: string;
    faviconUrl?: string;
    filePath?: string;
    serviceKey?: string;
    service?: string;
    content?: string;
  };
}

export interface TileMoveEvent {
  type: 'tile_move';
  timestamp: number;
  spaceId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  tile: {
    id: string;
    type: string;
    title: string;
    x: number;
    y: number;
    url?: string;
    description?: string;
    faviconUrl?: string;
    filePath?: string;
    serviceKey?: string;
    service?: string;
    content?: string;
  };
}

export interface TextMoveEvent {
  type: 'text_move';
  timestamp: number;
  spaceId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  text: {
    id: string;
    title: string;
    content: string;
    x: number;
    y: number;
  };
}

export interface ArrowMoveEvent {
  type: 'arrow_move';
  timestamp: number;
  spaceId: string;
  // Mirror backend arrow_move payload for client-side history
  from: { start: { x: number; y: number }; end: { x: number; y: number } };
  to: { start: { x: number; y: number }; end: { x: number; y: number } };
  arrow: {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}

export interface ArrowCreateEvent {
  type: 'arrow_create';
  timestamp: number;
  spaceId: string;
  arrow: {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}

export interface ArrowDeleteEvent {
  type: 'arrow_delete';
  timestamp: number;
  spaceId: string;
  arrow: {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}

export interface TextCreateEvent {
  type: 'text_create';
  timestamp: number;
  spaceId: string;
  text: {
    id: string;
    title: string;
    content: string;
    x: number;
    y: number;
  };
}

export interface TextDeleteEvent {
  type: 'text_delete';
  timestamp: number;
  spaceId: string;
  text: {
    id: string;
    title: string;
    content: string;
    x: number;
    y: number;
  };
}

export type UndoEvent = TileCreateEvent | TileMoveEvent | TileDeleteEvent | TextMoveEvent | ArrowMoveEvent | ArrowCreateEvent | ArrowDeleteEvent | TextCreateEvent | TextDeleteEvent;

interface UndoHistoryStore {
  events: UndoEvent[];
  redoEvents: UndoEvent[];
  addEvent: (event: Omit<TileCreateEvent, 'timestamp'> | Omit<TileMoveEvent, 'timestamp'> | Omit<TileDeleteEvent, 'timestamp'> | Omit<TextMoveEvent, 'timestamp'> | Omit<ArrowMoveEvent, 'timestamp'> | Omit<ArrowCreateEvent, 'timestamp'> | Omit<ArrowDeleteEvent, 'timestamp'> | Omit<TextCreateEvent, 'timestamp'> | Omit<TextDeleteEvent, 'timestamp'>) => void;
  getLastEvent: (spaceId?: string) => UndoEvent | null;
  removeLastEvent: (spaceId?: string) => void;
  getLastRedoEvent: (spaceId?: string) => UndoEvent | null;
  removeLastRedoEvent: (spaceId?: string) => void;
  moveEventToRedo: (event: UndoEvent) => void;
  moveEventToUndo: (event: UndoEvent) => void;
  clearHistory: (spaceId?: string) => void;
}

const MAX_HISTORY_EVENTS = 100;

export const useUndoHistoryStore = create<UndoHistoryStore>((set, get) => ({
  events: [],
  redoEvents: [],

  addEvent: (event: Omit<TileCreateEvent, 'timestamp'> | Omit<TileDeleteEvent, 'timestamp'> | Omit<ArrowCreateEvent, 'timestamp'> | Omit<ArrowDeleteEvent, 'timestamp'> | Omit<TextCreateEvent, 'timestamp'> | Omit<TextDeleteEvent, 'timestamp'>) => {
    set((state) => {
      const newEvent: UndoEvent = {
        ...event,
        timestamp: Date.now(),
      } as UndoEvent;

      const newEvents = [...state.events, newEvent];

      // Keep only the last MAX_HISTORY_EVENTS
      if (newEvents.length > MAX_HISTORY_EVENTS) {
        newEvents.shift();
      }

      // Clear redo stack when a new action is performed
      return { events: newEvents, redoEvents: [] };
    });
  },

  getLastEvent: (spaceId?: string) => {
    const { events } = get();

    // Filter by space if specified
    const filteredEvents = spaceId
      ? events.filter((e) => e.spaceId === spaceId)
      : events;

    if (filteredEvents.length === 0) return null;

    // Sort by timestamp (most recent last) and return the last one
    const sorted = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
    return sorted[sorted.length - 1];
  },

  removeLastEvent: (spaceId?: string) => {
    set((state) => {
      const { events } = state;

      // Filter by space if specified
      const filteredEvents = spaceId
        ? events.filter((e) => e.spaceId === spaceId)
        : events;

      if (filteredEvents.length === 0) return state;

      // Sort by timestamp and find the last one
      const sorted = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
      const lastEvent = sorted[sorted.length - 1];

      // Remove the last event from the main events array
      return {
        events: events.filter((e) => e !== lastEvent),
      };
    });
  },

  getLastRedoEvent: (spaceId?: string) => {
    const { redoEvents } = get();

    // Filter by space if specified
    const filteredEvents = spaceId
      ? redoEvents.filter((e) => e.spaceId === spaceId)
      : redoEvents;

    if (filteredEvents.length === 0) return null;

    // Sort by timestamp (most recent last) and return the last one
    const sorted = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
    return sorted[sorted.length - 1];
  },

  removeLastRedoEvent: (spaceId?: string) => {
    set((state) => {
      const { redoEvents } = state;

      // Filter by space if specified
      const filteredEvents = spaceId
        ? redoEvents.filter((e) => e.spaceId === spaceId)
        : redoEvents;

      if (filteredEvents.length === 0) return state;

      // Sort by timestamp and find the last one
      const sorted = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
      const lastEvent = sorted[sorted.length - 1];

      // Remove the last event from the redo events array
      return {
        redoEvents: redoEvents.filter((e) => e !== lastEvent),
      };
    });
  },

  moveEventToRedo: (event: UndoEvent) => {
    set((state) => {
      const newRedoEvents = [...state.redoEvents, event];

      // Keep only the last MAX_HISTORY_EVENTS
      if (newRedoEvents.length > MAX_HISTORY_EVENTS) {
        newRedoEvents.shift();
      }

      return { redoEvents: newRedoEvents };
    });
  },

  moveEventToUndo: (event: UndoEvent) => {
    set((state) => {
      const newEvents = [...state.events, event];

      // Keep only the last MAX_HISTORY_EVENTS
      if (newEvents.length > MAX_HISTORY_EVENTS) {
        newEvents.shift();
      }

      return { events: newEvents };
    });
  },

  clearHistory: (spaceId?: string) => {
    set((state) => {
      if (!spaceId) {
        return { events: [], redoEvents: [] };
      }

      // Clear only events for the specific space
      return {
        events: state.events.filter((e) => e.spaceId !== spaceId),
        redoEvents: state.redoEvents.filter((e) => e.spaceId !== spaceId),
      };
    });
  },
}));

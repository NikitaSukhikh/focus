import { create } from 'zustand';

// Event types for the unified undo system
export type UndoEventType = 'tile_delete' | 'arrow_create' | 'arrow_delete' | 'text_create';

export interface TileDeleteEvent {
  type: 'tile_delete';
  timestamp: number;
  islandId: string;
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

export interface ArrowCreateEvent {
  type: 'arrow_create';
  timestamp: number;
  islandId: string;
  arrow: {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}

export interface ArrowDeleteEvent {
  type: 'arrow_delete';
  timestamp: number;
  islandId: string;
  arrow: {
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}

export interface TextCreateEvent {
  type: 'text_create';
  timestamp: number;
  islandId: string;
  text: {
    id: string;
    title: string;
    content: string;
    x: number;
    y: number;
  };
}

export type UndoEvent = TileDeleteEvent | ArrowCreateEvent | ArrowDeleteEvent | TextCreateEvent;

interface UndoHistoryStore {
  events: UndoEvent[];
  addEvent: (event: Omit<TileDeleteEvent, 'timestamp'> | Omit<ArrowCreateEvent, 'timestamp'> | Omit<ArrowDeleteEvent, 'timestamp'> | Omit<TextCreateEvent, 'timestamp'>) => void;
  getLastEvent: (islandId?: string) => UndoEvent | null;
  removeLastEvent: (islandId?: string) => void;
  clearHistory: (islandId?: string) => void;
}

const MAX_HISTORY_EVENTS = 100;

export const useUndoHistoryStore = create<UndoHistoryStore>((set, get) => ({
  events: [],

  addEvent: (event: Omit<TileDeleteEvent, 'timestamp'> | Omit<ArrowCreateEvent, 'timestamp'> | Omit<ArrowDeleteEvent, 'timestamp'> | Omit<TextCreateEvent, 'timestamp'>) => {
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

      return { events: newEvents };
    });
  },

  getLastEvent: (islandId?: string) => {
    const { events } = get();

    // Filter by island if specified
    const filteredEvents = islandId
      ? events.filter((e) => e.islandId === islandId)
      : events;

    if (filteredEvents.length === 0) return null;

    // Sort by timestamp (most recent last) and return the last one
    const sorted = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
    return sorted[sorted.length - 1];
  },

  removeLastEvent: (islandId?: string) => {
    set((state) => {
      const { events } = state;

      // Filter by island if specified
      const filteredEvents = islandId
        ? events.filter((e) => e.islandId === islandId)
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

  clearHistory: (islandId?: string) => {
    set((state) => {
      if (!islandId) {
        return { events: [] };
      }

      // Clear only events for the specific island
      return {
        events: state.events.filter((e) => e.islandId !== islandId),
      };
    });
  },
}));

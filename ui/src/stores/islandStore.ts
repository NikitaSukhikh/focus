import { create } from 'zustand';
import { Island, islandsApi } from '../api/islands';

interface IslandStore {
  _fetchVersion: number;
  islands: Island[];
  selectedIslandId: string | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  loadIslands: (_preferredSelectedId?: string | null) => Promise<void>;
  selectIsland: (_id: string | null) => void;
  getSelectedIsland: () => Island | null;
  addLocalIsland: (_name: string) => string;
  commitIsland: (_id: string, _name: string) => Promise<Island | null>;
  createIsland: (_name: string) => Promise<Island | null>;
  updateIsland: (_id: string, _name: string) => Promise<void>;
  deleteIsland: (_id: string) => Promise<void>;
}

export const useIslandStore = create<IslandStore>((set, get) => ({
  // Track latest fetch to avoid older responses overwriting newer state (e.g., create followed by initial load).
  _fetchVersion: 0,
  islands: [],
  selectedIslandId: null,
  initialized: false,

  initialize: async () => {
    const { initialized } = get();
    if (!initialized) {
      set({ initialized: true });
      await get().loadIslands();
    }
  },

  loadIslands: async (preferredSelectedId?: string | null) => {
    const currentVersion = get()._fetchVersion + 1;
    set({ _fetchVersion: currentVersion });

    try {
      const data = await islandsApi.getAll();

      // Ignore stale responses that returned after a newer request was sent.
      if (get()._fetchVersion !== currentVersion) {
        return;
      }

      const currentSelected = preferredSelectedId ?? get().selectedIslandId;
      const nextSelected =
        (currentSelected && data.islands.some((i) => i.id === currentSelected))
          ? currentSelected
          : data.islands[0]?.id || null;

      set({
        islands: data.islands,
        selectedIslandId: nextSelected
      });
    } catch (error) {
      console.error('Failed to load islands:', error);
      set({ islands: [] });
    }
  },

  selectIsland: (id: string | null) => {
    set({ selectedIslandId: id });
  },

  getSelectedIsland: () => {
    const { islands, selectedIslandId } = get();
    return islands.find(i => i.id === selectedIslandId) || null;
  },

  addLocalIsland: (name: string) => {
    const { islands } = get();
    const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date().toISOString();
    const draft: Island = {
      id: tempId,
      name,
      description: '',
      icon: undefined,
      color: undefined,
      position: islands.length,
      object_count: 0,
      created_at: now,
      updated_at: now,
    };
    set({
      islands: [draft, ...islands],
      selectedIslandId: tempId,
    });
    return tempId;
  },

  commitIsland: async (id: string, name: string) => {
    // If this is a temporary island, create it on the backend and replace the temp entry.
    if (id.startsWith('temp-')) {
      try {
        const created = await islandsApi.create({ name });
        const islands = get().islands.filter((i) => i.id !== id);
        const updatedIslands = [created, ...islands];
        set({ islands: updatedIslands, selectedIslandId: created.id });
        // Background refresh to stay in sync with backend ordering/counts.
        void get().loadIslands(created.id);
        return created;
      } catch (error) {
        console.error('Failed to commit island creation:', error);
        return null;
      }
    }

    // Otherwise, update existing.
    await get().updateIsland(id, name);
    return get().islands.find((i) => i.id === id) || null;
  },

  createIsland: async (name: string) => {
    try {
      const newIsland = await islandsApi.create({ name });
      await get().loadIslands(newIsland.id);
      set({ selectedIslandId: newIsland.id });
      return newIsland;
    } catch (error) {
      console.error('Failed to create island:', error);
      return null;
    }
  },

  updateIsland: async (id: string, name: string) => {
    try {
      // Optimistically update UI so the new name shows immediately.
      const previousIslands = get().islands;
      set({
        islands: previousIslands.map((i) => (i.id === id ? { ...i, name } : i)),
        selectedIslandId: id,
      });

      const updated = await islandsApi.update(id, { name });
      const islands = get().islands.map((i) => (i.id === id ? updated : i));
      set({ islands, selectedIslandId: id });
      // Background refresh to sync ordering/counts.
      void get().loadIslands(id);
    } catch (error) {
      console.error('Failed to update island:', error);
      // If API fails, reload to restore server truth.
      void get().loadIslands(id);
    }
  },

  deleteIsland: async (id: string) => {
    const { islands, selectedIslandId } = get();
    const previousIslands = islands;

    // Optimistically remove locally
    const newIslands = islands.filter((i) => i.id !== id);
    const nextSelected =
      selectedIslandId === id
        ? newIslands[0]?.id || null
        : newIslands.some((i) => i.id === selectedIslandId)
        ? selectedIslandId
        : newIslands[0]?.id || null;

    set({ islands: newIslands, selectedIslandId: nextSelected });

    // Skip backend call for local-only temp islands
    if (id.startsWith('temp-')) {
      return;
    }

    try {
      await islandsApi.delete(id);
    } catch (error) {
      console.error('Failed to delete island:', error);
      // Restore previous state on failure
      set({ islands: previousIslands, selectedIslandId });
    }
  },
}));

import { create } from 'zustand';
import { Space, spacesApi } from '../api/spaces';

interface SpaceStore {
  _fetchVersion: number;
  spaces: Space[];
  selectedSpaceId: string | null;
  initialized: boolean;
  isDuplicating: boolean;

  initialize: () => Promise<void>;
  loadSpaces: (_preferredSelectedId?: string | null) => Promise<void>;
  selectSpace: (_id: string | null) => void;
  getSelectedSpace: () => Space | null;
  addLocalSpace: (_name: string) => string;
  commitSpace: (_id: string, _name: string) => Promise<Space | null>;
  createSpace: (_name: string) => Promise<Space | null>;
  updateSpace: (_id: string, _name: string) => Promise<void>;
  deleteSpace: (_id: string) => Promise<void>;
  setDuplicating: (_isDuplicating: boolean) => void;
}

const STORAGE_KEY = 'focus:selectedSpaceId';

const persistSelectedSpace = (id: string | null) => {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Unable to persist selected space id', err);
  }
};

export const useSpaceStore = create<SpaceStore>((set, get) => ({
  // Track latest fetch to avoid older responses overwriting newer state (e.g., create followed by initial load).
  _fetchVersion: 0,
  spaces: [],
  selectedSpaceId: null,
  initialized: false,
  isDuplicating: false,

  initialize: async () => {
    const { initialized } = get();
    if (!initialized) {
      set({ initialized: true });
      // Try to restore the last selected space from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      await get().loadSpaces(stored || undefined);
    }
  },

  loadSpaces: async (preferredSelectedId?: string | null) => {
    const currentVersion = get()._fetchVersion + 1;
    set({ _fetchVersion: currentVersion });

    console.log('[SPACE_STORE] loadSpaces called', { preferredSelectedId, version: currentVersion });

    try {
      // Add timeout to prevent hanging during app startup if backend is unavailable
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('loadSpaces timeout - backend may be starting up')), 5000);
      });

      const data = await Promise.race([
        spacesApi.getAll(),
        timeoutPromise
      ]);
      console.log('[SPACE_STORE] Fetched spaces from API:', data.spaces.length, data.spaces);

      // Ignore stale responses that returned after a newer request was sent.
      if (get()._fetchVersion !== currentVersion) {
        console.log('[SPACE_STORE] Ignoring stale response', { currentVersion, latestVersion: get()._fetchVersion });
        return;
      }

      // If no spaces exist, create a default space on first launch
      if (data.spaces.length === 0) {
        console.log('[SPACE_STORE] No spaces found, creating default space');
        try {
          const defaultSpace = await spacesApi.create({ name: 'My Space' });
          console.log('[SPACE_STORE] Default space created:', defaultSpace);
          set({
            spaces: [defaultSpace],
            selectedSpaceId: defaultSpace.id
          });
          persistSelectedSpace(defaultSpace.id);
          return;
        } catch (error) {
          console.error('[SPACE_STORE] Failed to create default space:', error);
          set({ spaces: [] });
          return;
        }
      }

      const currentSelected = preferredSelectedId ?? get().selectedSpaceId;
      const nextSelected =
        (currentSelected && data.spaces.some((i) => i.id === currentSelected))
          ? currentSelected
          : data.spaces[0]?.id || null;

      console.log('[SPACE_STORE] Setting spaces', { count: data.spaces.length, selectedId: nextSelected });

      set({
        spaces: data.spaces,
        selectedSpaceId: nextSelected
      });
      persistSelectedSpace(nextSelected);
    } catch (error) {
      console.error('[SPACE_STORE] Failed to load spaces:', error);
      set({ spaces: [] });
    }
  },

  selectSpace: (id: string | null) => {
    set({ selectedSpaceId: id });
    persistSelectedSpace(id);
  },

  getSelectedSpace: () => {
    const { spaces, selectedSpaceId } = get();
    return spaces.find(i => i.id === selectedSpaceId) || null;
  },

  addLocalSpace: (name: string) => {
    const { spaces } = get();
    const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date().toISOString();
    const draft: Space = {
      id: tempId,
      name,
      description: '',
      icon: undefined,
      color: undefined,
      position: spaces.length,
      object_count: 0,
      created_at: now,
      updated_at: now,
    };
    set({
      spaces: [draft, ...spaces],
      selectedSpaceId: tempId,
    });
    persistSelectedSpace(tempId);
    return tempId;
  },

  commitSpace: async (id: string, name: string) => {
    // If this is a temporary space, create it on the backend and replace the temp entry.
    if (id.startsWith('temp-')) {
      try {
        const created = await spacesApi.create({ name });
        const spaces = get().spaces.filter((i) => i.id !== id);
        const updatedSpaces = [created, ...spaces];
        set({ spaces: updatedSpaces, selectedSpaceId: created.id });
        persistSelectedSpace(created.id);
        // Background refresh to stay in sync with backend ordering/counts.
        void get().loadSpaces(created.id);
        return created;
      } catch (error) {
        console.error('Failed to commit space creation:', error);
        return null;
      }
    }

    // Otherwise, update existing.
    await get().updateSpace(id, name);
    persistSelectedSpace(id);
    return get().spaces.find((i) => i.id === id) || null;
  },

  createSpace: async (name: string) => {
    console.log('[SPACE_STORE] createSpace called', { name });
    try {
      const newSpace = await spacesApi.create({ name });
      console.log('[SPACE_STORE] Space created on backend:', newSpace);
      await get().loadSpaces(newSpace.id);
      set({ selectedSpaceId: newSpace.id });
      persistSelectedSpace(newSpace.id);
      console.log('[SPACE_STORE] createSpace completed', { id: newSpace.id });
      return newSpace;
    } catch (error) {
      console.error('[SPACE_STORE] Failed to create space:', error);
      return null;
    }
  },

  updateSpace: async (id: string, name: string) => {
    try {
      // Optimistically update UI so the new name shows immediately.
      const previousSpaces = get().spaces;
      set({
        spaces: previousSpaces.map((i) => (i.id === id ? { ...i, name } : i)),
        selectedSpaceId: id,
      });
      persistSelectedSpace(id);

      const updated = await spacesApi.update(id, { name });
      const spaces = get().spaces.map((i) => (i.id === id ? updated : i));
      set({ spaces, selectedSpaceId: id });
      persistSelectedSpace(id);
      // Background refresh to sync ordering/counts.
      void get().loadSpaces(id);
    } catch (error) {
      console.error('Failed to update space:', error);
      // If API fails, reload to restore server truth.
      void get().loadSpaces(id);
    }
  },

  deleteSpace: async (id: string) => {
    const { spaces, selectedSpaceId } = get();
    const previousSpaces = spaces;

    // Optimistically remove locally
    const newSpaces = spaces.filter((i) => i.id !== id);
    const nextSelected =
      selectedSpaceId === id
        ? newSpaces[0]?.id || null
        : newSpaces.some((i) => i.id === selectedSpaceId)
        ? selectedSpaceId
        : newSpaces[0]?.id || null;

    set({ spaces: newSpaces, selectedSpaceId: nextSelected });
    persistSelectedSpace(nextSelected);

    // Skip backend call for local-only temp spaces
    if (id.startsWith('temp-')) {
      return;
    }

    try {
      await spacesApi.delete(id);
    } catch (error) {
      console.error('Failed to delete space:', error);
      // Restore previous state on failure
      set({ spaces: previousSpaces, selectedSpaceId });
    }
  },

  setDuplicating: (isDuplicating: boolean) => {
    set({ isDuplicating });
  },
}));

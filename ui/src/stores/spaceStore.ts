import { create } from 'zustand';
import { Space, spacesApi } from '@/api/spaces';

interface SpaceStore {
  _fetchVersion: number;
  spaces: Space[];
  selectedSpaceId: string | null;
  initialized: boolean;
  spacesLoaded: boolean;
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
const LOAD_RETRY_BASE_MS = 1000;
const LOAD_RETRY_MAX_MS = 8000;
const LOAD_RETRY_MAX_ATTEMPTS = 6;

let loadRetryAttempt = 0;
let loadRetryTimer: ReturnType<typeof setTimeout> | null = null;

const clearLoadRetryTimer = () => {
  if (loadRetryTimer) {
    clearTimeout(loadRetryTimer);
    loadRetryTimer = null;
  }
};

const resetLoadRetry = () => {
  clearLoadRetryTimer();
  loadRetryAttempt = 0;
};

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
  spacesLoaded: false,
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
    clearLoadRetryTimer();
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
        const minDisplayDelay = new Promise<void>(resolve => setTimeout(resolve, 3000));
        try {
          // Generate UUID on frontend for consistency
          const defaultSpaceId = crypto.randomUUID();
          const [defaultSpace] = await Promise.all([
            spacesApi.create({ id: defaultSpaceId, name: 'My Space' }),
            minDisplayDelay,
          ]);
          console.log('[SPACE_STORE] Default space created:', defaultSpace);

          // Increment fetch version to invalidate any in-flight requests
          const newVersion = get()._fetchVersion + 1;
          set({
            spaces: [defaultSpace],
            selectedSpaceId: defaultSpace.id,
            _fetchVersion: newVersion,
            spacesLoaded: true,
          });
          persistSelectedSpace(defaultSpace.id);
          resetLoadRetry();
          return;
        } catch (error) {
          console.error('[SPACE_STORE] Failed to create default space:', error);
          await minDisplayDelay;
          set({ spaces: [], spacesLoaded: true });
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
        selectedSpaceId: nextSelected,
        spacesLoaded: true,
      });
      persistSelectedSpace(nextSelected);
      resetLoadRetry();
    } catch (error) {
      console.error('[SPACE_STORE] Failed to load spaces:', error);
      if (get().spaces.length === 0) {
        set({ spaces: [] });
      }

      if (loadRetryAttempt < LOAD_RETRY_MAX_ATTEMPTS) {
        const delay = Math.min(LOAD_RETRY_BASE_MS * Math.pow(2, loadRetryAttempt), LOAD_RETRY_MAX_MS);
        loadRetryAttempt += 1;
        console.warn('[SPACE_STORE] Retrying space load', { attempt: loadRetryAttempt, delay });
        loadRetryTimer = setTimeout(() => {
          loadRetryTimer = null;
          void get().loadSpaces(preferredSelectedId ?? get().selectedSpaceId);
        }, delay);
      }
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
    // Generate a proper UUID on the frontend - same format that backend would create
    const spaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const draft: Space = {
      id: spaceId,
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
      selectedSpaceId: spaceId,
    });
    persistSelectedSpace(spaceId);
    return spaceId;
  },

  commitSpace: async (id: string, name: string) => {
    try {
      // Create space on backend with the client-provided UUID
      const created = await spacesApi.create({ id, name });

      // Increment fetch version to prevent any in-flight loadSpaces from overwriting this
      const newVersion = get()._fetchVersion + 1;
      set({
        spaces: get().spaces.map((s) => (s.id === id ? created : s)),
        selectedSpaceId: created.id,
        _fetchVersion: newVersion
      });
      persistSelectedSpace(created.id);

      // Background refresh to stay in sync with backend ordering/counts.
      setTimeout(() => {
        void get().loadSpaces(created.id);
      }, 100);
      return created;
    } catch (error) {
      console.error('Failed to commit space creation:', error);
      return null;
    }
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

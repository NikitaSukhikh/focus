import { create } from 'zustand';

interface DeletedTile {
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
  spaceId: string;
}

interface DeletedTilesStore {
  deletedTiles: DeletedTile[];
  addDeletedTile: (tile: DeletedTile) => void;
  getLastDeletedTile: () => DeletedTile | null;
  removeLastDeletedTile: () => void;
  clearHistory: () => void;
}

const MAX_DELETED_TILES = 40;

export const useDeletedTilesStore = create<DeletedTilesStore>((set, get) => ({
  deletedTiles: [],

  addDeletedTile: (tile: DeletedTile) => {
    set((state) => {
      const newDeletedTiles = [...state.deletedTiles, tile];
      // Keep only the last 40 deleted tiles
      if (newDeletedTiles.length > MAX_DELETED_TILES) {
        newDeletedTiles.shift();
      }
      return { deletedTiles: newDeletedTiles };
    });
  },

  getLastDeletedTile: () => {
    const { deletedTiles } = get();
    return deletedTiles.length > 0 ? deletedTiles[deletedTiles.length - 1] : null;
  },

  removeLastDeletedTile: () => {
    set((state) => ({
      deletedTiles: state.deletedTiles.slice(0, -1),
    }));
  },

  clearHistory: () => {
    set({ deletedTiles: [] });
  },
}));

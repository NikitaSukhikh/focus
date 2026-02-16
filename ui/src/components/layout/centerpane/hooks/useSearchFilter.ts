import { useMemo } from 'react';
import { useSearchStore } from '../../../../stores/searchStore';
import { DroppedIcon } from '../types';

export const useSearchFilter = (icons: DroppedIcon[]): DroppedIcon[] => {
  const searchQuery = useSearchStore((state) => state.searchQuery);

  return useMemo(() => {
    if (!searchQuery.trim()) return icons;

    const q = searchQuery.toLowerCase();
    return icons.filter((icon) => {
      return (
        icon.title?.toLowerCase().includes(q) ||
        icon.description?.toLowerCase().includes(q) ||
        icon.content?.toLowerCase().includes(q) ||
        icon.url?.toLowerCase().includes(q) ||
        icon.channelName?.toLowerCase().includes(q)
      );
    });
  }, [icons, searchQuery]);
};

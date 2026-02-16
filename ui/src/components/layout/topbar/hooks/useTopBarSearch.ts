import { useSearchStore } from '../../../../../stores/searchStore';

export const useTopBarSearch = () => {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const setSearchQuery = useSearchStore((state) => state.setSearchQuery);

  return {
    searchQuery,
    setSearchQuery,
  };
};

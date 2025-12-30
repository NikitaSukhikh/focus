import { useState } from 'react';

/**
 * Lightweight search state holder for the top bar.
 * Currently hidden in the UI but preserved for future implementation.
 */
export const useTopBarSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return {
    searchQuery,
    setSearchQuery,
  };
};

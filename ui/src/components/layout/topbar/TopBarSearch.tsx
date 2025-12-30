import React from 'react';
import { Search } from 'lucide-react';
import { FONT_ROLES } from '../../../styles/fontManager';

interface TopBarSearchProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

// To be implemented in the future: search menu (hidden placeholder)
export const TopBarSearch: React.FC<TopBarSearchProps> = ({ searchQuery, setSearchQuery }) => {
  return (
    <div className="relative" style={{ display: 'none' }} aria-hidden="true">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="pl-9 pr-3 py-1.5 rounded-lg focus:outline-none w-64"
        style={{
          ...FONT_ROLES.topbarControl,
          background: 'var(--glass-bg)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-subtle)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary-color)';
          e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
};

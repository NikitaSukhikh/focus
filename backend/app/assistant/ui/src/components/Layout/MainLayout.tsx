// Main application layout wrapper.

import React from 'react';
import { TitleBar } from './TitleBar';

type Props = {
  children: React.ReactNode;
  onLinkGoogle?: () => void;
  onAuthChange?: (isAuthenticated: boolean) => void;
  onOpenSettings?: () => void;
};

export function MainLayout({ children, onLinkGoogle, onAuthChange, onOpenSettings }: Props) {
  return (
    <div className="flex flex-col h-screen">
      <TitleBar onLinkGoogle={onLinkGoogle} onAuthChange={onAuthChange} onOpenSettings={onOpenSettings} />
      <div className="flex-1 overflow-hidden pt-20">{children}</div>
    </div>
  );
}

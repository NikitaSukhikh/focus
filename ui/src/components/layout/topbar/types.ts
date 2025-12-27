import { CenterPaneHandle } from '../centerpane/types';

export interface TopBarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onTogglePreview: () => void;
  isPreviewOpen: boolean;
  onToggleConversation: () => void;
  isConversationOpen: boolean;
  sidebarWidth: number;
  centerPaneRef: React.RefObject<CenterPaneHandle>;
  onToggleGrid: () => void;
  isGridMode: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
}

export interface TopBarHandle {
  // Empty - TopBar no longer exposes methods
}

export interface SavedLink {
  id: string;
  url: string;
  title: string;
  name: string;
  description?: string;
  favicon_url?: string;
  account_email?: string;
}

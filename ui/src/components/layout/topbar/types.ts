import { CenterPaneHandle } from '@/components/layout/centerpane/types';
import { TagColor } from '@/components/layout/topbar/tags';
import { SpaceShareFilters } from '@/components/dialogs/share/types';

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
  onOpenQuickAdd: (position?: { x: number; y: number }) => void;
  onViewTutorial: () => void;
  onOpenSpaceShareDialog?: (_filters: SpaceShareFilters) => void;
  onTagsClick?: () => void;
  isTagsOpen?: boolean;
  onTagSelect?: (color: TagColor) => void;
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
  defaultTitle?: string;
  defaultDescription?: string;
  customTitle?: string | null;
  customDescription?: string | null;
  favicon_url?: string;
  account_email?: string;
}

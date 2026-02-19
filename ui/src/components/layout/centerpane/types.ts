import type React from 'react';
import { TagColor } from '@/types/tags';

export type IconKind =
  | 'link'
  | 'file'
  | 'gmail'
  | 'google_drive'
  | 'google_sheets'
  | 'google_docs'
  | 'google_slides'
  | 'text'
  | 'telegram'
  | 'intstorage'
  | 'web_article'
  | 'unknown';

export type FocusRingEdge = 'top' | 'right' | 'bottom' | 'left';

export interface ArrowAnchorRef {
  tileId: string;
  edge: FocusRingEdge;
  edgeIndex: number;
}

export interface ArrowSegment {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  startAnchor?: ArrowAnchorRef;
  endAnchor?: ArrowAnchorRef;
}

export interface DroppedIcon {
  renderKey?: string; // Stable UI key to avoid remounts when optimistic IDs are replaced by server IDs
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  width?: number;  // Custom box width in canvas units (persisted)
  height?: number; // Custom box height in canvas units (persisted)
  tag?: TagColor | '';
  serviceKey?: string; // To track specific Google services like 'sheets', 'docs', 'slides'
  url?: string; // For link objects
  description?: string; // For all objects
  channelName?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  customTitle?: string | null;
  customDescription?: string | null;
  faviconUrl?: string;
  service?: string;
  filePath?: string; // For file objects - path to original file
  content?: string; // For text type objects - stores note content
  gmailEmail?: string; // For Gmail links - email subject to show on tile when logged in
}

export interface PreviewTarget {
  url?: string;
  title?: string;
  tileId?: string;
  filePath?: string;
  type?: IconKind;
  content?: string; // Text content (notes) or cached preview payloads
  gmailEmail?: string; // For Gmail links when logged in
}

export interface CenterPaneProps {
  onObjectClick?: (_target: PreviewTarget) => void;
  onSuppressPreview?: () => void;
  onCanvasEmptyClick?: () => void;
  showGrid?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onOpenQuickAdd?: (position?: { x: number; y: number }) => void;
}

export interface CenterPaneHandle {
  addFiles: (position?: { x: number; y: number }) => Promise<void>;
  getTilesForSpace: (spaceId: string) => DroppedIcon[];
  openAddLinkDialog: (position?: { x: number; y: number }) => void;
  openAddWebArticleDialog: (position?: { x: number; y: number }) => void;
  pasteFromClipboard: (position?: { x: number; y: number }) => Promise<void>;
}

export interface TileProps {
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  width?: number;  // Custom box width in canvas units
  height?: number; // Custom box height in canvas units
  zoom?: number;   // Canvas zoom level (needed for resize delta math)
  url?: string;
  description?: string;
  channelName?: string;
  faviconUrl?: string;
  filePath?: string;
  content?: string;
  tag?: TagColor | '';
  isSelected?: boolean;
  onClick?: (_event: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  onPositionChange?: (_x: number, _y: number) => void;
  onDelete?: () => void;
  onRefreshMetadata?: () => void;
  onEdit?: (_x: number, _y: number, _content: string, _id: string) => void;
  onEditLink?: () => void;
  onSizeChange?: (_tileId: string, _x: number, _y: number, _width: number, _height: number) => void;
  onResizeInteractionStart?: () => void;
  onResizeInteractionEnd?: (_didResize: boolean) => void;
  onFocusRingPointerDown?: (_event: React.PointerEvent<HTMLElement | SVGElement>, _tileId: string) => void;
  suppressFocusRingGhostArrow?: boolean;
  onMetricsChange?: (
    _tileId: string,
    _metrics: {
      width: number;
      height: number;
      contentInset: number;
      isCentered: boolean;
    }
  ) => void;
}

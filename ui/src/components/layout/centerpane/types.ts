import type React from 'react';
import { TagColor } from '../../types/tags';

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
  | 'unknown';

export interface ArrowSegment {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

export interface DroppedIcon {
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  tag?: TagColor | '';
  serviceKey?: string; // To track specific Google services like 'sheets', 'docs', 'slides'
  url?: string; // For link objects
  description?: string; // For all objects
  defaultTitle?: string;
  defaultDescription?: string;
  customTitle?: string | null;
  customDescription?: string | null;
  faviconUrl?: string;
  service?: string;
  filePath?: string; // For file objects - path to original file
  content?: string; // For text type objects - stores note content
}

export interface PreviewTarget {
  url?: string;
  title?: string;
  tileId?: string;
  filePath?: string;
  type?: IconKind;
  content?: string; // Text content (notes) or cached preview payloads
}

export interface CenterPaneProps {
  onObjectClick?: (_target: PreviewTarget) => void;
  onCanvasEmptyClick?: () => void;
  showGrid?: boolean;
  zoom?: number;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onOpenQuickAdd?: () => void;
}

export interface CenterPaneHandle {
  addFiles: () => Promise<void>;
  getTilesForSpace: (spaceId: string) => DroppedIcon[];
  openAddLinkDialog: () => void;
}

export interface TileProps {
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  url?: string;
  description?: string;
  faviconUrl?: string;
  filePath?: string;
  content?: string;
  tag?: TagColor | '';
  isSelected?: boolean;
  onClick?: (event: React.MouseEvent) => void;
  onPositionChange?: (_x: number, _y: number) => void;
  onDelete?: () => void;
  onRename?: (_newTitle: string) => void;
  onOpenLinkEdit?: () => void;
  onRefreshMetadata?: () => void;
  onEdit?: (_x: number, _y: number, _content: string, _id: string) => void;
}

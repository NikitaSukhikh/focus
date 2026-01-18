import React from 'react';
import { Trash2, Copy, RefreshCw, ExternalLink, Share2, Maximize2 } from 'lucide-react';
import { Z_INDEX } from '../../../../constants/zIndex';

interface TileContextMenuProps {
  show: boolean;
  position: { x: number; y: number };
  type: string;
  hasFileOrUrl: boolean;
  hasContent: boolean;
  url?: string;
  onClose: () => void;
  onOpenFullWindow: () => void;
  onShare: () => void;
  onCopyPath: () => void;
  onOpenExternal: () => void;
  onRefreshMetadata: () => void;
  onDelete: () => void;
}

// TileContextMenu renders the right-click menu for a tile, exposing preview, share, open, and delete actions.
export function TileContextMenu({
  show,
  position,
  type,
  hasFileOrUrl,
  hasContent,
  url,
  onClose,
  onOpenFullWindow,
  onShare,
  onCopyPath,
  onOpenExternal,
  onRefreshMetadata,
  onDelete,
}: TileContextMenuProps) {
  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
        style={{
          zIndex: Z_INDEX.CONTEXT_MENU,
          left: `${position.x}px`,
          top: `${position.y}px`
        }}
      >
        {(hasFileOrUrl || hasContent) && (
          <button
            onClick={onOpenFullWindow}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Maximize2 size={16} />
            Open in full window
          </button>
        )}
        {hasFileOrUrl && (
          <button
            onClick={onShare}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Share2 size={16} />
            Share
          </button>
        )}
        {hasFileOrUrl && (
          <button
            onClick={onCopyPath}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <Copy size={14} />
            Copy path/URL
          </button>
        )}
        {type === 'link' && url && (
          <button
            onClick={onOpenExternal}
            title="Open in External Browser"
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <ExternalLink size={18} />
            Open in external browser
          </button>
        )}
        {type === 'link' && url && (
          <button
            onClick={onRefreshMetadata}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        )}
        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </>
  );
}

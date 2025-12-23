import React from 'react';
import { X, Search } from 'lucide-react';

interface PreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onResizeStart: React.MouseEventHandler<HTMLDivElement>;
}

export function PreviewPane({ isOpen, onClose, width, onResizeStart }: PreviewPaneProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
        onMouseDown={onResizeStart}
      />

      <aside className="bg-white border-l border-slate-200 flex flex-col h-full" style={{ width: `${width}px` }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-blue-600" />
          <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          title="Close preview"
        >
          <X size={18} />
        </button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto custom-scroll p-4">
        <div className="text-sm text-slate-500">No preview available.</div>
      </div>
    </aside>
    </>
  );
}

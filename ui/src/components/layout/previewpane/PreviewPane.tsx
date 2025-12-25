import React from 'react';
import { X } from 'lucide-react';

interface PreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreviewPane({ isOpen, onClose }: PreviewPaneProps) {
  if (!isOpen) return null;

  return (
    <aside className="flex-1 min-w-0 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
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
  );
}

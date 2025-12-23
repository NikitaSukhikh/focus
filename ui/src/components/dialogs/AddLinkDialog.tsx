import React, { useState, useEffect, useRef } from 'react';
import { X, Link2, ExternalLink } from 'lucide-react';

interface AddLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, title: string, description: string) => void;
}

export function AddLinkDialog({ isOpen, onClose, onAdd }: AddLinkDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setTitle('');
      setDescription('');
      setIsValidUrl(true);
    }
  }, [isOpen]);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) return true; // Empty is valid (not yet filled)
    try {
      const urlObj = new URL(value);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setIsValidUrl(validateUrl(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedUrl = url.trim();
    if (!trimmedUrl || !isValidUrl) return;

    const trimmedTitle = title.trim() || trimmedUrl;
    const trimmedDescription = description.trim();

    onAdd(trimmedUrl, trimmedTitle, trimmedDescription);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Link2 size={20} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Add Link</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* URL Input */}
            <div>
              <label htmlFor="link-url" className="block text-sm font-medium text-slate-700 mb-1.5">
                URL *
              </label>
              <div className="relative">
                <input
                  ref={urlInputRef}
                  id="link-url"
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    !isValidUrl
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  required
                />
                {url && isValidUrl && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ExternalLink size={16} className="text-slate-400" />
                  </div>
                )}
              </div>
              {!isValidUrl && (
                <p className="mt-1 text-xs text-red-600">
                  Please enter a valid URL (http:// or https://)
                </p>
              )}
            </div>

            {/* Title Input */}
            <div>
              <label htmlFor="link-title" className="block text-sm font-medium text-slate-700 mb-1.5">
                Title
              </label>
              <input
                id="link-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional - defaults to URL"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="link-description" className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                id="link-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional short description"
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors resize-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!url.trim() || !isValidUrl}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Link
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

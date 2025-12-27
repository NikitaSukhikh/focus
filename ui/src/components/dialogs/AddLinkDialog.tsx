import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Link2, ExternalLink, Loader2 } from 'lucide-react';
import { Z_INDEX } from '../../constants/zIndex';
import { isLikelyHttpUrl, normalizeUrl, validateUrlOnSubmit } from '../../utils/url';

interface AddLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (_url: string, _title: string, _description: string) => void;
}

export function AddLinkDialog({ isOpen, onClose, onAdd }: AddLinkDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
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

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setIsValidUrl(isLikelyHttpUrl(value, { allowEmpty: true }));
  };

  const fetchMetadata = async (urlToFetch: string) => {
    setIsFetchingMetadata(true);
    try {
      const params = new URLSearchParams({ url: urlToFetch });
      const response = await fetch(`/api/metadata/url?${params.toString()}`);
      if (response.ok) {
        const metadata = await response.json();
        console.log('[ADD LINK] Fetched metadata:', metadata);

        // Auto-populate title if not already set
        if (!title && (metadata.title || metadata.og_title)) {
          setTitle(metadata.title || metadata.og_title || '');
        }

        // Auto-populate description if not already set
        if (!description && (metadata.description || metadata.og_description)) {
          setDescription(metadata.description || metadata.og_description || '');
        }

      }
    } catch (err) {
      console.error('[ADD LINK] Failed to fetch metadata:', err);
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  const handleUrlBlur = () => {
    if (url.trim()) {
      const normalized = normalizeUrl(url);
      setUrl(normalized);
      setIsValidUrl(isLikelyHttpUrl(normalized, { allowEmpty: true }));

      // Fetch metadata after normalizing URL
      if (isLikelyHttpUrl(normalized, { allowEmpty: false })) {
        fetchMetadata(normalized);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { normalizedUrl, isValid } = validateUrlOnSubmit(url);
    setUrl(normalizedUrl);
    setIsValidUrl(isValid);

    if (!isValid) return;

    // Normalize URL before submitting
    const trimmedTitle = title.trim() || normalizedUrl;
    const trimmedDescription = description.trim();

    onAdd(normalizedUrl, trimmedTitle, trimmedDescription);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const showHttpsPrefix = !/^https?:\/\//i.test(url);

  const dialogContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{
          zIndex: Z_INDEX.MODAL_DIALOG,
        }}
      >
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
                  onBlur={handleUrlBlur}
                  placeholder="example.com"
                  className={`w-full py-2 ${showHttpsPrefix ? 'pl-20 pr-3' : 'px-3'} border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    !isValidUrl
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                  required
                />
                {showHttpsPrefix && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 select-none pointer-events-none">
                    https://
                  </span>
                )}
                {isFetchingMetadata ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={16} className="text-blue-500 animate-spin" />
                  </div>
                ) : url && isValidUrl ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ExternalLink size={16} className="text-slate-400" />
                  </div>
                ) : null}
              </div>
              {!isValidUrl && (
                <p className="mt-1 text-xs text-red-600">
                  Please enter a valid URL
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

  return ReactDOM.createPortal(dialogContent, document.body);
}

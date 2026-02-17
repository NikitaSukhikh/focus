import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, BookOpen, Loader2, ExternalLink } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';
import { isLikelyHttpUrl, normalizeUrl, validateUrlOnSubmit } from '@/utils/url';
import { truncateLinkTitle } from '@/utils/text';
import { API_BASE } from '@/config/api';

interface AddWebArticleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (_url: string, _title: string) => void;
  submitLabel?: string;
  initialValues?: { id?: string; url?: string; title?: string };
}

export function AddWebArticleDialog({
  isOpen,
  onClose,
  onAdd,
  submitLabel = 'Add Web Article',
  initialValues,
}: AddWebArticleDialogProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && urlInputRef.current) urlInputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
      setTitle('');
      setIsValidUrl(true);
      return;
    }
    if (initialValues) {
      setUrl(initialValues.url || '');
      setTitle(initialValues.title || '');
      setIsValidUrl(isLikelyHttpUrl(initialValues.url || '', { allowEmpty: true }));
    } else {
      setUrl('');
      setTitle('');
      setIsValidUrl(true);
    }
  }, [isOpen, initialValues?.id, initialValues?.url, initialValues?.title]); // eslint-disable-line react-hooks/exhaustive-deps -- individual properties tracked to avoid object reference churn

  const fetchTitle = async (targetUrl: string) => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams({ url: targetUrl });
      const resp = await fetch(`${API_BASE}/metadata/url?${params}`);
      if (resp.ok) {
        const meta = await resp.json();
        const fetched = truncateLinkTitle(meta.title || meta.og_title || '');
        if (fetched) setTitle((prev) => prev || fetched);
      }
    } catch {
      // ignore
    } finally {
      setIsFetching(false);
    }
  };

  const handleUrlBlur = () => {
    if (!url.trim()) return;
    const normalized = normalizeUrl(url);
    setUrl(normalized);
    setIsValidUrl(isLikelyHttpUrl(normalized, { allowEmpty: true }));
    if (isLikelyHttpUrl(normalized, { allowEmpty: false }) && !title) {
      fetchTitle(normalized);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { normalizedUrl, isValid } = validateUrlOnSubmit(url);
    setUrl(normalizedUrl);
    setIsValidUrl(isValid);
    if (!isValid) return;
    const safeTitle = title.trim() || truncateLinkTitle(normalizedUrl);
    onAdd(normalizedUrl, safeTitle);
    onClose();
  };

  if (!isOpen) return null;

  const showHttpsPrefix = !/^https?:\/\//i.test(url);

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={onClose}
      />
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.MODAL_DIALOG }}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Add Web Article</h2>
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
            <div>
              <label htmlFor="article-url" className="block text-sm font-medium text-slate-700 mb-1.5">
                URL *
              </label>
              <div className="relative">
                <input
                  ref={urlInputRef}
                  id="article-url"
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setIsValidUrl(isLikelyHttpUrl(e.target.value, { allowEmpty: true }));
                  }}
                  onBlur={handleUrlBlur}
                  placeholder="example.com/article"
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
                {isFetching ? (
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
                <p className="mt-1 text-xs text-red-600">Please enter a valid URL</p>
              )}
            </div>

            <div>
              <label htmlFor="article-title" className="block text-sm font-medium text-slate-700 mb-1.5">
                Title
              </label>
              <input
                id="article-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional — auto-detected from URL"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              />
            </div>

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
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}

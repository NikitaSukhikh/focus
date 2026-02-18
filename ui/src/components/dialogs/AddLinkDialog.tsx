import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Link2, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Z_INDEX } from '@/constants/zIndex';
import { isLikelyHttpUrl, normalizeUrl, validateUrlOnSubmit } from '@/utils/url';
import { truncateLinkTitle } from '@/utils/text';
import { API_BASE } from '@/config/api';

interface AddLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    _url: string,
    _defaultTitle: string,
    _defaultDescription: string,
    _customTitle?: string,
    _customDescription?: string
  ) => void;
  submitLabel?: string;
  initialValues?: {
    id?: string;
    url?: string;
    defaultTitle?: string;
    defaultDescription?: string;
    customTitle?: string | null;
    customDescription?: string | null;
  };
}

export function AddLinkDialog({ isOpen, onClose, onAdd, submitLabel, initialValues }: AddLinkDialogProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');
  const [defaultTitle, setDefaultTitle] = useState('');
  const [defaultDescription, setDefaultDescription] = useState('');
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState<string | null>(null);
  const initialCustomTitleRef = useRef<string | null>(null);
  const initialCustomDescriptionRef = useRef<string | null>(null);
  const [hasEditedTitle, setHasEditedTitle] = useState(false);
  const [hasEditedDescription, setHasEditedDescription] = useState(false);
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
      setDefaultTitle('');
      setDefaultDescription('');
      setCustomTitle(null);
      setCustomDescription(null);
      initialCustomTitleRef.current = null;
      initialCustomDescriptionRef.current = null;
      setHasEditedTitle(false);
      setHasEditedDescription(false);
      setIsValidUrl(true);
    } else if (initialValues) {
      const nextUrl = initialValues.url || '';
      setUrl(nextUrl);
      setDefaultTitle(initialValues.defaultTitle || '');
      setDefaultDescription(initialValues.defaultDescription ?? '');
      setCustomTitle(initialValues.customTitle ?? null);
      setCustomDescription(initialValues.customDescription ?? null);
      initialCustomTitleRef.current = initialValues.customTitle ?? null;
      initialCustomDescriptionRef.current = initialValues.customDescription ?? null;
      setHasEditedTitle(false);
      setHasEditedDescription(false);
      setIsValidUrl(isLikelyHttpUrl(nextUrl, { allowEmpty: true }));
    } else {
      // Opening fresh add link dialog with no initial values; ensure fields are blank
      setUrl('');
      setDefaultTitle('');
      setDefaultDescription('');
      setCustomTitle(null);
      setCustomDescription(null);
      initialCustomTitleRef.current = null;
      initialCustomDescriptionRef.current = null;
      setHasEditedTitle(false);
      setHasEditedDescription(false);
      setIsValidUrl(true);
    }
  }, [isOpen, initialValues]);

  // Keep form fields in sync if initialValues change while dialog is open (e.g., updates from elsewhere)
  useEffect(() => {
    if (!isOpen || !initialValues) return;
    const nextUrl = initialValues.url || '';
    setUrl(nextUrl);
    setDefaultTitle(initialValues.defaultTitle || '');
    setDefaultDescription(initialValues.defaultDescription ?? '');
    setCustomTitle(initialValues.customTitle ?? null);
    setCustomDescription(initialValues.customDescription ?? null);
    initialCustomTitleRef.current = initialValues.customTitle ?? null;
    initialCustomDescriptionRef.current = initialValues.customDescription ?? null;
    setHasEditedTitle(false);
    setHasEditedDescription(false);
    setIsValidUrl(isLikelyHttpUrl(nextUrl, { allowEmpty: true }));
  }, [initialValues, isOpen]);

  // Live sync if the underlying link is updated elsewhere while dialog is open
  useEffect(() => {
    if (!isOpen || !initialValues?.id) return;
    const handleLinkUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{
        linkId: string;
        url?: string;
        defaultTitle?: string;
        defaultDescription?: string;
        customTitle?: string | null;
        customDescription?: string | null;
        title?: string;
        description?: string;
      }>;
      const {
        linkId,
        url: nextUrl,
        defaultTitle: nextDefaultTitle,
        defaultDescription: nextDefaultDescription,
        customTitle: nextCustomTitle,
        customDescription: nextCustomDescription,
        title,
        description,
      } = customEvent.detail;
      if (linkId !== initialValues.id) return;
      const resolvedUrl = nextUrl ?? url;
      setUrl(resolvedUrl);
      setDefaultTitle(nextDefaultTitle ?? defaultTitle ?? title ?? '');
      setDefaultDescription(nextDefaultDescription ?? defaultDescription ?? description ?? '');
      setCustomTitle(nextCustomTitle ?? customTitle ?? null);
      setCustomDescription(nextCustomDescription ?? customDescription ?? null);
    };
    window.addEventListener('link:updated', handleLinkUpdated);
    return () => window.removeEventListener('link:updated', handleLinkUpdated);
    // include local state setters in deps implicitly fine
  }, [isOpen, initialValues?.id, url, defaultTitle, defaultDescription, customTitle, customDescription]);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setIsValidUrl(isLikelyHttpUrl(value, { allowEmpty: true }));
  };

  const fetchMetadata = async (urlToFetch: string) => {
    setIsFetchingMetadata(true);
    try {
      const params = new URLSearchParams({ url: urlToFetch });
      const response = await fetch(`${API_BASE}/metadata/url?${params.toString()}`);
      if (response.ok) {
        const metadata = await response.json();
        console.log('[ADD LINK] Fetched metadata:', metadata);

        const incomingTitle = truncateLinkTitle(metadata.title || metadata.og_title || '');
        const incomingDescription = metadata.description || metadata.og_description || '';

        if (incomingTitle) {
          setDefaultTitle(incomingTitle);
          if (!hasEditedTitle) {
            setCustomTitle(null);
          }
        }
        if (incomingDescription) {
          setDefaultDescription(incomingDescription);
          if (!hasEditedDescription) {
            setCustomDescription(incomingDescription);
          }
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

      if (!defaultTitle && normalized) {
        const fallback = truncateLinkTitle(normalized);
        setDefaultTitle(fallback);
        if (!hasEditedTitle) {
          setCustomTitle(null);
        }
      }

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

    const trimmedCustomTitle = customTitle?.trim() ?? '';
    const customTitleTooShort = trimmedCustomTitle.length === 1;
    if (customTitleTooShort) return;

    if (!isValid) return;

    const safeDefaultTitle = truncateLinkTitle(
      (defaultTitle || truncateLinkTitle(normalizedUrl) || '').trim()
    );
    const trimmedCustomDescription = customDescription?.trim() ?? '';
    const safeCustomTitle =
      trimmedCustomTitle.length > 1 ? truncateLinkTitle(trimmedCustomTitle) : undefined;
    const safeDefaultDescription = defaultDescription?.trim() ?? '';
    const safeCustomDescription =
      trimmedCustomDescription && trimmedCustomDescription !== safeDefaultDescription
        ? trimmedCustomDescription
        : undefined;
    const customTitlePayload = trimmedCustomTitle.length === 0 ? undefined : safeCustomTitle;
    const customDescriptionPayload =
      trimmedCustomDescription.length === 0 ? undefined : safeCustomDescription;

    onAdd(
      normalizedUrl,
      safeDefaultTitle || truncateLinkTitle(normalizedUrl),
      safeDefaultDescription,
      customTitlePayload,
      customDescriptionPayload
    );
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const showHttpsPrefix = !/^https?:\/\//i.test(url);
  const titleValue = (customTitle ?? defaultTitle ?? '');
  const descriptionValue = (customDescription ?? defaultDescription ?? '');
  const customTitleTooShort =
    customTitle !== null && customTitle.trim().length > 0 && customTitle.trim().length < 2;

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
              <h2 className="text-lg font-semibold text-slate-900">{t('addLinkDialog.title')}</h2>
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
                {t('addLinkDialog.urlLabel')}
              </label>
              <div className="relative">
                <input
                  ref={urlInputRef}
                  id="link-url"
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder={t('addLinkDialog.urlPlaceholder')}
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
                  {t('addLinkDialog.invalidUrl')}
                </p>
              )}
            </div>

            {/* Title Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="link-title" className="block text-sm font-medium text-slate-700">
                  {t('addLinkDialog.titleLabel')}
                </label>
                {defaultTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomTitle(null);
                      setHasEditedTitle(false);
                    }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {t('addLinkDialog.useDefaultName')}
                  </button>
                )}
              </div>
              <input
                id="link-title"
                type="text"
                value={titleValue}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  setHasEditedTitle(true);
                }}
                placeholder={t('addLinkDialog.titlePlaceholder')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors ${customTitleTooShort ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300'}`}
              />
              {customTitleTooShort && (
                <p className="mt-1 text-xs text-red-600">
                  {t('addLinkDialog.customNameTooShort')}
                </p>
              )}
            </div>

            {/* Description Input */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="link-description" className="block text-sm font-medium text-slate-700">
                    {t('addLinkDialog.descriptionLabel')}
                  </label>
                {(defaultDescription !== null && defaultDescription !== undefined) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomDescription(null);
                      setHasEditedDescription(false);
                      }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {t('addLinkDialog.useDefaultDescription')}
                    </button>
                  )}
                </div>
                <textarea
                  id="link-description"
                  value={descriptionValue}
                onChange={(e) => {
                  setCustomDescription(e.target.value);
                  setHasEditedDescription(true);
                }}
                placeholder={t('addLinkDialog.descriptionPlaceholder')}
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
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={!url.trim() || !isValidUrl || customTitleTooShort}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLabel ?? t('addLinkDialog.title')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(dialogContent, document.body);
}

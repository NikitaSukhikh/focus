import { useState, useEffect, useCallback } from 'react';

interface DocumentPreviewState {
  documentError: string | null;
  documentLoading: boolean;
  handleDocumentLoad: () => void;
  handleDocumentError: () => Promise<void>;
}

// useDocumentPreview tracks iframe loading/error state for document files and exposes callbacks consumed by the preview component.
export function useDocumentPreview(
  isDocumentFile: boolean,
  documentPreviewUrl: string | null,
  loadingTimeoutMs?: number
): DocumentPreviewState {
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);

  // Reset document error state when preview changes
  useEffect(() => {
    setDocumentError(null);
    setDocumentLoading(!!isDocumentFile);
    if (isDocumentFile && loadingTimeoutMs) {
      const timer = setTimeout(() => {
        setDocumentLoading(false);
      }, loadingTimeoutMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [documentPreviewUrl, isDocumentFile, loadingTimeoutMs]);

  const handleDocumentLoad = useCallback(() => {
    setDocumentLoading(false);
    setDocumentError(null);
  }, []);

  const handleDocumentError = useCallback(async () => {
    setDocumentLoading(false);
    if (documentPreviewUrl) {
      try {
        const response = await fetch(documentPreviewUrl);
        if (!response.ok) {
          const errorText = await response.text();
          setDocumentError(errorText || 'Failed to load document preview');
        } else {
          setDocumentError('Failed to render document preview');
        }
      } catch (err) {
        setDocumentError('Failed to load document preview');
      }
    }
  }, [documentPreviewUrl]);

  return {
    documentError,
    documentLoading,
    handleDocumentLoad,
    handleDocumentError,
  };
}

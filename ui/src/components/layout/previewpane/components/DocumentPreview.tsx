import { Z_INDEX } from '../../../../constants/zIndex';
import { FONT_ROLES } from '../../../../styles/fontManager';

interface DocumentPreviewProps {
  documentPreviewUrl: string;
  title?: string;
  filePath?: string;
  documentLoading: boolean;
  documentError: string | null;
  onLoad: () => void;
  onError: () => Promise<void>;
  loadingLabel?: string;
  errorTitle?: string;
  errorDescription?: string;
  errorHint?: string;
  showErrorDetail?: boolean;
}

// DocumentPreview renders office-style documents in an iframe with loading/error overlays, used when a dropped file resolves to a document type.
export function DocumentPreview({
  documentPreviewUrl,
  title,
  filePath,
  documentLoading,
  documentError,
  onLoad,
  onError,
  loadingLabel,
  errorTitle,
  errorDescription,
  errorHint,
  showErrorDetail = false,
}: DocumentPreviewProps) {
  const loadingText = loadingLabel || 'Loading document...';
  const errorTitleText = errorTitle || 'Cannot Preview Document';
  const errorDescriptionText = errorDescription
    || 'This file is too complex or large to preview. It may include embedded media, external data, or formatting that cannot be rendered here.';
  const errorHintText = errorHint
    || 'Open the file in its native app or try a simpler document.';

  return (
    <div className="flex-1 w-full relative">
      {!documentError && (
        <iframe
          src={documentPreviewUrl}
          title={title || 'Document preview'}
          className="w-full h-full border-0"
          style={{ overflow: 'auto' }}
          onLoad={onLoad}
          onError={onError}
          onContextMenu={(e) => {
            // Allow default context menu behavior
            e.stopPropagation();
          }}
        />
      )}
      {documentLoading && !documentError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
          <div style={{ ...FONT_ROLES.paneBody, color: 'var(--color-text-muted)' }}>{loadingText}</div>
        </div>
      )}
      {documentError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
          <div className="text-red-600" style={FONT_ROLES.paneBody}>{errorTitleText}</div>
          <div className="text-slate-600 max-w-md text-center px-4" style={FONT_ROLES.paneBodyMuted}>
            {errorDescriptionText}
          </div>
          <div className="text-slate-500 max-w-md text-center px-4 text-sm mt-2" style={FONT_ROLES.paneBodyMuted}>
            {errorHintText}
          </div>
          {showErrorDetail && (
            <div className="text-slate-500 max-w-md text-center px-4 text-xs mt-2" style={FONT_ROLES.paneBodyMuted}>
              {documentError}
            </div>
          )}
          <div className="text-slate-400 max-w-md text-center break-all px-4 text-xs mt-4" style={FONT_ROLES.paneBodyMuted}>
            {filePath}
          </div>
        </div>
      )}
    </div>
  );
}

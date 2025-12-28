/* eslint-disable react/no-unknown-property */
import { Z_INDEX } from '../../../../constants/zIndex';
import { FONT_ROLES } from '../../../../styles/fontManager';

interface WebviewPreviewProps {
  webviewRef: React.RefObject<HTMLWebViewElement | null>;
  url?: string;
  hasNonWebviewPreview: boolean;
  loadError: string | null;
  onRetry: () => void;
}

// WebviewPreview hosts the embedded electron webview and shows a retry overlay when URL loads fail.
export function WebviewPreview({ webviewRef, url, hasNonWebviewPreview, loadError, onRetry }: WebviewPreviewProps) {
  return (
    <>
      <webview
        ref={webviewRef}
        src="about:blank"
        partition="persist:ocean-webview"
        allowpopups={true as any}
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: hasNonWebviewPreview ? 'none' : 'flex',
          visibility: url ? 'visible' : 'hidden'
        }}
      />
      {url && loadError && !hasNonWebviewPreview && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white" style={{ zIndex: Z_INDEX.CONTENT_PREVIEW }}>
          <div className="text-red-600" style={FONT_ROLES.paneBody}>{loadError}</div>
          <div className="text-slate-400 max-w-md text-center break-all" style={FONT_ROLES.paneBodyMuted}>
            {url}
          </div>
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            style={FONT_ROLES.paneBody}
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
}

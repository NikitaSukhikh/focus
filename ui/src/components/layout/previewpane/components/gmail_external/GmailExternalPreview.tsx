/**
 * Gmail External Preview Component
 *
 * Purpose: Display Gmail links with "Open in External Browser" functionality
 * Responsibilities:
 * - Show Gmail metadata (title, email subject if available)
 * - Provide button to open Gmail in default browser
 * - Display login status when gmailEmail is available
 * - Avoid webview embedding issues by using external browser
 *
 * Note: This is a temporary solution. Future implementation will use OAuth
 * and Gmail API (to be placed in gmail_oauth folder).
 */

import { openExternalUrl, openExternalWindow } from '@/platform';
import { FONT_ROLES } from '@/styles/fontManager';
import { GmailIcon } from '@/components/icons/GoogleServiceIcons';

interface GmailExternalPreviewProps {
  url?: string;
  title?: string;
  gmailEmail?: string; // Email subject/snippet when available
}

export function GmailExternalPreview({ url, title: _title, gmailEmail }: GmailExternalPreviewProps) {
  const handleOpenInBrowser = async () => {
    if (url) {
      try {
        await openExternalWindow(url, { title: 'Gmail' });
      } catch (error) {
        console.error('[GmailExternalPreview] Failed to open external window, fallback to OS browser', error);
        await openExternalUrl(url);
      }
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-white article-scroll">
      <div className="p-8 max-w-2xl mx-auto">
        {/* Gmail Icon */}
        <div className="mb-6 flex items-center gap-3">
          <GmailIcon size={56} />
          <h1
            className="text-3xl font-bold text-gray-800"
            style={{ ...FONT_ROLES.paneTitle, fontSize: '28px' }}
          >
            Gmail
          </h1>
        </div>

        {/* Email Snippet (if available) */}
        {gmailEmail && (
          <div className="mb-6">
            <div className="text-lg text-gray-700" style={FONT_ROLES.paneBody}>
              {gmailEmail}
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <div className="text-sm text-blue-700">
                Gmail requires authentication in external window. Click the button below to view your Gmail.
              </div>
            </div>
          </div>
        </div>

        {/* Open in Browser Button */}
        <button
          onClick={() => {
            void handleOpenInBrowser();
          }}
          disabled={!url}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
          style={{ ...FONT_ROLES.paneBody, fontSize: '16px', fontWeight: 600 }}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span>Open in External Window</span>
          </div>
        </button>

        {/* Future OAuth Notice */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-400 text-center">
            Future versions will support viewing Gmail directly in Focus using OAuth authentication.
          </div>
        </div>
      </div>
    </div>
  );
}

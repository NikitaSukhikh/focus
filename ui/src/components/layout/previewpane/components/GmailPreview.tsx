import { FONT_ROLES } from '../../../../styles/fontManager';
import { openExternalUrl } from '../../../../platform';

interface GmailPreviewProps {
  url?: string;
  title?: string;
  gmailEmail?: string; // Email subject when logged in
}

// GmailPreview shows Gmail link with email subject (if logged in) or login prompt
export function GmailPreview({ url, title, gmailEmail }: GmailPreviewProps) {
  const handleOpenInGmail = () => {
    if (url) {
      openExternalUrl(url);
    }
  };

  const isLoggedIn = !!gmailEmail;

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-8">
        {/* Gmail Title */}
        <h1
          className="text-3xl font-bold mb-4"
          style={{ ...FONT_ROLES.paneTitle, fontSize: '28px' }}
        >
          {title || 'Gmail'}
        </h1>

        {/* Login Status */}
        {isLoggedIn ? (
          <div className="mb-6">
            <div className="text-sm font-semibold text-gray-600 mb-2">Current Email:</div>
            <div className="text-lg text-gray-800 mb-4" style={FONT_ROLES.paneBody}>
              {gmailEmail}
            </div>
            <div className="text-sm text-gray-500">
              Click "Open in Gmail" to view this email in your browser.
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="text-gray-600 mb-4" style={FONT_ROLES.paneBody}>
              You need to log in to Gmail to see your emails here.
            </div>
            <div className="text-sm text-gray-500">
              Click "Open in Gmail" to log in and access your emails.
            </div>
          </div>
        )}

        {/* Open in Gmail Button */}
        <button
          onClick={handleOpenInGmail}
          disabled={!url}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          style={{ ...FONT_ROLES.paneBody, fontSize: '14px', fontWeight: 600 }}
        >
          Open in Gmail
        </button>
      </div>
    </div>
  );
}

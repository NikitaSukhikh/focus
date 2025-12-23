// Gmail OAuth authentication modal

import React, { useState } from 'react';
import {
  saveGmailClientConfig,
  getGmailAuthUrl,
} from '../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GmailAuthModal({ open, onClose }: Props) {
  const [step, setStep] = useState<'config' | 'auth'>('config');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSaveConfig = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Please enter both Client ID and Client Secret');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await saveGmailClientConfig(clientId.trim(), clientSecret.trim());

    if (result.success) {
      setStep('auth');
    } else {
      setError(result.error || 'Failed to save configuration');
    }

    setLoading(false);
  };

  const handleStartAuth = async () => {
    setLoading(true);
    setError(null);

    const result = await getGmailAuthUrl();

    if (result.success && result.auth_url) {
      // Open auth URL in default browser
      window.open(result.auth_url, '_blank');
      setError('Please complete authentication in your browser, then close this dialog.');
    } else {
      setError(result.error || 'Failed to start authentication');
    }

    setLoading(false);
  };

  const handleClose = () => {
    setStep('config');
    setClientId('');
    setClientSecret('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
          aria-label="Close"
        >
          ×
        </button>

        {step === 'config' && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Configure Gmail OAuth
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              To use Gmail via OAuth, you need to create OAuth credentials in Google Cloud Console.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Setup Instructions:
              </h3>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                <li>Create a new project or select an existing one</li>
                <li>Enable the "Gmail API"</li>
                <li>Go to "Credentials" and create "OAuth 2.0 Client ID"</li>
                <li>Choose "Web application" as the application type</li>
                <li>Add authorized redirect URI: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">http://localhost:8000/api/email/gmail/oauth/callback</code></li>
                <li>Copy the Client ID and Client Secret</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxx.apps.googleusercontent.com"
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="GOCSPX-xxxxxxxxxxxxx"
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {error}
                </div>
              )}

              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </>
        )}

        {step === 'auth' && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Authorize Gmail Access
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Click the button below to open Google's authorization page in your browser.
            </p>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
              <p className="text-sm text-green-800 dark:text-green-300">
                ✓ Client configuration saved successfully!
              </p>
            </div>

            <div className="space-y-3">
              {error && (
                <div className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                  {error}
                </div>
              )}

              <button
                onClick={handleStartAuth}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Opening...' : 'Authorize with Google'}
              </button>

              <button
                onClick={handleClose}
                className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> After completing authentication in your browser, you can close this dialog and refresh the integrations page to see your Gmail authentication status.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

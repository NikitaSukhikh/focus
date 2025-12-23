import { useState, useEffect } from 'react';
import { startGDriveAuth, pollGDriveAuth, getGDriveAuthStatus, revokeGDriveAuth } from '../../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GoogleAuthModal({ open, onClose }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      checkAuthStatus();
    } else {
      setStatus(null);
      // Clean up polling interval if modal is closed
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        setPollIntervalId(null);
        setIsSubmitting(false);
      }
    }
  }, [open, pollIntervalId]);

  const checkAuthStatus = async () => {
    setIsChecking(true);
    const result = await getGDriveAuthStatus();
    if (result.success) {
      setIsAuthenticated(result.authenticated || false);
    }
    setIsChecking(false);
  };

  if (!open) return null;

  const handleTryAgain = () => {
    // Stop polling if active
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      setPollIntervalId(null);
    }

    // Reset to initial state
    setIsSubmitting(false);
    setStatus(null);
  };

  const handleAuth = async () => {
    setIsSubmitting(true);
    setStatus('Starting Google OAuth in your browser...');

    try {
      // Start the OAuth flow - returns immediately with session ID
      const authResult = await startGDriveAuth();

      if (!authResult.success) {
        // Failed to start OAuth
        setStatus(authResult.error || 'Failed to start authorization. Please try again.');
        setIsSubmitting(false);
        setTimeout(() => setStatus(null), 5000);
        return;
      }

      // Check if already authenticated
      if (authResult.authenticated) {
        setIsAuthenticated(true);
        setStatus('Successfully authorized with Google!');
        setIsSubmitting(false);
        setTimeout(() => setStatus(null), 3000);
        return;
      }

      // Get session ID and start polling
      const sessionId = authResult.session_id;
      if (!sessionId) {
        setStatus('Failed to start OAuth session. Please try again.');
        setIsSubmitting(false);
        setTimeout(() => setStatus(null), 5000);
        return;
      }

      // Poll for OAuth completion
      const pollInterval = setInterval(async () => {
        const pollResult = await pollGDriveAuth(sessionId);

        if (!pollResult.success) {
          clearInterval(pollInterval);
          setPollIntervalId(null);
          setStatus(pollResult.error || 'Failed to check authorization status.');
          setIsSubmitting(false);
          setTimeout(() => setStatus(null), 5000);
          return;
        }

        // Update status message based on OAuth state
        const statusMessages: Record<string, string> = {
          'starting': 'Starting OAuth flow...',
          'creating_server': 'Setting up OAuth server...',
          'starting_server': 'Starting OAuth server...',
          'opening_browser': 'Opening browser for authorization...',
          'waiting_for_user': 'Waiting for you to authorize in the browser...',
          'processing_callback': 'Processing authorization...',
          'success': 'Successfully authorized with Google!',
          'error': pollResult.error || 'Authorization failed.'
        };

        setStatus(statusMessages[pollResult.status] || 'Authorizing...');

        // Check if completed
        if (pollResult.completed) {
          clearInterval(pollInterval);
          setPollIntervalId(null);
          setIsSubmitting(false);

          if (pollResult.authenticated) {
            // Success
            setIsAuthenticated(true);
            setStatus('Successfully authorized with Google!');
            setTimeout(() => setStatus(null), 3000);
          } else {
            // Failed
            setStatus(pollResult.error || 'Authorization failed. Please try again.');
            setTimeout(() => setStatus(null), 5000);
          }
        }
      }, 500); // Poll every 500ms

      setPollIntervalId(pollInterval);

    } catch (error) {
      setStatus('An error occurred during authorization. Please try again.');
      setIsSubmitting(false);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account?')) {
      return;
    }
    setIsSubmitting(true);
    const result = await revokeGDriveAuth();
    if (result.success) {
      setIsAuthenticated(false);
      setStatus('Successfully disconnected from Google.');
    } else {
      setStatus(result.error || 'Failed to disconnect.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Google Authorization</h2>

        {isChecking ? (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Checking authorization status...
          </div>
        ) : (
          <>
            {isAuthenticated ? (
              <div className="mb-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Google: Authorized!
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Disconnecting...' : 'Disconnect from Google'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Click the button below to authorize Alfy to access your Google account (Drive + Gmail).
                  You'll be redirected to Google's secure login page.
                </p>
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={handleAuth}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                    </svg>
                    <span>{isSubmitting ? 'Connecting...' : 'Authorize with Google'}</span>
                  </button>

                  {isSubmitting && (
                    <button
                      type="button"
                      onClick={handleTryAgain}
                      className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Try Again</span>
                    </button>
                  )}
                </div>
              </>
            )}

            {status && (
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                {status}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

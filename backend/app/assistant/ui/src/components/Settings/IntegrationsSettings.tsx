// Integrations settings panel.

import React, { useState, useEffect } from 'react';
import {
  getGDriveAuthStatus,
  revokeGDriveAuth,
  getEmailConfigStatus,
  saveEmailConfig,
  testEmailConnection,
  type EmailConfig
} from '../../services/api';
import { GoogleAuthModal } from './GoogleAuthModal';

export function IntegrationsSettings() {
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isEmailConfigured, setIsEmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const checkAuthStatus = async () => {
    setLoading(true);
    const [gdriveResult, emailResult] = await Promise.all([
      getGDriveAuthStatus(),
      getEmailConfigStatus()
    ]);

    if (gdriveResult.success) {
      setIsGoogleAuthenticated(gdriveResult.authenticated || false);
    }
    if (emailResult.success) {
      setIsEmailConfigured(emailResult.configured || false);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to disconnect your Google account?')) {
      return;
    }
    setActionLoading(true);
    const result = await revokeGDriveAuth();
    if (result.success) {
      setIsGoogleAuthenticated(false);
    } else {
      alert(result.error || 'Failed to revoke Google authentication');
    }
    setActionLoading(false);
  };

  const handleConnect = async () => {
    setShowAuthModal(true);
  };

  const handleModalClose = () => {
    setShowAuthModal(false);
    // Refresh auth status after modal closes
    checkAuthStatus();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Integrations
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Connect external services to enhance Alfy's capabilities.
        </p>
      </div>

      {/* Google Services Integration (Drive + Gmail) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Google Account
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {loading ? (
                  'Checking status...'
                ) : isGoogleAuthenticated ? (
                  <span className="text-green-600 dark:text-green-400">
                    Connected (Drive + Gmail)
                  </span>
                ) : (
                  'Not connected'
                )}
              </p>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
            ) : isGoogleAuthenticated ? (
              <button
                onClick={handleRevoke}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect with Google
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
          Single sign-on for Google Drive and Gmail. Access private files and send emails securely via OAuth 2.0 (no password storage required).
        </p>
      </div>

      {/* Email/SMTP Integration */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Email (SMTP)
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {loading ? (
                  'Checking status...'
                ) : isEmailConfigured ? (
                  <span className="text-green-600 dark:text-green-400">
                    Configured
                  </span>
                ) : (
                  'Not configured'
                )}
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              {isEmailConfigured ? 'Update' : 'Configure'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
          Send emails with attachments using your SMTP server (Gmail, Outlook, etc.).
        </p>
      </div>

      <GoogleAuthModal open={showAuthModal} onClose={handleModalClose} />
      {showEmailModal && (
        <EmailConfigModal
          open={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            checkAuthStatus();
          }}
        />
      )}
    </div>
  );
}

// Email Configuration Modal Component
function EmailConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [config, setConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    use_tls: true,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    setStatus('Saving configuration...');
    const result = await saveEmailConfig(config);
    if (result.success) {
      setStatus('Configuration saved successfully!');
      setTimeout(() => onClose(), 1500);
    } else {
      setStatus(result.error || 'Failed to save configuration');
    }
    setIsSubmitting(false);
  };

  const handleTest = async () => {
    setIsSubmitting(true);
    setStatus('Testing connection...');
    const result = await testEmailConnection();
    if (result.success) {
      setStatus('✓ Connection successful!');
    } else {
      setStatus('✗ ' + (result.error || 'Connection failed'));
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-2xl"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Configure Email (SMTP)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Enter your SMTP server details to enable email sending.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              SMTP Host
            </label>
            <input
              type="text"
              placeholder="smtp.gmail.com"
              value={config.smtp_host}
              onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="number"
                value={config.smtp_port}
                onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 pb-2">
                <input
                  type="checkbox"
                  checked={config.use_tls}
                  onChange={(e) => setConfig({ ...config, use_tls: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Use TLS</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username
            </label>
            <input
              type="text"
              placeholder="your.email@gmail.com"
              value={config.smtp_username}
              onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password / App Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={config.smtp_password}
              onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Email
            </label>
            <input
              type="email"
              placeholder="your.email@gmail.com"
              value={config.from_email}
              onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Name (Optional)
            </label>
            <input
              type="text"
              placeholder="Your Name"
              value={config.from_name}
              onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !config.smtp_host || !config.smtp_username || !config.smtp_password || !config.from_email}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            >
              Save Configuration
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={isSubmitting || !config.smtp_host}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test
            </button>
          </div>

          {status && (
            <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              {status}
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> For Gmail, use smtp.gmail.com:587 with an App Password. Enable 2FA and generate an app password at myaccount.google.com/apppasswords
        </div>
      </div>
    </div>
  );
}
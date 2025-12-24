import React from 'react';
import { X, Plus } from 'lucide-react';
import { GmailIcon } from '../icons/GoogleServiceIcons';

interface GoogleAccount {
  email: string;
  scopes: string[];
  connected_at: string;
}

interface AccountSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: GoogleAccount[];
  onSelectAccount: (email: string) => void;
  onAddNewAccount: () => void;
}

export function AccountSelectionDialog({
  isOpen,
  onClose,
  accounts,
  onSelectAccount,
  onAddNewAccount,
}: AccountSelectionDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <GmailIcon size={20} />
              <h2 className="text-lg font-semibold text-slate-900">Select Google Account</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Account List */}
          <div className="px-6 py-4">
            <p className="text-sm text-slate-600 mb-4">
              Choose which Google account to use for this Gmail link:
            </p>

            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => {
                    onSelectAccount(account.email);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <GmailIcon size={16} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{account.email}</div>
                    <div className="text-xs text-slate-500">
                      Connected {new Date(account.connected_at).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}

              {/* Add New Account */}
              <button
                onClick={() => {
                  onAddNewAccount();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  <Plus size={16} className="text-slate-500" />
                </div>
                <div className="text-sm font-medium text-slate-600">Add another Google account</div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

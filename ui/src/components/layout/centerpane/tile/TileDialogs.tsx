import React from 'react';
import { AccountSelectionDialog } from '../../../dialogs/AccountSelectionDialog';
import { ShareDialog } from '../../../dialogs/ShareDialog';
import { AccountInfo } from '../../../../services/authenticatedLinks';

interface TileDialogsProps {
  showAccountDialog: boolean;
  accountSelectionData: {
    accounts: AccountInfo[];
    service: string;
    resolve: (_email: string | null) => void;
  } | null;
  showShareDialog: boolean;
  url?: string;
  title: string;
  filePath?: string;
  onAccountSelect: (email: string) => void;
  onAccountDialogClose: () => void;
  onAddNewAccount: () => void;
  onShareDialogClose: () => void;
}

export function TileDialogs({
  showAccountDialog,
  accountSelectionData,
  showShareDialog,
  url,
  title,
  filePath,
  onAccountSelect,
  onAccountDialogClose,
  onAddNewAccount,
  onShareDialogClose,
}: TileDialogsProps) {
  return (
    <>
      {showAccountDialog && accountSelectionData && (
        <AccountSelectionDialog
          isOpen={showAccountDialog}
          onClose={onAccountDialogClose}
          accounts={accountSelectionData.accounts.map((acc) => ({
            email: acc.email,
            scopes: acc.scopes || [],
            connected_at: new Date().toISOString(),
          }))}
          onSelectAccount={onAccountSelect}
          onAddNewAccount={onAddNewAccount}
        />
      )}

      {showShareDialog && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={onShareDialogClose}
          url={url || ''}
          title={title}
          filePath={filePath}
        />
      )}
    </>
  );
}

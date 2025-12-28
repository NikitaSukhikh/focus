import { useState } from 'react';
import { AccountInfo, authenticatedLinksService } from '../../../../services/authenticatedLinks';

export function useAccountSelection() {
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountSelectionData, setAccountSelectionData] = useState<{
    accounts: AccountInfo[];
    service: string;
    resolve: (_email: string | null) => void;
  } | null>(null);

  // Opens a dialog when an authenticated link needs the user to choose or add an account before opening.
  const handleAccountSelect = (email: string) => {
    if (accountSelectionData) {
      accountSelectionData.resolve(email);
      setShowAccountDialog(false);
      setAccountSelectionData(null);
    }
  };

  const handleAccountDialogClose = () => {
    if (accountSelectionData) {
      accountSelectionData.resolve(null);
      setShowAccountDialog(false);
      setAccountSelectionData(null);
    }
  };

  const handleAddNewAccount = async () => {
    if (accountSelectionData) {
      const { service } = accountSelectionData;
      await authenticatedLinksService.triggerOAuth(service);
      handleAccountDialogClose();
    }
  };

  const onAccountSelection = async (accounts: AccountInfo[], service: string): Promise<string | null> => {
    return new Promise<string | null>((resolve) => {
      setAccountSelectionData({ accounts, service, resolve });
      setShowAccountDialog(true);
    });
  };

  return {
    showAccountDialog,
    accountSelectionData,
    handleAccountSelect,
    handleAccountDialogClose,
    handleAddNewAccount,
    onAccountSelection,
  };
}

import { ShareDialog } from '@/components/dialogs/ShareDialog';

interface TileDialogsProps {
  showShareDialog: boolean;
  url?: string;
  title: string;
  filePath?: string;
  shareText?: string;
  onShareDialogClose: () => void;
}

// TileDialogs groups auxiliary dialogs (share modal) shown from tile context actions.
export function TileDialogs({
  showShareDialog,
  url,
  title,
  filePath,
  shareText,
  onShareDialogClose,
}: TileDialogsProps) {
  return (
    <>
      {showShareDialog && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={onShareDialogClose}
          url={url || ''}
          title={title}
          filePath={filePath}
          shareText={shareText}
        />
      )}
    </>
  );
}

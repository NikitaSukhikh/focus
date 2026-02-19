// useCenterPaneHandle centralizes parent ref wiring so CenterPane can stay focused on UI composition concerns.
import { useImperativeHandle } from 'react';
import type React from 'react';
import type { CenterPaneHandle, DroppedIcon } from '@/components/layout/centerpane/types';

interface UseCenterPaneHandleProps {
  ref: React.Ref<CenterPaneHandle>;
  iconsBySpace: Record<string, DroppedIcon[]>;
  getCenterCanvasPos: () => { x: number; y: number };
  getCanvasPosFromClient: (_position: { x: number; y: number }) => { x: number; y: number };
  addFilesAtPosition: (_position: { x: number; y: number }) => Promise<void>;
  openAddLinkDialogAtPosition: (_position: { x: number; y: number }) => void;
  openAddWebArticleDialogAtPosition: (_position: { x: number; y: number }) => void;
  pasteFromClipboardAtPosition: (_position?: { x: number; y: number }) => Promise<void>;
}

export const useCenterPaneHandle = ({
  ref,
  iconsBySpace,
  getCenterCanvasPos,
  getCanvasPosFromClient,
  addFilesAtPosition,
  openAddLinkDialogAtPosition,
  openAddWebArticleDialogAtPosition,
  pasteFromClipboardAtPosition,
}: UseCenterPaneHandleProps): void => {
  useImperativeHandle(ref, () => ({
    addFiles: async (position?: { x: number; y: number }) => {
      const target = position ? getCanvasPosFromClient(position) : getCenterCanvasPos();
      await addFilesAtPosition(target);
    },
    getTilesForSpace: (spaceId: string) => iconsBySpace[spaceId] || [],
    openAddLinkDialog: (position?: { x: number; y: number }) => {
      const target = position ? getCanvasPosFromClient(position) : getCenterCanvasPos();
      openAddLinkDialogAtPosition(target);
    },
    openAddWebArticleDialog: (position?: { x: number; y: number }) => {
      const target = position ? getCanvasPosFromClient(position) : getCenterCanvasPos();
      openAddWebArticleDialogAtPosition(target);
    },
    pasteFromClipboard: async (position?: { x: number; y: number }) => {
      const target = position ? getCanvasPosFromClient(position) : undefined;
      await pasteFromClipboardAtPosition(target);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the exposed handle intentionally tracks explicit members, not object identity
  }), [
    addFilesAtPosition,
    getCanvasPosFromClient,
    getCenterCanvasPos,
    iconsBySpace,
    openAddLinkDialogAtPosition,
    openAddWebArticleDialogAtPosition,
    pasteFromClipboardAtPosition,
  ]);
};

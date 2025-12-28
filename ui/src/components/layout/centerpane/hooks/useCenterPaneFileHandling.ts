/**
 * CenterPane File Handling Hook
 *
 * Purpose: Manages local file selection and addition to the canvas
 * Responsibilities:
 * - Opening native file picker dialog
 * - Handling multiple file selection
 * - Placing files in grid layout with automatic positioning
 * - Creating optimistic UI updates for selected files
 * - Syncing file objects with backend API
 */

import { useCallback } from 'react';
import { objectsApi, ObjectCreatePayload } from '../../../../api/objects';
import { undoApi } from '../../../../api/undo';
import { openFilePicker } from '../../../../platform';
import { DroppedIcon } from '../types';

interface FileHandlingParams {
  selectedIsland: any;
  paneRef: React.RefObject<HTMLDivElement | null>;
  setIconsByIsland: React.Dispatch<React.SetStateAction<Record<string, DroppedIcon[]>>>;
  clampToBoundaries: (x: number, y: number) => { x: number; y: number };
}

export const useCenterPaneFileHandling = ({
  selectedIsland,
  paneRef,
  setIconsByIsland,
  clampToBoundaries,
}: FileHandlingParams) => {

  const handleAddFiles = useCallback(async () => {
    if (!selectedIsland || !paneRef.current) return;

    try {
      const selected = await openFilePicker({
        multiple: true,
        title: 'Select files to add',
      });

      if (!selected) return;

      const filePaths = Array.isArray(selected) ? selected : [selected];
      console.log('[FILE PICKER] Selected files:', filePaths);

      const rect = paneRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      filePaths.forEach((filePath, index) => {
        const filename = filePath.split(/[\\/]/).pop() || 'Unknown File';

        const offsetX = (index % 3) * 80;
        const offsetY = Math.floor(index / 3) * 80;
        const targetX = centerX + offsetX;
        const targetY = centerY + offsetY;

        const { x, y } = clampToBoundaries(targetX, targetY);

        const payload: ObjectCreatePayload = {
          type: 'file',
          title: filename,
          file_path: filePath,
          x,
          y,
        };

        const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}-${index}`;
        const optimisticIcon: DroppedIcon = {
          id: tempId,
          type: 'file',
          title: filename,
          x,
          y,
          filePath: filePath,
        };

        setIconsByIsland((prev) => ({
          ...prev,
          [selectedIsland.id]: [...(prev[selectedIsland.id] || []), optimisticIcon],
        }));

        objectsApi
          .create(selectedIsland.id, payload)
          .then((created) => {
            const meta = (created.metadata || {}) as Record<string, any>;
            const createdFilePath = meta.file_path as string;

            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
                i.id === tempId ? { ...i, id: created.id, filePath: createdFilePath } : i
              ),
            }));

            // Add to backend undo history
            undoApi
              .createEvent(selectedIsland.id, {
                event_type: 'tile_create',
                event_data: {
                  tile: {
                    id: created.id,
                    type: 'file',
                    title: filename,
                    x,
                    y,
                    filePath: createdFilePath,
                  },
                },
              })
              .catch((err) => console.error('Failed to create undo event:', err));
          })
          .catch((err) => {
            console.error('Failed to create file object:', err);
            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== tempId),
            }));
          });
      });
    } catch (err) {
      console.error('Failed to open file picker:', err);
    }
  }, [selectedIsland, paneRef, clampToBoundaries, setIconsByIsland]);

  return {
    handleAddFiles,
  };
};

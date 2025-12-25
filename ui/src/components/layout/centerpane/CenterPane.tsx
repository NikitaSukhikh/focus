import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { useIslandStore } from '../../../stores/islandStore';
import { objectsApi, ObjectCreatePayload } from '../../../api/objects';
import { buildFaviconUrl } from '../../../utils/favicon';
import { IconTile } from './IconTile';
import { DroppedIcon, IconKind, CenterPaneProps, CenterPaneHandle } from './types';
import { isGmailUrl } from './utils';

const CenterPaneComponent = (props: CenterPaneProps, ref: React.Ref<CenterPaneHandle>) => {
  const { onObjectClick, onCanvasEmptyClick } = props;
  const [isDragOver, setIsDragOver] = useState(false);
  const [iconsByIsland, setIconsByIsland] = useState<Record<string, DroppedIcon[]>>({});
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);
  const paneRef = useRef<HTMLDivElement | null>(null);

  const selectedIsland = useIslandStore((state) => state.getSelectedIsland());

  // Load existing objects as icons when island changes
  useEffect(() => {
    const islandId = selectedIsland?.id;
    if (!islandId) return;

    objectsApi
      .list(islandId)
      .then((objects) => {
        const mapped: DroppedIcon[] = objects
          .filter((obj) => {
            // Filter out objects with negative or missing positions (removed from canvas)
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = meta.x;
            const y = meta.y;
            return typeof x === 'number' && typeof y === 'number' && x >= 0 && y >= 0;
          })
          .map((obj, idx) => {
            const meta = (obj.metadata || {}) as Record<string, any>;
            const x = typeof meta.x === 'number' ? meta.x : 100 + (idx % 5) * 120;
            const y = typeof meta.y === 'number' ? meta.y : 100 + Math.floor(idx / 5) * 140;

            // For Google Drive services, service key is in description
            // For links, description is the actual description
            const serviceKey = obj.type === 'google_drive' ? obj.description : undefined;
            const description = obj.type !== 'google_drive' ? obj.description : undefined;
            const url = obj.type === 'link' ? (meta.url as string) : undefined;
            const service = meta.service as string | undefined;
            const faviconUrl = (meta.favicon_url as string | undefined) || (url ? buildFaviconUrl(url) : undefined);
            const filePath = obj.type === 'file' ? (meta.file_path as string) : undefined;

            // Check if it's a Gmail link
            const isGmail = url && isGmailUrl(url);

            // Extract email from description for Gmail links
            const displayTitle = isGmail && description?.includes('Gmail - ')
              ? description.replace('Gmail - ', '')
              : obj.title;

            let kind: IconKind =
              obj.type === 'link'
                ? (isGmail ? 'gmail' : 'link')
                : obj.type === 'file'
                ? 'file'
                : obj.type === 'gmail'
                ? 'gmail'
                : service === 'telegram'
                ? 'telegram'
                : service === 'intstorage'
                ? 'intstorage'
                : obj.type === 'google_drive'
                ? (
                  serviceKey === 'sheets' ? 'google_sheets' :
                  serviceKey === 'docs' ? 'google_docs' :
                  serviceKey === 'slides' ? 'google_slides' :
                  'google_drive'
                )
                : obj.type === 'text'
                ? 'text'
                : 'unknown';

            return {
              id: obj.id,
              type: kind,
              title: displayTitle,
              x,
              y,
              serviceKey,
              url,
              service,
              description,
              faviconUrl,
              filePath,
            };
          });
        setIconsByIsland((prev) => ({ ...prev, [islandId]: mapped }));
      })
      .catch((err) => {
        console.error('Failed to load objects for island', islandId, err);
      });
  }, [selectedIsland?.id]);

  // Handle keyboard delete for selected icon
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIconId && selectedIsland) {
        // Don't delete if target is an input or textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        // Prevent default behavior to avoid any unwanted side effects
        e.preventDefault();

        console.log('[DELETE] Removing icon from canvas:', selectedIconId);

        // Remove the icon from canvas (local state)
        setIconsByIsland((prev) => ({
          ...prev,
          [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== selectedIconId),
        }));

        // Clear position in backend to hide from canvas but keep in database
        objectsApi.updatePosition(selectedIconId, -1, -1).catch((err) => {
          console.error('Failed to clear object position:', err);
        });
        setSelectedIconId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIconId, selectedIsland]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[DRAG] DragEnter event', e.dataTransfer.types);
    // Check if dragging existing icon or new integration
    const iconId = e.dataTransfer.types.includes('application/x-icon-id');
    e.dataTransfer.dropEffect = iconId ? 'move' : 'copy';
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if dragging existing icon or new integration
    const iconId = e.dataTransfer.types.includes('application/x-icon-id');
    e.dataTransfer.dropEffect = iconId ? 'move' : 'copy';
  };

  const handleDragLeave = () => {
    console.log('[DRAG] DragLeave event');
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    console.log('[DROP] Drop event triggered', {
      types: e.dataTransfer.types,
      files: e.dataTransfer.files.length,
      items: e.dataTransfer.items?.length,
    });

    if (!paneRef.current || !selectedIsland) {
      console.log('[DROP] Missing paneRef or selectedIsland', { paneRef: paneRef.current, selectedIsland });
      return;
    }

    const rect = paneRef.current.getBoundingClientRect();

    // Check if dragging an existing icon
    const iconId = e.dataTransfer.getData('application/x-icon-id');
    console.log('[DROP] Icon ID:', iconId);
    if (iconId) {
      // Get the drag start data to calculate movement delta
      const startData = e.dataTransfer.getData('application/x-drag-start');
      let dragStart = { startCursorX: 0, startCursorY: 0, iconX: 0, iconY: 0 };
      try {
        if (startData) {
          dragStart = JSON.parse(startData);
        }
      } catch {
        // Ignore malformed drag metadata
      }

      // Calculate how much the cursor moved
      const deltaX = e.clientX - dragStart.startCursorX;
      const deltaY = e.clientY - dragStart.startCursorY;

      // Apply the same delta to the icon's original position
      const x = dragStart.iconX + deltaX;
      const y = dragStart.iconY + deltaY;

      console.log('[DROP] Icon ID:', iconId, 'Position:', { x, y }, 'Delta:', { deltaX, deltaY }, 'Original:', { iconX: dragStart.iconX, iconY: dragStart.iconY }, 'Cursor:', {
        start: { x: dragStart.startCursorX, y: dragStart.startCursorY },
        end: { x: e.clientX, y: e.clientY }
      });

      // Update position immediately - this will trigger a re-render
      // The icon will appear at the new position without animation
      setIconsByIsland((prev) => ({
        ...prev,
        [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
          i.id === iconId ? { ...i, x, y } : i
        ),
      }));

      // Update backend
      objectsApi.updatePosition(iconId, x, y).catch((err) => {
        console.error('Failed to update position:', err);
      });
      return;
    }

    // Check if dragging a saved link from the Integrations dropdown
    const rawJson = e.dataTransfer.getData('application/json');
    if (rawJson) {
      try {
        const dragData = JSON.parse(rawJson);
        if (dragData.source === 'saved-link' && dragData.linkId) {
          // This is an existing saved link - just update its position, don't create a duplicate
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          console.log('[DROP] Saved link drag detected:', { linkId: dragData.linkId, x, y });

          // Check if icon already exists in local state
          setIconsByIsland((prev) => {
            const currentIcons = prev[selectedIsland.id] || [];
            const existingIconIndex = currentIcons.findIndex((i) => i.id === dragData.linkId);

            if (existingIconIndex >= 0) {
              // Icon exists - update its position
              return {
                ...prev,
                [selectedIsland.id]: currentIcons.map((i) =>
                  i.id === dragData.linkId ? { ...i, x, y } : i
                ),
              };
            } else {
              // Icon doesn't exist in canvas (was removed) - add it back
              const isGmail = isGmailUrl(dragData.url || '');
              const faviconUrl = dragData.url ? buildFaviconUrl(dragData.url) : undefined;

              // Extract email from description for Gmail links
              const displayTitle = isGmail && dragData.description?.includes('Gmail - ')
                ? dragData.description.replace('Gmail - ', '')
                : dragData.title || dragData.label || 'Link';

              const newIcon: DroppedIcon = {
                id: dragData.linkId,
                type: isGmail ? 'gmail' : 'link',
                title: displayTitle,
                x,
                y,
                url: dragData.url,
                description: dragData.description,
                faviconUrl: isGmail ? undefined : faviconUrl,
              };

              return {
                ...prev,
                [selectedIsland.id]: [...currentIcons, newIcon],
              };
            }
          });

          // Update backend
          objectsApi.updatePosition(dragData.linkId, x, y).catch((err) => {
            console.error('Failed to update saved link position:', err);
          });
          return;
        }
      } catch (err) {
        // Not a saved link or malformed JSON, continue to normal drop handling
        console.log('[DROP] Failed to parse drag data or not a saved link:', err);
      }
    }

    // For new integrations, place at cursor position
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const uriFallback = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    console.log('[DROP] New integration drop', { rawJson, uriFallback, x, y });

    // Build object payload for backend
    const buildPayload = (): ObjectCreatePayload => {
      // Try JSON payload first
      if (rawJson) {
        try {
          const payload = JSON.parse(rawJson);
          const provider = (payload?.provider || payload?.source || '').toString().toLowerCase();
          const key = (payload?.key || '').toString().toLowerCase();
          const label = payload?.label || payload?.title || 'Integration';

          if (provider === 'telegram') {
            return {
              type: 'text',
              title: label,
              content: 'Telegram integration',
              description: payload?.description,
              service: 'telegram',
              x,
              y,
            };
          }
          if (provider === 'intstorage') {
            return {
              type: 'text',
              title: label,
              content: 'Internal storage integration',
              description: payload?.description,
              service: 'intstorage',
              x,
              y,
            };
          }
          if (provider.includes('gmail') || key.includes('gmail')) {
            return {
              type: 'gmail',
              title: label,
              thread_id: payload?.thread_id || crypto.randomUUID?.() || Date.now().toString(),
              message_id: payload?.message_id || crypto.randomUUID?.() || `${Date.now()}-msg`,
              subject: payload?.subject || label,
              sender: payload?.sender || 'unknown@example.com',
              snippet: payload?.snippet || '',
              x,
              y,
            };
          }
          // All Google Drive-based services (Drive, Sheets, Docs, Slides)
          if (provider.includes('drive') || key.includes('drive') ||
              key.includes('sheets') || key.includes('docs') || key.includes('slides') ||
              provider === 'google') {
            const drivePayload: any = {
              type: 'google_drive',
              title: label,
              drive_file_id: payload?.drive_file_id || payload?.id || `${Date.now()}`,
              drive_file_name: payload?.drive_file_name || payload?.name || label,
              mime_type: payload?.mime_type,
              web_view_link: payload?.url || payload?.web_view_link,
              x,
              y,
            };
            // Store service key in description for frontend to identify specific service
            if (key) {
              drivePayload.description = key;
            }
            return drivePayload as ObjectCreatePayload;
          }
          // Handle generic links with URL (but NOT saved links - those are handled above)
          if (payload?.url && !payload?.source) {
            const favicon_url = buildFaviconUrl(payload.url);
            return {
              type: 'link',
              title: label || payload.url,
              url: payload.url,
              description: payload.description,
              favicon_url,
              x,
              y,
            };
          }
          // Fallback text
          return {
            type: 'text',
            title: label,
            content: label,
            x,
            y,
          };
        } catch {
          // ignore malformed JSON
        }
      }

      // URI fallback
      if (uriFallback) {
        const url = uriFallback.trim();
        if (url.startsWith('http')) {
          const favicon_url = buildFaviconUrl(url);
          return { type: 'link', title: url, url, x, y, favicon_url };
        }
        return { type: 'text', title: url, content: url, x, y };
      }

      // Final fallback
      return { type: 'text', title: 'Integration', content: 'Integration', x, y };
    };

    const payload = buildPayload();

    // Get drag data to determine specific service
    let serviceKey: string | undefined;
    let dragPayloadData: any;
    try {
      dragPayloadData = JSON.parse(rawJson);
      serviceKey = dragPayloadData?.key;
    } catch {
      // Ignore malformed drag payload
    }

    // Optimistically add icon
    const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticType: IconKind =
      payload.service === 'telegram' ? 'telegram' :
      payload.service === 'intstorage' ? 'intstorage' :
      payload.type === 'gmail' ? 'gmail' :
      payload.type === 'google_drive' ? (
        serviceKey === 'sheets' ? 'google_sheets' :
        serviceKey === 'docs' ? 'google_docs' :
        serviceKey === 'slides' ? 'google_slides' :
        'google_drive'
      ) :
      payload.type === 'link' ? 'link' :
      payload.type === 'file' ? 'file' :
      payload.type === 'text' ? 'text' : 'unknown';
    const optimisticIcon: DroppedIcon = {
      id: tempId,
      type: optimisticType,
      title: payload.title,
      x,
      y,
      serviceKey,
      url: payload.type === 'link' ? (payload as any).url : undefined,
      description: payload.description,
      faviconUrl: payload.type === 'link' ? (payload as any).favicon_url || buildFaviconUrl((payload as any).url) : undefined,
    };
    setIconsByIsland((prev) => {
      const current = prev[selectedIsland.id] || [];
      return { ...prev, [selectedIsland.id]: [...current, optimisticIcon] };
    });

    objectsApi
      .create(selectedIsland.id, payload)
      .then((created) => {
        const createdServiceKey = created.description;
        const iconType: IconKind =
          (created.metadata as any)?.service === 'telegram'
            ? 'telegram'
            : (created.metadata as any)?.service === 'intstorage'
            ? 'intstorage'
            : created.type === 'gmail'
            ? 'gmail'
            : created.type === 'google_drive'
            ? (
              createdServiceKey === 'sheets' ? 'google_sheets' :
              createdServiceKey === 'docs' ? 'google_docs' :
              createdServiceKey === 'slides' ? 'google_slides' :
              'google_drive'
            )
            : created.type === 'link'
            ? 'link'
            : created.type === 'file'
            ? 'file'
            : created.type === 'text'
            ? ((created.metadata as any)?.service === 'telegram' ? 'telegram' : (created.metadata as any)?.service === 'intstorage' ? 'intstorage' : 'text')
            : 'unknown';

        const meta = (created.metadata || {}) as Record<string, any>;
        const finalX = typeof meta.x === 'number' ? meta.x : x;
        const finalY = typeof meta.y === 'number' ? meta.y : y;
        const finalUrl = created.type === 'link' ? (meta.url as string) : undefined;
        const finalDescription = created.type !== 'google_drive' ? created.description : undefined;
        const finalFavicon = created.type === 'link'
          ? (meta.favicon_url as string | undefined) || (finalUrl ? buildFaviconUrl(finalUrl) : undefined)
          : undefined;

        setIconsByIsland((prev) => {
          const current = (prev[selectedIsland.id] || []).filter((i) => i.id !== tempId);
          return {
            ...prev,
            [selectedIsland.id]: [
              ...current,
              {
                id: created.id,
                type: iconType,
                title: created.title,
                x: finalX,
                y: finalY,
                serviceKey: createdServiceKey,
                url: finalUrl,
                description: finalDescription,
                faviconUrl: finalFavicon,
              },
            ],
          };
        });
      })
      .catch((err) => {
        console.error('Failed to create object from drop:', err);
      });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const clickedIcon = target.closest('[data-icon-tile]');
    if (clickedIcon) return;

    setSelectedIconId(null);
    onCanvasEmptyClick?.();
  };

  const handleAddFiles = useCallback(async () => {
    if (!selectedIsland || !paneRef.current) return;

    try {
      const selected = await open({
        multiple: true,
        title: 'Select files to add',
      });

      if (!selected) return;

      const filePaths = Array.isArray(selected) ? selected : [selected];
      console.log('[FILE PICKER] Selected files:', filePaths);

      // Get center position for file placement
      const rect = paneRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      filePaths.forEach((filePath, index) => {
        const filename = filePath.split(/[\\/]/).pop() || 'Unknown File';

        // Offset each file slightly
        const offsetX = (index % 3) * 80;
        const offsetY = Math.floor(index / 3) * 80;
        const x = centerX + offsetX;
        const y = centerY + offsetY;

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
  }, [selectedIsland, paneRef, setIconsByIsland]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addFiles: handleAddFiles,
  }), [handleAddFiles]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      {/* Canvas - Freeform icons */}
      <div
        className={`flex-1 overflow-y-auto custom-scroll p-6 transition-colors ${
          isDragOver ? 'bg-blue-50 ring-2 ring-blue-200' : ''
        }`}
        ref={paneRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleCanvasClick}
      >
        <div className="relative min-h-full">
          {(selectedIsland && iconsByIsland[selectedIsland.id]?.length) ? null : (
            <div className="text-sm text-slate-500">Drop integrations or links here. Use the + button to add files.</div>
          )}
          {(iconsByIsland[selectedIsland?.id ?? ''] || []).map((icon) => (
            <IconTile
              key={icon.id}
              id={icon.id}
              type={icon.type}
              title={icon.title}
              x={icon.x}
              y={icon.y}
              url={icon.url}
              description={icon.description}
              faviconUrl={icon.faviconUrl}
              filePath={icon.filePath}
              isSelected={selectedIconId === icon.id}
              onClick={() => {
                setSelectedIconId(icon.id);
                onObjectClick?.();
              }}
              onRename={(newTitle) => {
                if (!selectedIsland) return;
                // Update local state
                setIconsByIsland((prev) => ({
                  ...prev,
                  [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
                    i.id === icon.id ? { ...i, title: newTitle } : i
                  ),
                }));
                // Update backend
                objectsApi.updateTitle(icon.id, newTitle).catch((err) => {
                  console.error('Failed to update title:', err);
                });
              }}
              onDelete={() => {
                if (!selectedIsland) return;
                // Remove from canvas (local state)
                setIconsByIsland((prev) => ({
                  ...prev,
                  [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== icon.id),
                }));
                // Clear position in backend to hide from canvas but keep in database
                objectsApi.updatePosition(icon.id, -1, -1).catch((err) => {
                  console.error('Failed to clear object position:', err);
                });
              }}
              onRefreshMetadata={async () => {
                if (!selectedIsland || icon.type !== 'link' || !icon.url) return;

                try {
                  // Fetch metadata from backend
                  const params = new URLSearchParams({ url: icon.url });
                  const response = await fetch(`/api/metadata/url?${params.toString()}`);
                  if (response.ok) {
                    const metadata = await response.json();
                    console.log('[CENTER PANE] Fetched metadata for refresh:', metadata);

                    const newTitle = metadata.title || metadata.og_title || icon.url;
                    const newDescription = metadata.description || metadata.og_description || '';
                    const newFaviconUrl = metadata.favicon_url || icon.faviconUrl || buildFaviconUrl(icon.url);

                    // Update local state
                    setIconsByIsland((prev) => ({
                      ...prev,
                      [selectedIsland.id]: (prev[selectedIsland.id] || []).map((i) =>
                        i.id === icon.id ? { ...i, title: newTitle, description: newDescription, faviconUrl: newFaviconUrl } : i
                      ),
                    }));

                    // Update backend
                    await objectsApi.updateLink(icon.id, icon.url, newTitle, newDescription, newFaviconUrl);
                  }
                } catch (err) {
                  console.error('[CENTER PANE] Failed to refresh metadata:', err);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const CenterPane = forwardRef(CenterPaneComponent);
CenterPane.displayName = 'CenterPane';

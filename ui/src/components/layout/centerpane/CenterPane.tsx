import React, { useEffect, useState, useRef } from 'react';
import { Grid3x3, Link, FileText, Edit2, Trash2 } from 'lucide-react';
import { GmailIcon, DriveIcon, SheetsIcon, DocsIcon, SlidesIcon } from '../../icons/GoogleServiceIcons';
import { TelegramIcon } from '../../../features/telegram/TelegramIcon';
import { IntStorageIcon } from '../../../features/intstorage/IntStorageIcon';
import { useIslandStore } from '../../../stores/islandStore';
import { objectsApi, ObjectCreatePayload } from '../../../api/objects';
import { buildFaviconUrl, FALLBACK_FAVICON } from '../../../utils/favicon';
import { detectFileType, canShowImageThumbnail } from '../../../utils/fileTypes';
import { getFileTypeIcon } from '../../icons/FileTypeIcons';

type IconKind = 'link' | 'file' | 'gmail' | 'google_drive' | 'google_sheets' | 'google_docs' | 'google_slides' | 'text' | 'telegram' | 'intstorage' | 'unknown';

const isGmailUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'mail.google.com' || urlObj.hostname === 'gmail.com';
  } catch {
    return false;
  }
};

interface DroppedIcon {
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  serviceKey?: string; // To track specific Google services like 'sheets', 'docs', 'slides'
  url?: string; // For link objects
  description?: string; // For all objects
  faviconUrl?: string;
  service?: string;
  filePath?: string; // For file objects - path to original file
}

interface CenterPaneProps {
  onObjectClick?: () => void;
  onCanvasEmptyClick?: () => void;
}

export function CenterPane({ onObjectClick, onCanvasEmptyClick }: CenterPaneProps) {
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
        // Don't delete if user is editing something (icon rename)

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

  // Listen for OS file drop events
  useEffect(() => {
    const handleOSFileDrop = (event: Event) => {
      const customEvent = event as CustomEvent<{ paths: string[] }>;
      const paths = customEvent.detail?.paths || [];

      console.log('[OS FILE DROP] Event received:', {
        hasIsland: !!selectedIsland,
        hasPane: !!paneRef.current,
        pathCount: paths.length,
        paths
      });

      if (!selectedIsland || !paneRef.current || paths.length === 0) {
        console.log('[OS FILE DROP] Aborting - missing requirements');
        return;
      }

      console.log('[OS FILE DROP] Processing files:', paths);

      // Create file objects at center of pane for each dropped file
      const rect = paneRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      paths.forEach((filePath, index) => {
        // Extract filename from path
        const filename = filePath.split(/[\\/]/).pop() || 'Unknown File';

        console.log('[OS FILE DROP] Processing file:', { filePath, filename });

        // Offset each file slightly so they don't all stack on top of each other
        const offsetX = (index % 3) * 80;
        const offsetY = Math.floor(index / 3) * 80;
        const x = centerX + offsetX;
        const y = centerY + offsetY;

        // Create file object payload
        const payload: ObjectCreatePayload = {
          type: 'file',
          title: filename,
          file_path: filePath,
          x,
          y,
        };

        // Optimistically add icon
        const tempId = `icon-${Date.now()}-${Math.random().toString(16).slice(2)}-${index}`;
        const optimisticIcon: DroppedIcon = {
          id: tempId,
          type: 'file',
          title: filename,
          x,
          y,
          filePath: filePath,
        };

        console.log('[OS FILE DROP] Creating optimistic icon:', { tempId, filename, x, y, filePath });

        setIconsByIsland((prev) => {
          const newState = {
            ...prev,
            [selectedIsland.id]: [...(prev[selectedIsland.id] || []), optimisticIcon],
          };
          console.log('[OS FILE DROP] Updated icons state:', newState);
          return newState;
        });

        // Create object in backend
        objectsApi
          .create(selectedIsland.id, payload)
          .then((created) => {
            // Replace temp ID with real ID from backend
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
            // Remove optimistic icon on error
            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== tempId),
            }));
          });
      });
    };

    window.addEventListener('os-file-drop-received', handleOSFileDrop);
    return () => window.removeEventListener('os-file-drop-received', handleOSFileDrop);
  }, [selectedIsland, paneRef]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleRename = () => {
    setIsEditing(true);
    setShowContextMenu(false);
  };

  const handleDelete = async () => {
    if (selectedIsland) {
      await deleteIsland(selectedIsland.id);
    }
    setShowContextMenu(false);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value);
  };

  const handleNameSubmit = async () => {
    if (selectedIsland && editingName.trim() && editingName.trim() !== islandName) {
      await updateIsland(selectedIsland.id, editingName.trim());
    } else {
      setEditingName(islandName);
    }
    setIsEditing(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingName(islandName);
      setIsEditing(false);
    }
  };

  const handleNameBlur = () => {
    handleNameSubmit();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('[DRAG] DragEnter event', e.dataTransfer.types);
    // Check if dragging existing icon or new integration
    const iconId = e.dataTransfer.types.includes('application/x-icon-id');
    e.dataTransfer.dropEffect = iconId ? 'move' : 'copy';
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
    setIsDragOver(false);

    console.log('[DROP] Drop event triggered');

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

    // Check for OS file drops (from file manager)
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log('[DROP] OS files dropped via drag handler:', files);
      console.warn('[DROP] Note: fileDropEnabled is false in Tauri config, so files should come via os-file-drop event instead');
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      Array.from(files).forEach((file, index) => {
        // Get file path if available (Electron/Tauri provide this)
        const filePath = (file as any).path || file.name;
        const filename = file.name;
        console.log('[DROP] Processing file:', { filename, filePath, hasPath: !!(file as any).path });

        // Offset each file slightly so they don't all stack on top of each other
        const offsetX = (index % 3) * 80;
        const offsetY = Math.floor(index / 3) * 80;
        const x = centerX + offsetX;
        const y = centerY + offsetY;

        // Create file object payload
        const payload: ObjectCreatePayload = {
          type: 'file',
          title: filename,
          file_path: filePath,
          x,
          y,
        };

        // Optimistically add icon
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

        // Create object in backend
        objectsApi
          .create(selectedIsland.id, payload)
          .then((created) => {
            // Replace temp ID with real ID from backend
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
            // Remove optimistic icon on error
            setIconsByIsland((prev) => ({
              ...prev,
              [selectedIsland.id]: (prev[selectedIsland.id] || []).filter((i) => i.id !== tempId),
            }));
          });
      });
      return;
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
            <div className="text-sm text-slate-500">Drop integrations or links here.</div>
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface IconTileProps {
  id: string;
  type: IconKind;
  title: string;
  x: number;
  y: number;
  url?: string;
  description?: string;
  faviconUrl?: string;
  filePath?: string;
  isSelected?: boolean;
  onClick?: () => void;
  onPositionChange?: (_x: number, _y: number) => void;
  onDelete?: () => void;
  onRename?: (_newTitle: string) => void;
}

function IconTile({ id, type, title, x, y, url, description, faviconUrl, filePath, isSelected, onClick, onPositionChange: _onPositionChange, onDelete, onRename }: IconTileProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [skipTransition, setSkipTransition] = React.useState(false);
  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({ x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renamingValue, setRenamingValue] = React.useState(title);
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(null);
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  // Load thumbnail for image files
  React.useEffect(() => {
    console.log('[ICON TILE] Checking thumbnail for:', { type, filePath, title });
    if (type === 'file' && filePath && canShowImageThumbnail(filePath)) {
      // Build thumbnail URL
      const params = new URLSearchParams({
        file_path: filePath,
        max_width: '256',
        max_height: '256',
        quality: '85',
      });
      const url = `/api/thumbnails/image?${params.toString()}`;
      console.log('[ICON TILE] Setting thumbnail URL:', url);
      setThumbnailUrl(url);
    } else {
      console.log('[ICON TILE] No thumbnail needed:', {
        isFile: type === 'file',
        hasFilePath: !!filePath,
        canShowThumbnail: filePath ? canShowImageThumbnail(filePath) : false
      });
      setThumbnailUrl(null);
    }
  }, [type, filePath, title]);

  const handleDragStart = (e: React.DragEvent) => {
    // Store current icon position and cursor position
    const startCursorX = e.clientX;
    const startCursorY = e.clientY;

    // Set drag data including start positions
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-icon-id', id);
    e.dataTransfer.setData('application/x-drag-start', JSON.stringify({
      startCursorX,
      startCursorY,
      iconX: x,
      iconY: y
    }));

    // Create a custom drag image from the current element
    const dragImage = (e.target as HTMLElement).cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 64, 64); // Center of 128px wide element

    // Remove the drag image after the browser captures it
    requestAnimationFrame(() => {
      document.body.removeChild(dragImage);
    });

    // Hide the original icon immediately
    setIsDragging(true);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Disable transition and wait for position update before showing icon
    setSkipTransition(true);

    // Delay making icon visible until after position update has been applied
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsDragging(false);
        // Re-enable transitions after a short delay
        setTimeout(() => {
          setSkipTransition(false);
        }, 50);
      });
    });

    // Remove focus to prevent blue ring after drop
    (e.target as HTMLElement).blur();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
  };

  const handleRenameClick = () => {
    setShowContextMenu(false);
    setIsRenaming(true);
    setRenamingValue(title);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  };

  const handleDeleteClick = () => {
    setShowContextMenu(false);
    if (onDelete) {
      onDelete();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'link' && url) {
      window.open(url, '_blank');
    }
  };

  const handleRenameSubmit = () => {
    const newTitle = renamingValue.trim();
    if (newTitle && newTitle !== title && onRename) {
      onRename(newTitle);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenamingValue(title);
    }
  };

  React.useEffect(() => {
    setRenamingValue(title);
  }, [title]);

  const Icon =
    type === 'link'
      ? Link
      : type === 'file'
      ? FileText
      : type === 'gmail'
      ? GmailIcon
      : type === 'google_drive'
      ? DriveIcon
      : type === 'google_sheets'
      ? SheetsIcon
      : type === 'google_docs'
      ? DocsIcon
      : type === 'google_slides'
      ? SlidesIcon
      : type === 'telegram'
      ? TelegramIcon
      : type === 'intstorage'
      ? IntStorageIcon
      : type === 'text'
      ? FileText
      : Grid3x3;

  const renderIcon = () => {
    // Show thumbnail for image files
    if (type === 'file' && thumbnailUrl) {
      return (
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-12 h-12 rounded-md object-cover bg-white border border-slate-200"
          onError={() => setThumbnailUrl(null)}
        />
      );
    }

    // Show file type icon for non-image files
    if (type === 'file' && filePath) {
      const fileTypeInfo = detectFileType(filePath);
      const FileTypeIconComponent = getFileTypeIcon(fileTypeInfo.extension);
      return <FileTypeIconComponent size={48} />;
    }

    // Show favicon for links (fallbacks to pixelated question mark)
    if (type === 'link') {
      return (
        <img
          src={faviconUrl || FALLBACK_FAVICON}
          alt=""
          className="w-12 h-12 rounded-md object-contain bg-white border border-slate-200"
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_FAVICON) {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_FAVICON;
            }
          }}
        />
      );
    }

    // Default icon
    return <Icon size={48} />;
  };

  return (
    <>
      <button
        data-icon-tile
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        title={description || (type === 'link' && url ? url : title)}
        className={`
          group absolute
          text-center w-32 cursor-grab active:cursor-grabbing
          ${isDragging ? 'invisible' : ''}
        `}
        style={{
          top: y,
          left: x,
          transform: 'translate(-50%, -50%)',
          transition: skipTransition ? 'none' : 'all 0.2s',
          opacity: isDragging ? 0 : 1
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`p-4 rounded-2xl bg-white shadow-md text-slate-600 group-hover:shadow-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-all ${
            isSelected
              ? 'border-2 border-blue-500 shadow-lg'
              : 'border border-slate-200 group-hover:border-blue-400'
          }`}>
            {renderIcon()}
          </div>
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameSubmit}
              className="text-sm text-slate-700 w-full text-center bg-white border border-blue-400 rounded px-2 py-1 outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-sm text-slate-700 truncate w-full px-1">{title}</div>
          )}
        </div>
      </button>

      {showContextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={handleCloseContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCloseContextMenu();
            }}
          />
          <div
            className="fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
            style={{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }}
          >
            <button
              onClick={handleRenameClick}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Edit2 size={14} />
              Rename
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </>
  );
}

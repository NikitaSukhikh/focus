import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Menu, Settings, MessageCircle, PanelRight, ChevronDown, Plus, Search, Edit2, Trash2, FilePlus } from 'lucide-react';
import { CenterPaneHandle } from '../centerpane/CenterPane';
import { AddLinkDialog } from '../../dialogs/AddLinkDialog';
import { EditLinkDialog } from '../../dialogs/EditLinkDialog';
import { useIslandStore } from '../../../stores/islandStore';
import { objectsApi } from '../../../api/objects';
import { buildFaviconUrl, FALLBACK_FAVICON } from '../../../utils/favicon';

const getLinkDisplayName = (url: string, title?: string) => {
  const trimmedTitle = title?.trim();
  if (trimmedTitle && trimmedTitle !== url) return trimmedTitle;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    return hostname || url;
  } catch {
    return trimmedTitle || url;
  }
};

interface TopBarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onTogglePreview: () => void;
  isPreviewOpen: boolean;
  onToggleConversation: () => void;
  isConversationOpen: boolean;
  sidebarWidth: number;
  centerPaneRef: React.RefObject<CenterPaneHandle>;
}

export interface TopBarHandle {
  openAddLinkDialog: () => void;
  openAddTelegramDialog: () => void;
}

const TopBarComponent = (props: TopBarProps, ref: React.Ref<TopBarHandle>) => {
  const { onToggleSidebar, isSidebarOpen, onTogglePreview, isPreviewOpen, onToggleConversation, isConversationOpen, sidebarWidth, centerPaneRef } = props;
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined);
  const [isAddLinkDialogOpen, setIsAddLinkDialogOpen] = useState(false);
  const [savedLinks, setSavedLinks] = useState<
    Array<{ id: string; url: string; title: string; name: string; description?: string; favicon_url?: string; account_email?: string }>
  >([]);
  const [isEditingIslandName, setIsEditingIslandName] = useState(false);
  const [editingIslandName, setEditingIslandName] = useState('');
  const [linkContextMenu, setLinkContextMenu] = useState<{ linkId: string; x: number; y: number } | null>(null);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLinkData, setEditingLinkData] = useState<{ url: string; title: string; description: string }>({ url: '', title: '', description: '' });
  const isDraggingRef = useRef(false);
  const integrationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const integrationsDropdownRef = useRef<HTMLDivElement | null>(null);
  const islandNameInputRef = useRef<HTMLInputElement | null>(null);
  const selectedIsland = useIslandStore((state) => state.getSelectedIsland());
  const updateIsland = useIslandStore((state) => state.updateIsland);


  const handleSavedLinkDragStart = (
    e: React.DragEvent<HTMLElement>,
    linkId: string,
    url: string,
    title: string,
    displayName: string,
    description?: string
  ) => {
    isDraggingRef.current = true;

    const payload = {
      source: 'saved-link',
      linkId,
      url,
      label: displayName,
      title: displayName,
      description,
      favicon_url: buildFaviconUrl(url),
    };

    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleIntegrationDragEnd = (_e: React.DragEvent<HTMLElement>) => {
    isDraggingRef.current = false;
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openAddLinkDialog: () => setIsAddLinkDialogOpen(true),
    openAddTelegramDialog: () => {
      // TODO: Implement Telegram dialog
      console.log('Add Telegram account - coming soon');
    },
  }), []);

  useEffect(() => {
    if (!isIntegrationsOpen) return;
    const updateMaxHeight = () => {
      const trigger = integrationsTriggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const available = window.innerHeight - rect.bottom - 12; // small gutter below trigger
      setDropdownMaxHeight(available > 0 ? available : undefined);
    };
    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    return () => window.removeEventListener('resize', updateMaxHeight);
  }, [isIntegrationsOpen]);

  // Close integrations dropdown when clicking outside
  useEffect(() => {
    if (!isIntegrationsOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const insideDropdown = integrationsDropdownRef.current && integrationsDropdownRef.current.contains(target);
      const insideTrigger = integrationsTriggerRef.current && integrationsTriggerRef.current.contains(target);

      // Don't close if clicking inside the dropdown
      if (insideDropdown) {
        return;
      }
      // Don't close if clicking the trigger button
      if (insideTrigger) {
        return;
      }
      // Close on any other click (including center pane, sidebar, etc.)
      setIsIntegrationsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isIntegrationsOpen]);

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTextField =
        target?.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT';

      const isModifierOnly = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey;
      const isIntegrationsHotkey = isModifierOnly && e.code === 'KeyI';
      if (!isIntegrationsHotkey || isTextField) return;

      e.preventDefault();
      e.stopPropagation();
      setIsIntegrationsOpen((prev) => !prev);
    };

    window.addEventListener('keydown', handleShortcut, true);
    return () => window.removeEventListener('keydown', handleShortcut, true);
  }, []);


  // Load saved links for current island when integrations dropdown opens
  useEffect(() => {
    if (isIntegrationsOpen && selectedIsland) {
      objectsApi
        .list(selectedIsland.id)
        .then((objects) => {
          // Filter only link type objects
          const links = objects.filter(obj => obj.type === 'link');
          const mapped = links.map((link) => ({
            id: link.id,
            url: (link.metadata as any)?.url || link.title || '',
            title: link.title,
            name: getLinkDisplayName((link.metadata as any)?.url || link.title || '', link.title),
            description: link.description,
            favicon_url: (link.metadata as any)?.favicon_url || buildFaviconUrl((link.metadata as any)?.url || ''),
          }));
          setSavedLinks(mapped);
        })
        .catch((err) => {
          console.error('Failed to load saved links:', err);
        });
    } else if (!selectedIsland) {
      // Clear links if no island is selected
      setSavedLinks([]);
    }
  }, [isIntegrationsOpen, selectedIsland]);

  // Sync island name with editing state
  useEffect(() => {
    setEditingIslandName(selectedIsland?.name || '');
  }, [selectedIsland?.name]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingIslandName && islandNameInputRef.current) {
      islandNameInputRef.current.focus();
      islandNameInputRef.current.select();
    }
  }, [isEditingIslandName]);


  const handleAddLink = async (url: string, title: string, description: string) => {
    if (!selectedIsland) {
      alert('Please select an island first');
      return;
    }

    // Create link - auth will be handled per-tile when user opens it
    const favicon_url = buildFaviconUrl(url);

    try {
      await objectsApi.create(selectedIsland.id, {
        type: 'link',
        title,
        url,
        description,
        favicon_url,
        x: 200,
        y: 200,
      });

      // Reload saved links for current island
      const objects = await objectsApi.list(selectedIsland.id);
      const links = objects.filter(obj => obj.type === 'link');
      const mapped = links.map((link) => ({
        id: link.id,
        url: (link.metadata as any)?.url || link.title || '',
        title: link.title,
        name: getLinkDisplayName((link.metadata as any)?.url || link.title || '', link.title),
        description: link.description,
        favicon_url: (link.metadata as any)?.favicon_url || buildFaviconUrl((link.metadata as any)?.url || ''),
      }));
      setSavedLinks(mapped);
    } catch (err) {
      console.error('Failed to create link:', err);
      alert('Failed to add link. Please try again.');
    }
  };

  const handleIslandNameSubmit = async () => {
    if (selectedIsland && editingIslandName.trim() && editingIslandName.trim() !== selectedIsland.name) {
      await updateIsland(selectedIsland.id, editingIslandName.trim());
    } else {
      setEditingIslandName(selectedIsland?.name || '');
    }
    setIsEditingIslandName(false);
  };

  const handleIslandNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleIslandNameSubmit();
    } else if (e.key === 'Escape') {
      setEditingIslandName(selectedIsland?.name || '');
      setIsEditingIslandName(false);
    }
  };

  const handleLinkContextMenu = (e: React.MouseEvent, linkId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkContextMenu({ linkId, x: e.clientX, y: e.clientY });
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!selectedIsland) return;

    try {
      await objectsApi.delete(linkId);

      // Reload saved links
      const objects = await objectsApi.list(selectedIsland.id);
      const links = objects.filter(obj => obj.type === 'link');
      const mapped = links.map((link) => ({
        id: link.id,
        url: (link.metadata as any)?.url || link.title || '',
        title: link.title,
        name: getLinkDisplayName((link.metadata as any)?.url || link.title || '', link.title),
        description: link.description,
        favicon_url: (link.metadata as any)?.favicon_url || buildFaviconUrl((link.metadata as any)?.url || ''),
      }));
      setSavedLinks(mapped);
    } catch (err) {
      console.error('Failed to delete link:', err);
      alert('Failed to delete link. Please try again.');
    }

    setLinkContextMenu(null);
  };

  const handleEditLink = (linkId: string) => {
    const link = savedLinks.find(l => l.id === linkId);
    if (link) {
      setEditingLinkId(linkId);
      setEditingLinkData({
        url: link.url,
        title: link.title,
        description: link.description || ''
      });
    }
    setLinkContextMenu(null);
  };

  const handleSaveEditedLink = async (url: string, title: string, description: string) => {
    if (!selectedIsland || !editingLinkId) return;

    try {
      const favicon_url = buildFaviconUrl(url);
      await objectsApi.updateLink(editingLinkId, url, title, description || '', favicon_url);

      // Reload saved links
      const objects = await objectsApi.list(selectedIsland.id);
      const links = objects.filter(obj => obj.type === 'link');
      const mapped = links.map((link) => ({
        id: link.id,
        url: (link.metadata as any)?.url || link.title || '',
        title: link.title,
        name: getLinkDisplayName((link.metadata as any)?.url || link.title || '', link.title),
        description: link.description || '',
        favicon_url: (link.metadata as any)?.favicon_url || buildFaviconUrl((link.metadata as any)?.url || ''),
      }));
      setSavedLinks(mapped);
    } catch (err) {
      console.error('Failed to update link:', err);
      alert('Failed to update link. Please try again.');
    }

    setEditingLinkId(null);
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 relative z-[1000]">
      {/* Left section */}
      <div
        className="flex items-center gap-3 transition-all duration-200 z-10"
        style={{ marginLeft: isSidebarOpen ? `${sidebarWidth}px` : '0' }}
      >
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
            title="Open sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        {/* Integrations Dropdown */}
        <div className="relative">
          <button
            ref={integrationsTriggerRef}
            onClick={() => setIsIntegrationsOpen(!isIntegrationsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Integrations
            <ChevronDown size={16} className={`transition-transform ${isIntegrationsOpen ? 'rotate-180' : ''}`} />
          </button>

          {isIntegrationsOpen && (
            <>
              {/* Backdrop - allows drag events to pass through */}
              <div
                className="fixed inset-0 z-[100] pointer-events-none"
              />

              {/* Dropdown menu */}
              <div
                ref={integrationsDropdownRef}
                className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[200]"
                style={{
                  maxHeight: dropdownMaxHeight,
                  overflowY: dropdownMaxHeight ? 'auto' : undefined,
                  paddingRight: dropdownMaxHeight ? '0.35rem' : undefined,
                  backgroundColor: '#ffffff',
                  opacity: 1,
                }}
              >
                {/* Action Buttons */}
                <button
                  onClick={() => {
                    centerPaneRef.current?.addFiles();
                    setIsIntegrationsOpen(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <FilePlus size={16} />
                  <span>Add Local Files</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddLinkDialogOpen(true);
                    setIsIntegrationsOpen(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Link</span>
                </button>

                <button
                  onClick={() => {
                    // TODO: Add Telegram account connection logic
                    setIsIntegrationsOpen(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Telegram account</span>
                </button>

                {/* Divider */}
                <div className="my-1 border-t border-slate-200"></div>

                {/* Instruction text */}
                <div className="px-3.5 py-2 text-xs text-slate-500 whitespace-nowrap">
                  Drag and Drop to the Main Pane
                </div>

                {/* Saved Links - Direct List */}
                {savedLinks.map((link) => {
                  // Clean up URLs by removing protocol
                  let displayName = link.name.replace(/^https?:\/\//, '').replace(/\/$/, '');

                  return (
                    <div
                      key={link.id}
                      draggable
                      onDragStart={(e) =>
                        handleSavedLinkDragStart(e, link.id, link.url, link.title, link.name, link.description)
                      }
                      onDragEnd={handleIntegrationDragEnd}
                      onContextMenu={(e) => handleLinkContextMenu(e, link.id)}
                      className="w-full px-4 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                      title={link.description || link.url}
                    >
                      <div className="w-4 h-4 flex items-center justify-center shrink-0">
                        <img
                          src={link.favicon_url || FALLBACK_FAVICON}
                          alt=""
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_FAVICON;
                            e.currentTarget.style.display = 'block';
                          }}
                        />
                      </div>
                      <span className="truncate">{displayName}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Center section - Island Name (absolute positioned) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
        <div className="pointer-events-auto">
          {selectedIsland ? (
            isEditingIslandName ? (
              <input
                ref={islandNameInputRef}
                type="text"
                value={editingIslandName}
                onChange={(e) => setEditingIslandName(e.target.value)}
                onKeyDown={handleIslandNameKeyDown}
                onBlur={handleIslandNameSubmit}
                className="text-xl font-semibold text-slate-900 bg-transparent outline-none focus:ring-0 focus:outline-none border-none p-0 m-0 text-center max-w-md"
              />
            ) : (
              <h1
                onDoubleClick={() => setIsEditingIslandName(true)}
                className="text-xl font-semibold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                title="Double-click to rename"
              >
                {selectedIsland.name}
              </h1>
            )
          ) : (
            <span className="text-xl font-semibold text-slate-400">No Island Selected</span>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Right section */}
      <div className="flex items-center gap-2 z-10">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-64"
          />
        </div>

        <button
          onClick={onTogglePreview}
          className={`p-2 rounded-lg transition-colors ${
            isPreviewOpen
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle preview"
        >
          <PanelRight size={20} />
        </button>
        <button
          onClick={onToggleConversation}
          className={`p-2 rounded-lg transition-colors ${
            isConversationOpen
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title="Toggle conversation"
        >
          <MessageCircle size={20} />
        </button>
        <button
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Add Link Dialog */}
      <AddLinkDialog
        isOpen={isAddLinkDialogOpen}
        onClose={() => setIsAddLinkDialogOpen(false)}
        onAdd={handleAddLink}
      />

      {/* Edit Link Dialog */}
      <EditLinkDialog
        isOpen={!!editingLinkId}
        onClose={() => setEditingLinkId(null)}
        onSave={handleSaveEditedLink}
        initialUrl={editingLinkData.url}
        initialTitle={editingLinkData.title}
        initialDescription={editingLinkData.description}
      />

      {/* Link Context Menu */}
      {linkContextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setLinkContextMenu(null)}
          />
          <div
            className="fixed z-50 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
            style={{ left: `${linkContextMenu.x}px`, top: `${linkContextMenu.y}px` }}
          >
            <button
              onClick={() => handleEditLink(linkContextMenu.linkId)}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={() => handleDeleteLink(linkContextMenu.linkId)}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </header>
  );
};

export const TopBar = forwardRef(TopBarComponent);
TopBar.displayName = 'TopBar';

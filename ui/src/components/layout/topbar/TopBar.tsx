import React, { useEffect, useRef, useState } from 'react';
import { Menu, Settings, Link2, MessageCircle, PanelRight, ChevronDown, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { IntStorageIcon } from '../../../features/intstorage/IntStorageIcon';
import { GmailIcon } from '../../icons/GoogleServiceIcons';
import { WebviewWindow } from '@tauri-apps/api/window';
import { AddLinkDialog } from '../../dialogs/AddLinkDialog';
import { EditLinkDialog } from '../../dialogs/EditLinkDialog';
import { AccountSelectionDialog } from '../../dialogs/AccountSelectionDialog';
import { useIslandStore } from '../../../stores/islandStore';
import { objectsApi } from '../../../api/objects';
import { internalStorageApi } from '../../../api/internalStorage';
import { buildFaviconUrl, FALLBACK_FAVICON } from '../../../utils/favicon';

interface GoogleAccount {
  email: string;
  scopes: string[];
  connected_at: string;
}

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

const isGmailUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'mail.google.com' || urlObj.hostname === 'gmail.com';
  } catch {
    return false;
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
}

export function TopBar({ onToggleSidebar, isSidebarOpen, onTogglePreview, isPreviewOpen, onToggleConversation, isConversationOpen, sidebarWidth }: TopBarProps) {
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isGoogleMenuOpen, setIsGoogleMenuOpen] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [isAccountSelectionOpen, setIsAccountSelectionOpen] = useState(false);
  const [pendingGmailLink, setPendingGmailLink] = useState<{url: string; title: string; description: string} | null>(null);
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
  const [accountContextMenu, setAccountContextMenu] = useState<{ email: string; x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const integrationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const integrationsDropdownRef = useRef<HTMLDivElement | null>(null);
  const googleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const googleWindowRef = useRef<Window | null>(null);
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

  const handleOpenInternalStorage = async () => {
    try {
      await internalStorageApi.open();
    } catch (err) {
      console.error('Failed to open internal storage:', err);
    }
  };

  const handleAddFiles = async () => {
    try {
      // Use Tauri's file dialog to select files
      const { open } = await import('@tauri-apps/api/dialog');
      const selected = await open({
        multiple: true,
        title: 'Select files to add',
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        // Emit the same event as OS file drops
        const customEvent = new CustomEvent('os-file-drop-received', {
          detail: { paths }
        });
        window.dispatchEvent(customEvent);
      }
    } catch (err) {
      console.error('Failed to select files:', err);
    }
  };

  const handleIntegrationDragEnd = (_e: React.DragEvent<HTMLElement>) => {
    isDraggingRef.current = false;
    // Close dropdown after drag completes
    setTimeout(() => setIsIntegrationsOpen(false), 100);
  };

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

      // Check if clicking on a draggable element or its child
      const isDraggableElement = target.draggable || target.closest('[draggable="true"]');

      // Don't close if clicking on a draggable element (starting a drag)
      if (isDraggableElement) {
        return;
      }

      // Don't close if clicking inside the dropdown (could be starting a drag)
      if (insideDropdown) {
        return;
      }
      // Don't close if clicking the trigger button
      if (insideTrigger) {
        return;
      }
      // Close if clicking outside
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

  // Persist Google connection state
  useEffect(() => {
    localStorage.setItem('googleConnected', String(isGoogleConnected));
  }, [isGoogleConnected]);

  // Always start disconnected until user completes an explicit OAuth flow
  useEffect(() => {
    setIsGoogleConnected(false);
    setIsGoogleSigningIn(false);
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

  // Check backend status and load accounts on mount
  useEffect(() => {
    let cancelled = false;
    const loadStatusAndAccounts = async () => {
      try {
        const [statusRes, accountsRes] = await Promise.allSettled([
          fetch('/api/google/status'),
          fetch('/api/google/accounts'),
        ]);

        if (!cancelled && statusRes.status === 'fulfilled' && statusRes.value.ok) {
          const statusData = await statusRes.value.json();
          const connected = statusData?.connected && !statusData?.requires_reauth;
          setIsGoogleConnected(!!connected);
        }

        if (!cancelled && accountsRes.status === 'fulfilled' && accountsRes.value.ok) {
          const data = await accountsRes.value.json();
          const accounts = data.accounts || [];
          setGoogleAccounts(accounts);
        }
      } catch {
        // Ignore backend issues at startup
      }
    };
    loadStatusAndAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll status while signing in to detect completion
  useEffect(() => {
    if (!isGoogleSigningIn) return;
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/google/status');
        if (!res.ok) {
          console.log('Status check failed:', res.status);
          return false;
        }
        const data = await res.json();
        console.log('Status check result:', data);
        if (cancelled) return false;
        if (data?.connected && !data?.requires_reauth) {
          console.log('Connected! Updating UI...');
          setIsGoogleConnected(true);
          setIsGoogleSigningIn(false);

          // Auto-close the OAuth window
          if (googleWindowRef.current) {
            try {
              googleWindowRef.current.close();
            } catch (e) {
              console.log('Window already closed');
            }
            googleWindowRef.current = null;
          }

          // Load all Google accounts to get the newly authenticated one
          try {
            const accountsRes = await fetch('/api/google/accounts');
            if (accountsRes.ok) {
              const accountsData = await accountsRes.json();
              const accounts = accountsData.accounts || [];
              setGoogleAccounts(accounts);
              setIsGoogleConnected(true);

              // If there's a pending Gmail link, create it with the newly authenticated account
              if (pendingGmailLink && accounts.length > 0) {
                // Get the most recently connected account (last in the list)
                const newestAccount = accounts[accounts.length - 1];
                await createGmailLinkWithAccount(
                  pendingGmailLink.url,
                  pendingGmailLink.title,
                  pendingGmailLink.description,
                  newestAccount.email
                );
                setPendingGmailLink(null);
              }
            }
          } catch (err) {
            console.error('Failed to load accounts after OAuth:', err);
          }

          return true;
        }
        // Explicitly mark disconnected when status is false or requires reauth
        setIsGoogleConnected(false);
      } catch (err) {
        console.error('Status check error:', err);
      }
      return false;
    };

    // Check immediately
    checkStatus();

    // Then poll every 500ms
    const interval = window.setInterval(async () => {
      const connected = await checkStatus();
      if (connected) {
        window.clearInterval(interval);
        return;
      }
    }, 500);

    // Stop polling after 5 minutes (timeout)
    const timeout = window.setTimeout(() => {
      setIsGoogleSigningIn(false);
      window.clearInterval(interval);
    }, 300000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [isGoogleSigningIn]);

  const handleGoogleSignIn = () => {
    const run = async () => {
      try {
        // Begin sign-in flow immediately
        setIsGoogleSigningIn(true);
        setIsGoogleConnected(false);

        // Ensure backend session is cleared so status doesn't short-circuit to "connected"
        try {
          await fetch('/api/google/disconnect', { method: 'POST' });
        } catch (cleanupErr) {
          console.warn('Failed to pre-clear Google session before sign-in:', cleanupErr);
        }

        console.log('Fetching Google auth URL...');
        const res = await fetch('/api/google/auth/url');
        console.log('Response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch Google auth URL: ${res.status}`);
        }

        const data = await res.json();
        console.log('Auth data received:', data);

        if (data?.auth_url) {
          console.log('Opening auth URL:', data.auth_url);
          // Try Tauri webview first, then fall back to browser popup
          try {
            const webview = new WebviewWindow('google-oauth', {
              url: data.auth_url,
              title: 'Sign in with Google',
              width: 500,
              height: 600,
              resizable: true,
              center: true,
              alwaysOnTop: false,
              decorations: true,
              skipTaskbar: false,
            });

            console.log('WebviewWindow created:', webview.label);

            googleWindowRef.current = webview as any;
            webview.once('tauri://destroyed', () => {
              console.log('OAuth window closed');
              googleWindowRef.current = null;
            });
          } catch (windowError) {
            console.warn('WebviewWindow unavailable, falling back to window.open:', windowError);
            const win = window.open(
              data.auth_url,
              'google-oauth',
              'width=500,height=600,resizable=yes,scrollbars=yes'
            );
            if (!win) {
              throw new Error('Failed to open OAuth window. Please allow popups and try again.');
            }
            googleWindowRef.current = win as any;
          }

          // If the user closes the popup manually, stop polling after a short delay
          const closer = setInterval(() => {
            const w = googleWindowRef.current as any;
            if (w && typeof w.closed === 'boolean' && w.closed) {
              clearInterval(closer);
              googleWindowRef.current = null;
              setIsGoogleSigningIn(false);
            }
          }, 500);
        } else {
          throw new Error('Missing auth_url in response');
        }
      } catch (err) {
        console.error('Google sign-in error:', err);
        const message = err instanceof Error ? err.message : 'Could not start Google sign-in. Please try again.';
        alert(message);
      } finally {
        // keep menu open to show status while polling
      }
    };
    run();
  };

  const handleGoogleSignOut = () => {
    const run = async () => {
      try {
        const res = await fetch('/api/google/disconnect', { method: 'POST' });
        if (!res.ok) throw new Error('Failed to sign out');
        setIsGoogleConnected(false);
        setIsGoogleSigningIn(false);
      } catch (err) {
        console.error(err);
        alert('Could not sign out from Google. Please try again.');
      } finally {
        setIsGoogleMenuOpen(false);
      }
    };
    run();
  };

  const googleStatusColor = isGoogleConnected && !isGoogleSigningIn ? 'bg-emerald-500' : 'bg-red-500';
  const googleTitle = isGoogleConnected
    ? 'Google Authorisation is On. Click to manage.'
    : 'Google Authorisation is Off. Click to sign in.';

  const createGmailLinkWithAccount = async (url: string, title: string, description: string, accountEmail: string) => {
    if (!selectedIsland) return;

    try {
      const favicon_url = buildFaviconUrl(url);
      await objectsApi.create(selectedIsland.id, {
        type: 'link',
        title: title || accountEmail,
        url,
        description: description || `Gmail - ${accountEmail}`,
        favicon_url,
        x: 200,
        y: 200,
      });

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
        account_email: (link.metadata as any)?.account_email,
      }));
      setSavedLinks(mapped);
    } catch (err) {
      console.error('Failed to create Gmail link:', err);
      alert('Failed to add Gmail link. Please try again.');
    }
  };

  const handleAddLink = async (url: string, title: string, description: string) => {
    if (!selectedIsland) {
      alert('Please select an island first');
      return;
    }

    // Check if it's a Gmail URL - always trigger OAuth for new Gmail links
    if (isGmailUrl(url)) {
      // Store pending link and trigger OAuth flow
      setPendingGmailLink({ url, title, description });
      handleGoogleSignIn();
      return;
    }

    // Regular link handling
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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4">
      {/* Left section */}
      <div
        className="flex items-center gap-3 transition-all duration-200"
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
        <div className="relative z-30">
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
              {/* Dropdown menu */}
              <div
                ref={integrationsDropdownRef}
                className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"
                style={{
                  maxHeight: dropdownMaxHeight,
                  overflowY: dropdownMaxHeight ? 'auto' : undefined,
                  paddingRight: dropdownMaxHeight ? '0.35rem' : undefined,
                }}
              >
                {/* Instruction text */}
                <div className="px-3.5 py-2 text-xs text-slate-500 whitespace-nowrap">
                  Drag and Drop to the Main Pane
                </div>

                {/* Saved Links - Direct List */}
                {savedLinks.map((link) => {
                  const isGmail = isGmailUrl(link.url);
                  const displayName = isGmail && link.description?.includes('Gmail - ')
                    ? link.description.replace('Gmail - ', '')
                    : link.name;

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
                        {isGmail ? (
                          <GmailIcon size={14} />
                        ) : (
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
                        )}
                      </div>
                      <span className="truncate">{displayName}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Internal Storage quick action */}
        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer no-drag"
            title="Internal Storage - Click to add files"
            onClick={handleAddFiles}
          >
            <IntStorageIcon size={16} />
            Add Files
          </button>
        </div>

        <div className="relative z-20">
          <button
            ref={googleTriggerRef}
            onClick={() => setIsGoogleMenuOpen((prev) => !prev)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title={googleTitle}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${googleStatusColor}`} />
            <span className="text-xs font-medium text-slate-600">My Google Accounts</span>
          </button>

          {isGoogleMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsGoogleMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
                {googleAccounts.length > 0 ? (
                  googleAccounts.map((account) => (
                    <div
                      key={account.email}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setAccountContextMenu({ email: account.email, x: e.clientX, y: e.clientY });
                      }}
                      className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-sm text-slate-700 truncate">
                        <span className="truncate">{account.email}</span>
                        <div className={`w-2.5 h-2.5 rounded-full ${googleStatusColor}`} />
                      </div>
                      <button
                      onClick={isGoogleConnected ? handleGoogleSignOut : handleGoogleSignIn}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900"
                    >
                      {isGoogleConnected ? 'Sign Out' : 'Sign In'}
                    </button>
                  </div>
                ))
              ) : (
                  <>
                    <div className="px-3 py-2 text-xs text-slate-500">No Google accounts</div>
                    <button
                      onClick={handleGoogleSignIn}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Account Context Menu */}
        {accountContextMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setAccountContextMenu(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setAccountContextMenu(null);
              }}
            />
            <div
              className="fixed z-50 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
              style={{ left: `${accountContextMenu.x}px`, top: `${accountContextMenu.y}px` }}
            >
              <button
                onClick={async () => {
                  const email = accountContextMenu.email;
                  setAccountContextMenu(null);
                  try {
                    const res = await fetch(`/api/google/accounts/${encodeURIComponent(email)}`, { method: 'DELETE' });
                    if (!res.ok) {
                      const text = await res.text();
                      throw new Error(text || 'Failed to remove Google account');
                    }
                    setGoogleAccounts((prev) => prev.filter((a) => a.email !== email));
                    setIsGoogleConnected(false);
                  } catch (err) {
                    console.error('Failed to remove Google account', err);
                    alert('Failed to remove Google account. Please try again.');
                  }
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Remove account
              </button>
            </div>
          </>
        )}

        {/* Add Link Button */}
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Add a link/website"
          onClick={() => setIsAddLinkDialogOpen(true)}
        >
          <Plus size={16} />
          Add link
        </button>

        {/* Telegram Account Button */}
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 bg-slate-100 rounded-lg cursor-not-allowed"
          title="Add Telegram account (coming soon)"
          disabled
        >
          <Plus size={16} />
          Add Telegram account
        </button>
      </div>

      {/* Center section - Island Name */}
      <div className="flex-1 flex items-center justify-center px-4">
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

      {/* Right section */}
      <div className="flex items-center gap-2">
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

      {/* Account Selection Dialog */}
      <AccountSelectionDialog
        isOpen={isAccountSelectionOpen}
        onClose={() => setIsAccountSelectionOpen(false)}
        accounts={googleAccounts}
        onSelectAccount={(email) => {
          if (pendingGmailLink) {
            createGmailLinkWithAccount(
              pendingGmailLink.url,
              pendingGmailLink.title,
              pendingGmailLink.description,
              email
            );
            setPendingGmailLink(null);
          }
        }}
        onAddNewAccount={() => {
          handleGoogleSignIn();
        }}
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
}

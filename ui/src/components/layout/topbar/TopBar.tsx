import React, { useEffect, useRef, useState } from 'react';
import { Menu, Settings, Link2, MessageCircle, PanelRight, ChevronDown, Mail, Database, Cloud, ChevronRight, Plus, Search } from 'lucide-react';
import { GmailIcon, DriveIcon, SheetsIcon, DocsIcon, SlidesIcon, GoogleIcon } from '../../icons/GoogleServiceIcons';

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
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);
  const [isLinksExpanded, setIsLinksExpanded] = useState(false);
  const [isDatabasesExpanded, setIsDatabasesExpanded] = useState(false);
  const [isCloudExpanded, setIsCloudExpanded] = useState(false);
  const [isGoogleMenuOpen, setIsGoogleMenuOpen] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(() => {
    const stored = localStorage.getItem('googleConnected');
    return stored === 'true' ? true : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined);
  const isDraggingRef = useRef(false);
  const integrationsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const integrationsDropdownRef = useRef<HTMLDivElement | null>(null);
  const googleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const googleWindowRef = useRef<Window | null>(null);
  const googleIntegrations: { provider: string; key: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] =
    [
      { provider: 'google', key: 'gmail', label: 'Gmail', Icon: GmailIcon },
      { provider: 'google', key: 'drive', label: 'Google Drive', Icon: DriveIcon },
      { provider: 'google', key: 'sheets', label: 'Google Sheets', Icon: SheetsIcon },
      { provider: 'google', key: 'docs', label: 'Google Docs', Icon: DocsIcon },
      { provider: 'google', key: 'slides', label: 'Google Slides', Icon: SlidesIcon },
      { provider: 'google', key: 'google', label: 'All Google Services', Icon: GoogleIcon },
    ];

  const emailIntegrations: { provider: string; key: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [];
  const linkIntegrations: { provider: string; key: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [];
  const databaseIntegrations: { provider: string; key: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [];
  const cloudIntegrations: { provider: string; key: string; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [];


  const handleIntegrationDrag = (_e: React.DragEvent<HTMLElement>) => {
    // Drag in progress
  };

  const handleIntegrationDragStart = (
    e: React.DragEvent<HTMLElement>,
    provider: string,
    integrationKey: string,
    label: string
  ) => {
    isDraggingRef.current = true;

    const payload = {
      source: 'integration',
      provider,
      key: integrationKey,
      label,
    };

    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
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

  // Check backend status on mount (best-effort)
  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/google/status');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data?.connected === 'boolean') {
          setIsGoogleConnected(data.connected);
        }
      } catch {
        // Ignore network/backend issues; fall back to local state
      }
    };
    checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll status while signing in to detect completion
  useEffect(() => {
    if (!isGoogleSigningIn) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch('/api/google/status');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.connected) {
          setIsGoogleConnected(true);
          setIsGoogleSigningIn(false);
          if (googleWindowRef.current && !googleWindowRef.current.closed) {
            googleWindowRef.current.close();
          }
          setIsGoogleMenuOpen(false);
        }
      } catch {
        // ignore
      }
      // Stop polling if user closed popup
      if (googleWindowRef.current && googleWindowRef.current.closed) {
        setIsGoogleSigningIn(false);
      }
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isGoogleSigningIn]);

  const handleGoogleSignIn = () => {
    const run = async () => {
      try {
        const res = await fetch('/api/google/auth/url');
        if (!res.ok) throw new Error('Failed to fetch Google auth URL');
        const data = await res.json();
        if (data?.auth_url) {
          const win = window.open(data.auth_url, '_blank', 'noopener,noreferrer');
          googleWindowRef.current = win || null;
          setIsGoogleSigningIn(true);
        } else {
          throw new Error('Missing auth_url in response');
        }
      } catch (err) {
        console.error(err);
        alert('Could not start Google sign-in. Please try again.');
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

  const googleStatusColor = isGoogleConnected ? 'bg-emerald-500' : 'bg-red-500';
  const googleTitle = isGoogleConnected
    ? 'Google Authorisation is On. Click to manage.'
    : 'Google Authorisation is Off. Click to sign in.';

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
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

                {googleIntegrations.map(({ provider, key, label, Icon }) => (
                  <button
                    key={key}
                    draggable
                    onDragStart={(e) => handleIntegrationDragStart(e, provider, key, label)}
                    onDrag={handleIntegrationDrag}
                    onDragEnd={handleIntegrationDragEnd}
                    className="w-full px-4 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
                <div className="border-t border-slate-200 my-1" />

                {/* Email Section */}
                <div>
                  <button
                    onClick={() => setIsEmailExpanded(!isEmailExpanded)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-slate-600" />
                      Email
                    </div>
                    <ChevronRight size={14} className={`transition-transform ${isEmailExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isEmailExpanded && (
                    <div className="space-y-1">
                      {emailIntegrations.map(({ provider, key, label, Icon }) => (
                        <div
                          key={key}
                          draggable={true}
                          onDragStart={(e) => handleIntegrationDragStart(e, provider, key, label)}
                          onDragEnd={handleIntegrationDragEnd}
                          className="w-full px-4 py-2 pl-10 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                        >
                          <Icon size={14} />
                          {label}
                        </div>
                      ))}
                      <button className="w-full px-4 py-2 pl-10 text-left text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Plus size={14} />
                        Add Custom Email
                      </button>
                    </div>
                  )}
                </div>

                {/* Links Section */}
                <div>
                  <button
                    onClick={() => setIsLinksExpanded(!isLinksExpanded)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Link2 size={16} className="text-indigo-600" />
                      Links
                    </div>
                    <ChevronRight size={14} className={`transition-transform ${isLinksExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isLinksExpanded && (
                    <div className="space-y-1">
                      {linkIntegrations.map(({ provider, key, label, Icon }) => (
                        <div
                          key={key}
                          draggable={true}
                          onDragStart={(e) => handleIntegrationDragStart(e, provider, key, label)}
                          onDragEnd={handleIntegrationDragEnd}
                          className="w-full px-4 py-2 pl-10 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                        >
                          <Icon size={14} />
                          {label}
                        </div>
                      ))}
                      <button className="w-full px-4 py-2 pl-10 text-left text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Plus size={14} />
                        Add a link/website
                      </button>
                    </div>
                  )}
                </div>

                {/* Databases Section */}
                <div>
                  <button
                    onClick={() => setIsDatabasesExpanded(!isDatabasesExpanded)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-purple-600" />
                      Databases
                    </div>
                    <ChevronRight size={14} className={`transition-transform ${isDatabasesExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isDatabasesExpanded && (
                    <div className="space-y-1">
                      {databaseIntegrations.map(({ provider, key, label, Icon }) => (
                        <div
                          key={key}
                          draggable={true}
                          onDragStart={(e) => handleIntegrationDragStart(e, provider, key, label)}
                          onDragEnd={handleIntegrationDragEnd}
                          className="w-full px-4 py-2 pl-10 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                        >
                          <Icon size={14} />
                          {label}
                        </div>
                      ))}
                      <button className="w-full px-4 py-2 pl-10 text-left text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Plus size={14} />
                        Add Database
                      </button>
                    </div>
                  )}
                </div>

                {/* Cloud Section */}
                <div>
                  <button
                    onClick={() => setIsCloudExpanded(!isCloudExpanded)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud size={16} className="text-sky-500" />
                      Cloud
                    </div>
                    <ChevronRight size={14} className={`transition-transform ${isCloudExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  {isCloudExpanded && (
                    <div className="space-y-1">
                      {cloudIntegrations.map(({ provider, key, label, Icon }) => (
                        <div
                          key={key}
                          draggable={true}
                          onDragStart={(e) => handleIntegrationDragStart(e, provider, key, label)}
                          onDragEnd={handleIntegrationDragEnd}
                          className="w-full px-4 py-2 pl-10 flex items-center gap-2 cursor-grab active:cursor-grabbing"
                        >
                          <Icon size={14} />
                          {label}
                        </div>
                      ))}
                      <button className="w-full px-4 py-2 pl-10 text-left text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2">
                        <Plus size={14} />
                        Add Cloud
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative z-20">
          <button
            ref={googleTriggerRef}
            onClick={() => setIsGoogleMenuOpen((prev) => !prev)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title={googleTitle}
          >
            <div className={`w-2 h-2 rounded-full ${googleStatusColor}`} />
            <span className="text-xs font-medium text-slate-600">Google</span>
          </button>

          {isGoogleMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsGoogleMenuOpen(false)} />
              <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
                <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-100 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${googleStatusColor}`} />
                  {isGoogleConnected ? 'Connected' : 'Not connected'}
                </div>
                {isGoogleConnected ? (
                  <button
                    onClick={handleGoogleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </>
          )}
        </div>
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
    </header>
  );
}

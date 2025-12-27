import React, { forwardRef, useImperativeHandle } from 'react';
import { Menu, Settings, MessageCircle, PanelRight, ChevronDown, Search, Edit2, Trash2 } from 'lucide-react';
import { GmailIcon } from '../../icons/GoogleServiceIcons';
import { EditLinkDialog } from '../../dialogs/EditLinkDialog';
import { FALLBACK_FAVICON } from '../../../utils/favicon';
import { Z_INDEX } from '../../../constants/zIndex';
import { FONT_ROLES } from '../../../styles/fontManager';
import { useTopBarLogic } from './useTopBarLogic';
import { TopBarProps, TopBarHandle } from './types';

export type { TopBarHandle } from './types';

const TopBarComponent = (props: TopBarProps, ref: React.Ref<TopBarHandle>) => {
  const { onToggleSidebar, isSidebarOpen, onTogglePreview, isPreviewOpen, onToggleConversation, isConversationOpen, sidebarWidth, centerPaneRef } = props;

  const logic = useTopBarLogic(centerPaneRef);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({}), []);

  return (
    <header className="h-14 glass-panel flex items-center px-4 relative" style={{ zIndex: Z_INDEX.TOPBAR, borderBottom: '1px solid var(--color-border-subtle)' }}>
      {/* Left section */}
      <div
        className="flex items-center gap-3 transition-all duration-200"
        style={{ marginLeft: isSidebarOpen ? `${sidebarWidth}px` : '0', zIndex: Z_INDEX.BASE_RAISED }}
      >
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Open sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        {/* Integrations Dropdown */}
        <div className="relative">
          <button
            ref={logic.integrationsTriggerRef}
            onClick={() => logic.setIsIntegrationsOpen(!logic.isIntegrationsOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
            style={{
              ...FONT_ROLES.topbarControl,
              color: 'var(--color-text-primary)',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
          >
            Integrations
            <ChevronDown size={16} className={`transition-transform ${logic.isIntegrationsOpen ? 'rotate-180' : ''}`} />
          </button>

          {logic.isIntegrationsOpen && (
            <>
              {/* Backdrop - allows drag events to pass through */}
              <div
                className="fixed inset-0 pointer-events-none"
                style={{ zIndex: Z_INDEX.DROPDOWN_BACKDROP }}
              />

              {/* Dropdown menu */}
              <div
                ref={logic.integrationsDropdownRef}
                className="absolute left-0 top-full mt-1 w-52 glass-panel py-1"
                style={{
                  zIndex: Z_INDEX.DROPDOWN_MENU,
                  maxHeight: logic.dropdownMaxHeight,
                  overflowY: logic.dropdownMaxHeight ? 'auto' : undefined,
                  paddingRight: logic.dropdownMaxHeight ? '0.35rem' : undefined,
                }}
              >
                {/* Instruction text */}
                <div
                  className="px-3.5 py-2 text-slate-500 whitespace-nowrap"
                  style={FONT_ROLES.topbarMeta}
                >
                  Links on Canvas
                </div>

                {/* Saved Links - Read-only List */}
                {logic.savedLinks.map((link) => {
                  // Clean up URLs by removing protocol
                  const displayName = link.name.replace(/^https?:\/\//, '').replace(/\/$/, '');
                  const isGmail =
                    (link.url || '').toLowerCase().includes('mail.google.com') ||
                    (link.url || '').toLowerCase().includes('gmail.com');

                  const iconNode = isGmail ? (
                    <GmailIcon size={16} />
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
                  );

                  return (
                    <div
                      key={link.id}
                      onContextMenu={(e) => logic.handleLinkContextMenu(e, link.id)}
                      className="w-full px-4 py-2 flex items-center gap-2 cursor-pointer text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                      title={link.description || link.url}
                    >
                      <div className="w-4 h-4 flex items-center justify-center shrink-0">
                        {iconNode}
                      </div>
                      <span className="truncate" style={FONT_ROLES.topbarControl}>{displayName}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

      </div>

      {/* Center section - Island Name (absolute positioned) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ zIndex: Z_INDEX.BASE }}>
        <div className="pointer-events-auto">
          {logic.selectedIsland ? (
            logic.isEditingIslandName ? (
              <input
                ref={logic.islandNameInputRef}
                type="text"
                value={logic.editingIslandName}
                onChange={(e) => logic.setEditingIslandName(e.target.value)}
                onKeyDown={logic.handleIslandNameKeyDown}
                onBlur={logic.handleIslandNameSubmit}
                className="text-slate-900 bg-transparent outline-none focus:ring-0 focus:outline-none border-none p-0 m-0 text-center max-w-md"
                style={FONT_ROLES.topbarTitle}
              />
            ) : (
              <h1
                onDoubleClick={() => logic.setIsEditingIslandName(true)}
                className="cursor-pointer transition-colors"
                style={{
                  ...FONT_ROLES.topbarTitle,
                  color: 'var(--primary-color)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textShadow = '0 0 10px var(--glow)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textShadow = 'none';
                }}
                title="Double-click to rename"
              >
                {logic.selectedIsland.name}
              </h1>
            )
          ) : (
            <span style={{ ...FONT_ROLES.topbarTitle, color: 'var(--color-text-muted)' }}>No Island Selected</span>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Right section */}
      <div className="flex items-center gap-2" style={{ zIndex: Z_INDEX.BASE_RAISED }}>
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <input
            type="text"
            value={logic.searchQuery}
            onChange={(e) => logic.setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-9 pr-3 py-1.5 rounded-lg focus:outline-none w-64"
            style={{
              ...FONT_ROLES.topbarControl,
              background: 'var(--glass-bg)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-subtle)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary-color)';
              e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <button
          onClick={onTogglePreview}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: isPreviewOpen ? 'var(--glass-bg)' : 'transparent',
            color: isPreviewOpen ? 'var(--primary-color)' : 'var(--color-text-secondary)',
            border: isPreviewOpen ? '1px solid var(--color-border-strong)' : '1px solid transparent',
            boxShadow: isPreviewOpen ? '0 0 10px var(--shadow)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isPreviewOpen) {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isPreviewOpen) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
          title="Toggle preview"
        >
          <PanelRight size={20} />
        </button>
        <button
          onClick={onToggleConversation}
          className="p-2 rounded-lg transition-colors"
          style={{
            background: isConversationOpen ? 'var(--glass-bg)' : 'transparent',
            color: isConversationOpen ? 'var(--primary-color)' : 'var(--color-text-secondary)',
            border: isConversationOpen ? '1px solid var(--color-border-strong)' : '1px solid transparent',
            boxShadow: isConversationOpen ? '0 0 10px var(--shadow)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isConversationOpen) {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isConversationOpen) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
          title="Toggle conversation"
        >
          <MessageCircle size={20} />
        </button>
        <button
          className="p-2 rounded-lg transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
            transition: 'all var(--transition-base)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--glass-bg)';
            e.currentTarget.style.color = 'var(--primary-color)';
            e.currentTarget.style.boxShadow = '0 0 10px var(--shadow)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Edit Link Dialog */}
      <EditLinkDialog
        isOpen={!!logic.editingLinkId}
        onClose={() => logic.setEditingLinkId(null)}
        onSave={logic.handleSaveEditedLink}
        initialUrl={logic.editingLinkData.url}
        initialTitle={logic.editingLinkData.title}
        initialDescription={logic.editingLinkData.description}
      />

      {/* Link Context Menu */}
      {logic.linkContextMenu && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: Z_INDEX.CONTEXT_MENU_BACKDROP }}
            onClick={() => logic.setLinkContextMenu(null)}
          />
          <div
            className="fixed w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1"
            style={{
              zIndex: Z_INDEX.CONTEXT_MENU,
              left: `${logic.linkContextMenu.x}px`,
              top: `${logic.linkContextMenu.y}px`
            }}
          >
            <button
              onClick={() => logic.handleEditLink(logic.linkContextMenu!.linkId)}
              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2"
              style={FONT_ROLES.topbarControl}
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={() => logic.handleDeleteLink(logic.linkContextMenu!.linkId)}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              style={FONT_ROLES.topbarControl}
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

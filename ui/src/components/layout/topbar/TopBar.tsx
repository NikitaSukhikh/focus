import React, { forwardRef, useImperativeHandle } from 'react';
import { Menu, X, Settings, MessageCircle, PanelRight, Search, Grid3x3, Slash, ZoomIn, ZoomOut } from 'lucide-react';
import { Z_INDEX } from '../../../constants/zIndex';
import { FONT_ROLES } from '../../../styles/fontManager';
import { useTopBarLogic } from './useTopBarLogic';
import { TopBarProps, TopBarHandle } from './types';
import { TagsButton, TagsMenu, useTagsDropdown, TagColor } from './tags';

export type { TopBarHandle } from './types';

// TopBar renders the global header controls (sidebar toggle, island title editor, search, preview toggles, zoom) and wires them to layout state.
const TopBarComponent = (props: TopBarProps, ref: React.Ref<TopBarHandle>) => {
  const { onToggleSidebar, isSidebarOpen, onTogglePreview, isPreviewOpen, onToggleConversation, isConversationOpen, sidebarWidth, centerPaneRef, onToggleGrid, isGridMode, onZoomIn, onZoomOut, zoom, onTagsClick, isTagsOpen, onTagSelect } = props;

  const logic = useTopBarLogic(centerPaneRef);
  const tagsDropdown = useTagsDropdown({ isOpenProp: isTagsOpen, onToggle: onTagsClick });

  const handleTagSelect = (color: TagColor) => {
    onTagSelect?.(color);
    tagsDropdown.close();
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({}), []);

  return (
    <header className="h-14 glass-panel flex items-center px-4 relative" style={{ zIndex: Z_INDEX.TOPBAR, borderBottom: '1px solid var(--color-border-subtle)' }}>
      {/* Left section */}
      <div
        className="flex items-center gap-3 transition-all duration-200"
        style={{ marginLeft: '0', zIndex: Z_INDEX.BASE_RAISED }}
      >
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
          title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2 mr-2">
          <span
            style={{
              ...FONT_ROLES.topbarTitle,
              fontWeight: 800,
              fontSize: '22px',
              color: 'var(--primary-color)',
              letterSpacing: '0.02em',
            }}
          >
            Ocean
          </span>
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

        <div className="relative" style={{ zIndex: Z_INDEX.DROPDOWN_MENU }}>
          <TagsButton ref={tagsDropdown.triggerRef} onClick={tagsDropdown.toggleOpen} isActive={tagsDropdown.isOpen} />
          <TagsMenu ref={tagsDropdown.menuRef} isOpen={tagsDropdown.isOpen} onSelect={handleTagSelect} />
        </div>

        <div className="flex items-center gap-0 px-1 py-0.5 rounded-lg" style={{ background: 'var(--glass-bg)' }}>
          <button
            disabled
            className="px-[10px] py-1 rounded-md transition-colors translate-x-[6px]"
            style={{
              color: 'var(--color-text-secondary)',
              opacity: 0.5,
            }}
            title="Zoom control"
          >
            <ZoomOut size={18} className="opacity-75" />
          </button>
          <div style={{ ...FONT_ROLES.topbarControl, color: 'var(--color-text-primary)' }} className="px-1.5 select-none min-w-[48px] text-center">
            {(zoom * 100).toFixed(0)}%
          </div>
        </div>

        <button
          onClick={onToggleGrid}
          className="p-2 rounded-lg transition-colors relative flex items-center justify-center"
          style={{
            background: isGridMode ? 'var(--glass-bg)' : 'transparent',
            color: isGridMode ? 'var(--primary-color)' : 'var(--color-text-secondary)',
            border: isGridMode ? '1px solid var(--color-border-strong)' : '1px solid transparent',
            boxShadow: isGridMode ? '0 0 10px var(--shadow)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isGridMode) {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isGridMode) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
          title={isGridMode ? 'Grids' : 'Grid-Free'}
        >
          {isGridMode ? (
            <Grid3x3 size={20} />
          ) : (
            <span className="relative inline-block w-5 h-5">
              <Grid3x3 size={20} className="absolute inset-0 opacity-75" />
              <Slash size={18} className="absolute inset-0 opacity-85" />
            </span>
          )}
        </button>

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
      </div>

    </header>
  );
};

export const TopBar = forwardRef(TopBarComponent);
TopBar.displayName = 'TopBar';

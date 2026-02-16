import React, { forwardRef, useImperativeHandle } from 'react';
import { Menu, X, MessageCircle, PanelRight, Grid3x3, Slash, ZoomOut, Plus, Sun, Moon } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';
import { TOP_BAR } from '@/constants/panesDimensions';
import { FONT_ROLES } from '@/styles/fontManager';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES } from '@/styles/typographics';
import { useTopBarLogic } from '@/components/layout/topbar/useTopBarLogic';
import { TopBarProps, TopBarHandle } from '@/components/layout/topbar/types';
import { TopBarSearch } from '@/components/layout/topbar/TopBarSearch';
import { TopBarTags } from '@/components/layout/topbar/TopBarTags';
import { WindowControls } from '@/components/layout/topbar/WindowControls';
import focusLogo from '@/assets/focus.png';
import shareSpaceIcon from '@/assets/sharespace_icon.jpg';
import { useThemeToggle } from '@/hooks/useThemeToggle';

export type { TopBarHandle } from '@/components/layout/topbar/types';

// TopBar renders the global header controls (sidebar toggle, space title editor, search, preview toggles, zoom) and wires them to layout state.
const TopBarComponent = (props: TopBarProps, ref: React.Ref<TopBarHandle>) => {
  const { onToggleSidebar, isSidebarOpen, onTogglePreview, isPreviewOpen, onToggleConversation, isConversationOpen, sidebarWidth, centerPaneRef, onToggleGrid, isGridMode, onZoomIn, onZoomOut, zoom, onOpenQuickAdd, onTagsClick, isTagsOpen, onTagSelect } = props;

  const logic = useTopBarLogic(centerPaneRef);
  const { isDark, toggleTheme } = useThemeToggle();

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({}), []);

  return (
    <header
      id="top-bar"
      className="glass-panel flex items-center relative"
      style={{
        zIndex: Z_INDEX.TOPBAR,
        borderBottom: '1px solid var(--color-border-subtle)',
        height: `${TOP_BAR.height}px`,
        padding: `0 ${TOP_BAR.layout.paddingX}px`,
        // @ts-ignore - Electron specific CSS property
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Left section */}
      <div
        className="flex items-center transition-all duration-200"
        style={{
          marginLeft: `${TOP_BAR.sidebarToggle.marginLeft}px`,
          columnGap: `${TOP_BAR.layout.leftSectionGap}px`,
          zIndex: Z_INDEX.BASE_RAISED,
          // @ts-ignore - Electron specific CSS property
          WebkitAppRegion: 'no-drag',
        }}
      >
        <button
          onClick={onToggleSidebar}
          className="rounded-lg transition-colors"
          style={{
            color: 'var(--color-text-secondary)',
            padding: `${TOP_BAR.button.padding}px`,
            transition: 'all var(--transition-base)',
            outline: 'none',
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
          {isSidebarOpen ? <X size={TOP_BAR.icons.primary} /> : <Menu size={TOP_BAR.icons.primary} />}
        </button>
        <div
          className="flex items-center"
          style={{
            columnGap: `${TOP_BAR.layout.leftGroupGap}px`,
            marginRight: `${TOP_BAR.layout.leftGroupMarginRight}px`,
          }}
        >
          <img
            src={focusLogo}
            alt="Focus logo"
            className="rounded-lg shadow-sm"
            style={{
              marginLeft: `${TOP_BAR.logo.marginLeft}px`,
              width: `${TOP_BAR.logo.size}px`,
              height: `${TOP_BAR.logo.size}px`,
            }}
          />
          <span
            style={{
              fontFamily: 'Segoe UI, sans-serif',
              fontSize: `${TOP_BAR.appName.fontSize}px`,
              fontWeight: 400,
              color: 'var(--color-text-primary)',
            }}
          >
            Focus
          </span>
          <button
            onClick={() => onOpenQuickAdd()}
            className="rounded-lg flex items-center justify-center transition-all"
            style={{
              background: 'var(--glass-bg)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 6px 14px rgba(0,0,0,0.08)',
              border: '1px solid var(--color-border-subtle)',
              marginLeft: `${TOP_BAR.quickAddButton.marginLeft}px`,
              padding: `${TOP_BAR.quickAddButton.padding}px`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.08)';
            }}
            title="Add links/files"
            aria-label="Add links/files"
          >
            <Plus size={TOP_BAR.icons.small} />
          </button>
        </div>
      </div>

      {/* Center section - Space Name (absolute positioned) */}
      <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ zIndex: Z_INDEX.BASE, left: `calc(50% + ${TOP_BAR.title.leftOffset}px)`, transform: `translate(-50%, -50%)` }}>
        <div className="pointer-events-auto">
          {logic.selectedSpace ? (
            logic.isEditingSpaceName ? (
              <input
                ref={logic.spaceNameInputRef}
                type="text"
                value={logic.editingSpaceName}
                onChange={(e) => logic.setEditingSpaceName(e.target.value)}
                onKeyDown={logic.handleSpaceNameKeyDown}
                onBlur={logic.handleSpaceNameSubmit}
                className="text-slate-900 bg-transparent outline-none focus:ring-0 focus:outline-none border-none p-0 m-0 text-center"
                style={{
                  ...FONT_ROLES.topbarTitle,
                  maxWidth: `${TOP_BAR.title.maxWidth}px`,
                }}
              />
            ) : (
              <h1
                onDoubleClick={() => logic.setIsEditingSpaceName(true)}
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
                {logic.selectedSpace.name}
              </h1>
            )
          ) : (
            <span style={{ ...FONT_ROLES.topbarTitle, color: 'var(--color-text-muted)' }}>No Space Selected</span>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Right section */}
      <div
        className="flex items-center"
        style={{
          columnGap: `${TOP_BAR.layout.rightSectionGap}px`,
          zIndex: Z_INDEX.BASE_RAISED,
          // @ts-ignore - Electron specific CSS property
          WebkitAppRegion: 'no-drag',
        }}
      >
        {/* To be implemented in the future: search menu (hidden) */}
        <TopBarSearch searchQuery={logic.searchQuery} setSearchQuery={logic.setSearchQuery} />

        {/* To be implemented in the future: tags button (hidden) */}
        <TopBarTags isOpen={isTagsOpen} onToggle={onTagsClick} onTagSelect={onTagSelect} />

        <div
          className="flex items-center rounded-lg"
          style={{
            background: 'var(--glass-bg)',
            padding: `${TOP_BAR.zoomControl.containerPaddingY}px ${TOP_BAR.zoomControl.containerPaddingX}px`,
          }}
        >
          <button
            disabled
            className="rounded-md transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              opacity: 0.5,
              padding: `${TOP_BAR.zoomControl.buttonPaddingY}px ${TOP_BAR.zoomControl.buttonPaddingX}px`,
              transform: `translateX(${TOP_BAR.zoomControl.buttonTranslateX}px)`,
            }}
            title="Zoom control"
          >
            <ZoomOut size={TOP_BAR.icons.secondary} className="opacity-75" />
          </button>
          <div
            style={{
              ...FONT_ROLES.topbarControl,
              color: 'var(--color-text-primary)',
              minWidth: `${TOP_BAR.zoomControl.valueMinWidth}px`,
              paddingLeft: `${TOP_BAR.zoomControl.valuePaddingX}px`,
              paddingRight: `${TOP_BAR.zoomControl.valuePaddingX}px`,
            }}
            className="select-none text-center"
          >
            {(zoom * 100).toFixed(0)}%
          </div>
        </div>

        <button
          className="rounded-lg transition-colors flex items-center justify-center"
          style={{
            background: 'var(--glass-bg)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-subtle)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'none',
            padding: `${TOP_BAR.button.padding}px`,
          }}
          title="ShareSpace"
          aria-label="ShareSpace"
        >
          <img
            src={shareSpaceIcon}
            alt="ShareSpace"
            className="object-contain"
            style={{
              opacity: 0.6,
              width: `${TOP_BAR.icons.primary}px`,
              height: `${TOP_BAR.icons.primary}px`,
            }}
          />
        </button>

        <button
          onClick={toggleTheme}
          className="rounded-lg transition-colors flex items-center justify-center"
          style={{
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid transparent',
            padding: `${TOP_BAR.button.padding}px`,
            columnGap: `${TOP_BAR.themeToggle.gap}px`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--glass-bg)';
            e.currentTarget.style.color = 'var(--primary-color)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          title="Toggle theme"
        >
          {isDark ? <Moon size={TOP_BAR.icons.tiny} /> : <Sun size={TOP_BAR.icons.tiny} />}
        </button>

        <button
          onClick={onToggleGrid}
          className="rounded-lg transition-colors relative flex items-center justify-center"
          style={{
            background: isGridMode ? 'var(--glass-bg)' : 'transparent',
            color: isGridMode ? 'var(--primary-color)' : 'var(--color-text-secondary)',
            border: isGridMode ? '1px solid var(--color-border-strong)' : '1px solid transparent',
            boxShadow: isGridMode ? '0 0 10px var(--shadow)' : 'none',
            padding: `${TOP_BAR.button.padding}px`,
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
            <Grid3x3 size={TOP_BAR.icons.primary} />
          ) : (
            <span
              className="relative inline-block"
              style={{
                width: `${TOP_BAR.icons.primary}px`,
                height: `${TOP_BAR.icons.primary}px`,
              }}
            >
              <Grid3x3 size={TOP_BAR.icons.primary} className="absolute inset-0 opacity-75" />
              <Slash size={TOP_BAR.icons.secondary} className="absolute inset-0 opacity-85" />
            </span>
          )}
        </button>

        <button
          onClick={onTogglePreview}
          className="rounded-lg transition-colors"
          style={{
            background: isPreviewOpen ? 'var(--glass-bg)' : 'transparent',
            color: isPreviewOpen ? 'var(--primary-color)' : 'var(--color-text-secondary)',
            border: isPreviewOpen ? '1px solid var(--color-border-strong)' : '1px solid transparent',
            boxShadow: isPreviewOpen ? '0 0 10px var(--shadow)' : 'none',
            padding: `${TOP_BAR.button.padding}px`,
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
          <PanelRight size={TOP_BAR.icons.primary} />
        </button>
        <button
          onClick={onToggleConversation}
          className="rounded-lg transition-colors"
          style={{
            background: isConversationOpen ? 'var(--glass-bg)' : 'transparent',
            color: isConversationOpen ? 'var(--primary-color)' : 'var(--color-text-secondary)',
            border: isConversationOpen ? '1px solid var(--color-border-strong)' : '1px solid transparent',
            boxShadow: isConversationOpen ? '0 0 10px var(--shadow)' : 'none',
            display: 'none',
            padding: `${TOP_BAR.button.padding}px`,
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
          <MessageCircle size={TOP_BAR.icons.primary} />
        </button>

        {/* Window Controls */}
        <div style={{ marginRight: `${TOP_BAR.layout.windowControlsMarginRight}px` }}>
          <WindowControls />
        </div>
      </div>

    </header>
  );
};

export const TopBar = forwardRef(TopBarComponent);
TopBar.displayName = 'TopBar';


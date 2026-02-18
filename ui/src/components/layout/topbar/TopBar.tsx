/**
 * TopBar renders global workspace controls and routes user actions to layout state.
 * A dedicated AI assistant action is exposed in the right-side controls.
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Menu, X, PanelRight, Grid3x3, Slash, ZoomOut, Plus, Sun, Moon, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Z_INDEX } from '@/constants/zIndex';
import { TOP_BAR } from '@/constants/panesDimensions';
import { FONT_ROLES } from '@/styles/fontManager';
import { TOP_BAR_STYLES } from '@/styles/topBarStyles';
import { useTopBarLogic } from '@/components/layout/topbar/useTopBarLogic';
import { TopBarProps, TopBarHandle } from '@/components/layout/topbar/types';
import { TopBarSearch } from '@/components/layout/topbar/TopBarSearch';
import { TopBarTags } from '@/components/layout/topbar/TopBarTags';
import { WindowControls } from '@/components/layout/topbar/WindowControls';
import { AiAssistantComingSoonDialog } from '@/components/layout/topbar/AiAssistantComingSoonDialog';
import { SpaceShareFilters, createDefaultSpaceShareFilters } from '@/components/dialogs/share/types';
import focusLogo from '@/assets/focus.png';
import { useThemeToggle } from '@/hooks/useThemeToggle';

export type { TopBarHandle } from '@/components/layout/topbar/types';

const AI_ASSISTANT_LOGO_SRC = '/logos/ai_assistant_logo_transparent.png';

// TopBar renders the global header controls (sidebar toggle, space title editor, search, preview toggles, zoom) and wires them to layout state.
const TopBarComponent = (props: TopBarProps, ref: React.Ref<TopBarHandle>) => {
  const {
    onToggleSidebar,
    isSidebarOpen,
    onTogglePreview,
    isPreviewOpen,
    onToggleConversation: _onToggleConversation,
    isConversationOpen: _isConversationOpen,
    sidebarWidth: _sidebarWidth,
    centerPaneRef,
    onToggleGrid,
    isGridMode,
    onZoomIn: _onZoomIn,
    onZoomOut: _onZoomOut,
    zoom,
    onOpenQuickAdd,
    onOpenSpaceShareDialog,
    onTagsClick,
    isTagsOpen,
    onTagSelect,
  } = props;

  const { t } = useTranslation();
  const logic = useTopBarLogic(centerPaneRef);
  const { isDark, toggleTheme } = useThemeToggle();
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isAiAssistantDialogOpen, setIsAiAssistantDialogOpen] = useState(false);
  const [shareSelections, setShareSelections] = useState<SpaceShareFilters>(createDefaultSpaceShareFilters);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const aiAssistantButtonRef = useRef<HTMLButtonElement | null>(null);
  const aiAssistantDialogRef = useRef<HTMLDivElement | null>(null);
  const shareOptions: Array<{ key: keyof SpaceShareFilters; label: string }> = [
    { key: 'links', label: t('topBar.shareLinks') },
    { key: 'webArticles', label: t('topBar.shareWebArticles') },
    { key: 'files', label: t('topBar.shareFiles') },
    { key: 'textNotes', label: t('topBar.shareTextNotes') },
  ];

  const toggleShareOption = (key: keyof SpaceShareFilters) => {
    setShareSelections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleShareSymbolClick = () => {
    onOpenSpaceShareDialog?.(shareSelections);
    setIsShareMenuOpen(false);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({}), []);

  useEffect(() => {
    if (!isShareMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedButton = shareButtonRef.current?.contains(target);
      const clickedMenu = shareMenuRef.current?.contains(target);

      if (clickedButton || clickedMenu) return;
      setIsShareMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShareMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isShareMenuOpen]);

  useEffect(() => {
    if (!isAiAssistantDialogOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const clickedButton = aiAssistantButtonRef.current?.contains(target);
      const clickedDialog = aiAssistantDialogRef.current?.contains(target);

      if (clickedButton || clickedDialog) return;
      setIsAiAssistantDialogOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAiAssistantDialogOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isAiAssistantDialogOpen]);

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
          title={isSidebarOpen ? t('topBar.closeSidebar') : t('topBar.openSidebar')}
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
            title={t('topBar.addObjects')}
            aria-label={t('topBar.addLinks')}
          >
            <Plus size={TOP_BAR.icons.small} />
          </button>
          <div className="min-w-0" style={{ marginLeft: '6px' }}>
            {logic.selectedSpace ? (
              logic.isEditingSpaceName ? (
                <input
                  ref={logic.spaceNameInputRef}
                  type="text"
                  value={logic.editingSpaceName}
                  onChange={(e) => logic.setEditingSpaceName(e.target.value)}
                  onKeyDown={logic.handleSpaceNameKeyDown}
                  onBlur={logic.handleSpaceNameSubmit}
                  className="text-slate-900 bg-transparent outline-none focus:ring-0 focus:outline-none border-none p-0 m-0 text-left"
                  style={{
                    ...FONT_ROLES.topbarTitle,
                    color: 'var(--primary-color)',
                    maxWidth: `${TOP_BAR.title.maxWidth}px`,
                  }}
                />
              ) : (
                <h1
                  onDoubleClick={() => logic.setIsEditingSpaceName(true)}
                  className="cursor-pointer transition-colors truncate"
                  style={{
                    ...FONT_ROLES.topbarTitle,
                    color: 'var(--primary-color)',
                    maxWidth: `${TOP_BAR.title.maxWidth}px`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textShadow = '0 0 10px var(--glow)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textShadow = 'none';
                  }}
                  title={t('topBar.doubleClickToRename')}
                >
                  {logic.selectedSpace.name}
                </h1>
              )
            ) : (
              <span style={{ ...FONT_ROLES.topbarTitle, color: 'var(--color-text-muted)' }}>{t('topBar.noSpaceSelected')}</span>
            )}
          </div>
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
            title={t('topBar.zoomControl')}
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

        <div className="relative" style={{ zIndex: Z_INDEX.DROPDOWN_MENU }}>
          <button
            ref={shareButtonRef}
            onClick={() => setIsShareMenuOpen((prev) => !prev)}
            className="rounded-lg transition-colors flex items-center justify-center"
            style={{
              background: isShareMenuOpen ? 'var(--glass-bg)' : 'transparent',
              color: isShareMenuOpen ? 'var(--primary-color)' : 'var(--color-text-secondary)',
              border: isShareMenuOpen ? '1px solid var(--color-border-strong)' : '1px solid transparent',
              boxShadow: isShareMenuOpen ? '0 0 10px var(--shadow)' : 'none',
              padding: `${TOP_BAR.button.padding}px`,
            }}
            onMouseEnter={(e) => {
              if (!isShareMenuOpen) {
                e.currentTarget.style.background = 'var(--glass-bg)';
                e.currentTarget.style.color = 'var(--primary-color)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isShareMenuOpen) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }
            }}
            title={t('topBar.share')}
            aria-label={t('topBar.share')}
            aria-haspopup="menu"
            aria-expanded={isShareMenuOpen}
          >
            <Share size={TOP_BAR.icons.tiny} />
          </button>

          {isShareMenuOpen && (
            <div
              ref={shareMenuRef}
              className="absolute right-0 rounded-lg overflow-hidden"
              style={{
                top: `calc(100% + ${TOP_BAR.shareMenu.offsetY}px)`,
                width: `${TOP_BAR.shareMenu.width}px`,
                background: 'var(--glass-bg)',
                border: `${TOP_BAR.shareMenu.borderWidth}px solid var(--color-border-subtle)`,
                boxShadow: 'var(--shadow-strong)',
                backdropFilter: 'var(--glass-blur)',
              }}
              role="menu"
              aria-label={t('topBar.shareOptions')}
            >
              <button
                type="button"
                onClick={handleShareSymbolClick}
                className="absolute flex items-center justify-center rounded-sm transition-colors"
                style={{
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                  right: `${TOP_BAR.shareMenu.itemPaddingX}px`,
                  top: `${TOP_BAR.shareMenu.itemPaddingY}px`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-primary)';
                }}
                title={t('topBar.openShareDialog')}
                aria-label={t('topBar.openShareDialog')}
              >
                <Share size={TOP_BAR.icons.tiny} />
              </button>

              <div style={{ padding: `${TOP_BAR.shareMenu.paddingY}px 0` }}>
                {shareOptions.map((option) => (
                  <div
                    key={option.key}
                    style={{
                      padding: `${TOP_BAR.shareMenu.itemPaddingY}px ${TOP_BAR.shareMenu.itemPaddingX}px`,
                    }}
                  >
                    <label
                      className="inline-flex items-center cursor-pointer"
                      style={{
                        ...FONT_ROLES.topbarControl,
                        color: 'var(--color-text-primary)',
                        columnGap: `${TOP_BAR.shareMenu.itemGap}px`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={shareSelections[option.key]}
                        onChange={() => toggleShareOption(option.key)}
                        style={{
                          width: `${TOP_BAR.shareMenu.checkboxSize}px`,
                          height: `${TOP_BAR.shareMenu.checkboxSize}px`,
                          accentColor: TOP_BAR_STYLES.shareMenuCheckboxAccentColor,
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center" style={{ columnGap: `${TOP_BAR.layout.toggleButtonsGap}px` }}>
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
            title={t('topBar.toggleTheme')}
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
              padding: `${TOP_BAR.modeToggleButton.padding}px`,
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
            title={isGridMode ? t('topBar.grids') : t('topBar.gridFree')}
          >
            {isGridMode ? (
              <Grid3x3 size={TOP_BAR.modeToggleButton.iconSize} />
            ) : (
              <span
                className="relative inline-block"
                style={{
                  width: `${TOP_BAR.modeToggleButton.iconSize}px`,
                  height: `${TOP_BAR.modeToggleButton.iconSize}px`,
                }}
              >
                <Grid3x3 size={TOP_BAR.modeToggleButton.iconSize} className="absolute inset-0 opacity-75" />
                <Slash size={TOP_BAR.modeToggleButton.slashIconSize} className="absolute inset-0 opacity-85" />
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
              padding: `${TOP_BAR.modeToggleButton.padding}px`,
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
            title={t('topBar.togglePreview')}
          >
            <PanelRight size={TOP_BAR.modeToggleButton.iconSize} />
          </button>
          <div
            className="relative"
            style={{
              zIndex: Z_INDEX.DROPDOWN_MENU,
              marginTop: `${TOP_BAR.aiAssistantButton.verticalOffsetY}px`,
            }}
          >
            <button
              ref={aiAssistantButtonRef}
              onClick={() => setIsAiAssistantDialogOpen((prev) => !prev)}
              className="rounded-lg transition-colors"
              style={{
                background: isAiAssistantDialogOpen ? 'var(--glass-bg)' : 'transparent',
                color: isAiAssistantDialogOpen ? 'var(--primary-color)' : 'var(--color-text-secondary)',
                border: isAiAssistantDialogOpen ? '1px solid var(--color-border-strong)' : '1px solid transparent',
                boxShadow: isAiAssistantDialogOpen ? '0 0 10px var(--shadow)' : 'none',
                padding: `${TOP_BAR.button.padding}px`,
              }}
              onMouseEnter={(e) => {
                if (!isAiAssistantDialogOpen) {
                  e.currentTarget.style.background = 'var(--glass-bg)';
                  e.currentTarget.style.color = 'var(--primary-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAiAssistantDialogOpen) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }
              }}
              title={t('topBar.toggleAiAssistant')}
              aria-label={t('topBar.toggleAiAssistant')}
              aria-haspopup="dialog"
              aria-expanded={isAiAssistantDialogOpen}
            >
              <img
                src={AI_ASSISTANT_LOGO_SRC}
                alt="AI Assistant"
                style={{
                  width: `${TOP_BAR.aiAssistantButton.logoSize}px`,
                  height: `${TOP_BAR.aiAssistantButton.logoSize}px`,
                  borderRadius: `${TOP_BAR.aiAssistantButton.logoBorderRadius}px`,
                  objectFit: 'contain',
                  filter: isDark ? TOP_BAR_STYLES.aiAssistantLogoDarkFilter : TOP_BAR_STYLES.aiAssistantLogoLightFilter,
                }}
              />
            </button>
            <AiAssistantComingSoonDialog
              isOpen={isAiAssistantDialogOpen}
              containerRef={aiAssistantDialogRef}
            />
          </div>
        </div>

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

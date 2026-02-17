/**
 * Dedicated space-share dialog that requests backend-built share payloads for the whole space.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { X, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { Z_INDEX } from '@/constants/zIndex';
import { DIMENSIONS } from '@/constants/panesDimensions';
import { SharePlatformButtons } from '@/components/dialogs/share/SharePlatformButtons';
import { SharePlatform, SHARE_PLATFORMS } from '@/components/dialogs/share/sharePlatforms';
import { SpaceShareFilters } from '@/components/dialogs/share/types';
import { spacesApi, SpaceShareExportResponse } from '@/api/spaces';
import { API_BASE } from '@/config/api';
import { canShowImageThumbnail } from '@/utils/fileTypes';
import { renderFileTypeIcon } from '@/components/layout/centerpane/tile/iconHelpers';

interface SpaceShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  spaceName: string;
  spaceId?: string;
  filters: SpaceShareFilters;
}

interface SummaryRow {
  typeLabel: string;
  value: string;
  isFile: boolean;
  filePath?: string;
  fileTitle?: string;
}

interface SummarySection {
  typeLabel: string;
  rows: Array<{ row: SummaryRow; index: number }>;
}

const PLURAL_TYPE_LABELS: Record<string, string> = {
  link: 'Links',
  links: 'Links',
  'web article': 'Web Articles',
  'web articles': 'Web Articles',
  file: 'Files',
  files: 'Files',
  'text note': 'Text Notes',
  'text notes': 'Text Notes',
};

const getDisplayTypeLabel = (typeLabel: string): string => {
  const normalized = typeLabel.trim().toLowerCase();
  return PLURAL_TYPE_LABELS[normalized] || typeLabel;
};

const getSectionRowPrefix = (sectionSize: number, rowIndexInSection: number): string =>
  sectionSize > 1 ? `${rowIndexInSection + 1}.` : '';

const FILTER_LABELS: Record<'links' | 'web_articles' | 'files' | 'text_notes', string> = {
  links: 'Links',
  web_articles: 'Web Articles',
  files: 'Files',
  text_notes: 'Text notes',
};

const getFallbackFilterLabels = (filters: SpaceShareFilters): string[] => {
  const labels: string[] = [];
  if (filters.links) labels.push(FILTER_LABELS.links);
  if (filters.webArticles) labels.push(FILTER_LABELS.web_articles);
  if (filters.files) labels.push(FILTER_LABELS.files);
  if (filters.textNotes) labels.push(FILTER_LABELS.text_notes);

  if (labels.length > 0) return labels;
  return [
    FILTER_LABELS.links,
    FILTER_LABELS.web_articles,
    FILTER_LABELS.files,
    FILTER_LABELS.text_notes,
  ];
};

const buildPlatformShareText = (shareText: string, firstShareUrl?: string): string => {
  if (!shareText || !firstShareUrl) return shareText;

  const parts = shareText
    .split('\n\n')
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';

  const firstPart = parts[0];
  const normalizedUrl = firstShareUrl.trim();
  const hasSameLeadingUrl = firstPart === normalizedUrl || firstPart.endsWith(` - ${normalizedUrl}`);

  if (hasSameLeadingUrl) {
    return parts.slice(1).join('\n\n');
  }

  return shareText;
};

const splitSummaryLine = (line: string): SummaryRow => {
  const extractPathFromText = (text: string): string | undefined => {
    const separatorIndex = text.lastIndexOf(' - ');
    if (separatorIndex < 0) return undefined;
    const maybePath = text.slice(separatorIndex + 3).trim();
    return maybePath || undefined;
  };

  const match = line.match(/^(?:(\d+\.)\s+)?\[([^\]]+)\]\s*(.*)$/);
  if (!match) {
    return { typeLabel: 'Items', value: line, isFile: false };
  }

  const typeLabel = match[2] || 'Items';
  const value = match[3] || '';
  const isFile = typeLabel.toLowerCase().startsWith('file');
  const filePath = isFile ? extractPathFromText(value) : undefined;

  return {
    typeLabel,
    value,
    isFile,
    filePath,
    fileTitle: isFile ? (value.split(' - ')[0] || '').trim() : undefined,
  };
};

const parseSummaryLineWithItem = (
  line: string,
  item?: SpaceShareExportResponse['items'][number]
): SummaryRow => {
  const parsed = splitSummaryLine(line);
  if (!item) return parsed;

  if (item.category === 'files') {
    return {
      ...parsed,
      isFile: true,
      filePath: item.file_path || item.share_data || parsed.filePath,
      fileTitle: item.title || parsed.fileTitle,
    };
  }

  return parsed;
};

const buildImageThumbnailUrl = (filePath: string): string => {
  const params = new URLSearchParams({
    file_path: filePath,
    max_width: '128',
    max_height: '128',
    quality: '85',
  });
  return `${API_BASE}/thumbnails/image?${params.toString()}`;
};

export function SpaceShareDialog({ isOpen, onClose, spaceName, spaceId, filters }: SpaceShareDialogProps) {
  const [isSummaryCopied, setIsSummaryCopied] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [sharePayload, setSharePayload] = React.useState<SpaceShareExportResponse | null>(null);
  const [summaryRows, setSummaryRows] = React.useState<SummaryRow[]>([]);
  const [editableShareText, setEditableShareText] = React.useState('');
  const [failedImageThumbnails, setFailedImageThumbnails] = React.useState<Record<string, boolean>>({});
  const rowTextareaRefs = React.useRef<Record<number, HTMLTextAreaElement | null>>({});
  const freeTextAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const requestFilters = React.useMemo(
    () => ({
      links: filters.links,
      webArticles: filters.webArticles,
      files: filters.files,
      textNotes: filters.textNotes,
    }),
    [filters.links, filters.webArticles, filters.files, filters.textNotes]
  );

  React.useEffect(() => {
    let isCancelled = false;

    const loadSharePayload = async () => {
      if (!isOpen) return;
      if (!spaceId) {
        setErrorMessage('No space selected.');
        setSharePayload(null);
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage(null);
        const response = await spacesApi.exportShare(spaceId, requestFilters);
        if (isCancelled) return;
        setSharePayload(response);
      } catch (err) {
        if (isCancelled) return;
        console.error('[SPACE SHARE DIALOG] Failed to export share payload:', err);
        setSharePayload(null);
        setErrorMessage(err instanceof Error ? err.message : 'Failed to export space share payload.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSharePayload();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, spaceId, requestFilters]);

  const selectedFilterLabels = React.useMemo(() => {
    if (!sharePayload) return getFallbackFilterLabels(filters);

    return (Object.keys(sharePayload.filters) as Array<keyof SpaceShareExportResponse['filters']>)
      .filter((key) => sharePayload.filters[key])
      .map((key) => FILTER_LABELS[key]);
  }, [sharePayload, filters]);

  const summaryText = sharePayload?.share_text || '';
  const warnings = sharePayload?.warnings || [];
  const totalItems = sharePayload?.total_items || 0;
  const selectedItemsCount = summaryRows.length > 0 ? summaryRows.length : totalItems;
  const shareTitle = `${spaceName} (${selectedItemsCount} items)`;
  const summarySections = React.useMemo<SummarySection[]>(() => {
    const sections: SummarySection[] = [];
    summaryRows.forEach((row, index) => {
      const currentSection = sections[sections.length - 1];
      if (currentSection && currentSection.typeLabel === row.typeLabel) {
        currentSection.rows.push({ row, index });
        return;
      }

      sections.push({
        typeLabel: row.typeLabel,
        rows: [{ row, index }],
      });
    });
    return sections;
  }, [summaryRows]);
  const composedShareText = React.useMemo(() => {
    if (summaryRows.length > 0) {
      return summarySections
        .flatMap((section) =>
          section.rows.map(({ row }, rowIndexInSection) => {
            const prefix = getSectionRowPrefix(section.rows.length, rowIndexInSection);
            const prefixPart = prefix ? `${prefix} ` : '';
            return `${prefixPart}[${row.typeLabel}] ${row.value}`.trim();
          })
        )
        .join('\n\n');
    }
    return editableShareText;
  }, [summaryRows, editableShareText, summarySections]);

  const autoResizeTextarea = React.useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    const summaryLines = sharePayload?.summary_lines || [];
    if (summaryLines.length > 0) {
      setSummaryRows(summaryLines.map((line, index) => parseSummaryLineWithItem(line, sharePayload?.items?.[index])));
      setEditableShareText('');
    } else {
      setSummaryRows([]);
      setEditableShareText(summaryText);
    }
    setFailedImageThumbnails({});
    setIsSummaryCopied(false);
  }, [isOpen, summaryText, sharePayload]);

  React.useEffect(() => {
    Object.values(rowTextareaRefs.current).forEach((textarea) => autoResizeTextarea(textarea));
    autoResizeTextarea(freeTextAreaRef.current);
  }, [summaryRows, editableShareText, autoResizeTextarea]);

  const handleCopySummary = async () => {
    if (!composedShareText.trim()) return;
    await navigator.clipboard.writeText(composedShareText);
    setIsSummaryCopied(true);
    window.setTimeout(() => setIsSummaryCopied(false), 1500);
  };

  const handlePlatformClick = (platform: SharePlatform) => {
    const primaryUrl = sharePayload?.first_share_url || '';
    const platformText = buildPlatformShareText(composedShareText, primaryUrl) || shareTitle;
    const platformUrl = platform.getShareUrl(primaryUrl, platformText);
    window.open(platformUrl, '_blank', 'noopener,noreferrer,width=720,height=620');
  };

  const handleRemoveRowFromScope = (rowIndex: number) => {
    setSummaryRows((prevRows) => prevRows.filter((_, index) => index !== rowIndex));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/50 transition-opacity"
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl"
        style={{
          width: `${DIMENSIONS.DIALOG.SPACE_SHARE_WIDTH}px`,
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Share2 size={20} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900 truncate">Share &apos;{spaceName}&apos;</h2>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-500">
                {selectedItemsCount} item(s) selected for sharing
              </p>
              <p className="text-xs text-slate-500">
                Scope: {selectedFilterLabels.join(', ') || 'All'} (edit/delete if needed)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          <div className="rounded-lg border border-slate-200 bg-slate-50">
            {isLoading ? (
              <div className="px-4 py-3 text-sm text-slate-500">Preparing share payload...</div>
            ) : errorMessage ? (
              <div className="px-4 py-3 text-sm text-red-600">{errorMessage}</div>
            ) : summaryRows.length > 0 ? (
              <div
                className="px-4 py-3 space-y-4"
                style={{ minHeight: `${DIMENSIONS.DIALOG.SPACE_SHARE_LIST_MAX_HEIGHT}px` }}
              >
                {summarySections.map((section) => (
                  <div key={section.typeLabel} className="space-y-2">
                    <p className="text-sm text-slate-500 opacity-50 select-none">{getDisplayTypeLabel(section.typeLabel)}:</p>
                    {section.rows.map(({ row, index }, rowIndexInSection) => (
                      <div key={`${index}-${row.typeLabel}-${row.value}`} className="grid grid-cols-[2.75rem_1fr] items-start gap-1.5">
                        <span className="text-sm leading-5 text-slate-700 opacity-50 select-none whitespace-nowrap text-right pr-1">
                          {getSectionRowPrefix(section.rows.length, rowIndexInSection)}
                        </span>
                        {row.isFile ? (
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0">
                              <div className="w-14 h-14 rounded-md border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                                {row.filePath && canShowImageThumbnail(row.filePath) && !failedImageThumbnails[row.filePath] ? (
                                  <img
                                    src={buildImageThumbnailUrl(row.filePath)}
                                    alt={row.fileTitle || row.filePath}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                    onError={() =>
                                      setFailedImageThumbnails((prev) => ({ ...prev, [row.filePath as string]: true }))
                                    }
                                  />
                                ) : (
                                  <div className="scale-75">
                                    {renderFileTypeIcon(row.filePath || row.value, 48)}
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveRowFromScope(index)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors flex items-center justify-center"
                                title="Remove from scope"
                                aria-label="Remove file from share scope"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <div className="min-w-0 space-y-0.5 pt-0.5">
                              {row.fileTitle ? (
                                <p className="text-sm text-slate-700 break-words">{row.fileTitle}</p>
                              ) : null}
                              <p className="text-sm text-slate-700 opacity-50 break-all select-none">
                                {row.filePath || row.value}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <textarea
                            ref={(element) => {
                              rowTextareaRefs.current[index] = element;
                              autoResizeTextarea(element);
                            }}
                            value={row.value}
                            onChange={(event) =>
                              setSummaryRows((prevRows) => {
                                const nextRows = [...prevRows];
                                nextRows[index] = { ...nextRows[index], value: event.target.value };
                                return nextRows;
                              })
                            }
                            className="w-full text-sm text-slate-700 bg-transparent resize-none outline-none leading-5 overflow-hidden"
                            rows={1}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                ref={(element) => {
                  freeTextAreaRef.current = element;
                  autoResizeTextarea(element);
                }}
                value={editableShareText}
                onChange={(event) => setEditableShareText(event.target.value)}
                placeholder="No objects match the selected filters."
                className="w-full px-4 py-3 text-sm text-slate-700 bg-transparent resize-none outline-none overflow-hidden"
                style={{ minHeight: `${DIMENSIONS.DIALOG.SPACE_SHARE_LIST_MAX_HEIGHT}px` }}
              />
            )}
          </div>

          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
              {warnings.map((warning, index) => (
                <p key={`${index}-${warning}`} className="text-xs text-amber-800 break-words">
                  {warning}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Share to</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySummary}
                disabled={!composedShareText.trim() || isLoading}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 transition-all hover:scale-110 hover:shadow-md disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
                title="Copy"
                aria-label="Copy"
              >
                {isSummaryCopied ? (
                  <CheckCircle2 size={26} className="text-green-600" />
                ) : (
                  <Copy size={26} />
                )}
              </button>
              <SharePlatformButtons platforms={SHARE_PLATFORMS} onPlatformClick={handlePlatformClick} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(dialogContent, document.body);
}

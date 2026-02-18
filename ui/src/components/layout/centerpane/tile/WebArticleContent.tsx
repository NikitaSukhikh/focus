/**
 * WebArticleContent renders extracted article tiles and applies search highlighting across title, URL, and body text.
 * This keeps web articles searchable in the same way as other tile types.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Loader2, AlertCircle, Globe } from 'lucide-react';
import { tileRingStyle, tileBackgroundFillStyle, TILE_BACKGROUND } from '@/styles/tileStyles';
import { useThemeToggle } from '@/hooks/useThemeToggle';
import { TYPOGRAPHY_FONTS, TYPOGRAPHY_SIZES } from '@/styles/typographics';
import { API_BASE } from '@/config/api';
import { objectsApi } from '@/api/objects';
import { HighlightText } from '@/components/layout/centerpane/tile/HighlightText';
import { useSearchStore } from '@/stores/searchStore';

interface WebArticleContentProps {
  id: string;
  url: string;
  title: string;
  isSelected: boolean;
  hoverScaleClass: string;
  onInteractionChange?: (_locked: boolean) => void;
  onContextMenu?: (_e: React.MouseEvent) => void;
}

type EmbedState = 'loading' | 'article' | 'error';

const articleCache = new Map<string, { html: string } | { error: string }>();
const SEARCH_MARK_STYLE = 'background:rgba(250,204,21,0.65);color:inherit;border-radius:2px;padding:0 1px;';
const ARTICLE_SANITIZE_OPTIONS = {
  ADD_TAGS: ['figure', 'figcaption', 'picture', 'source'],
  ADD_ATTR: ['srcset', 'sizes', 'loading', 'decoding', 'fetchpriority', 'referrerpolicy'],
};

const escapeForRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightHtml = (html: string, query: string): string => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return html;

  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');
  const regex = new RegExp(`(${escapeForRegex(trimmedQuery)})`, 'gi');
  const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_TEXT);
  const matchedNodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textNode = currentNode as Text;
    const parentTag = textNode.parentElement?.tagName.toLowerCase();
    if (parentTag !== 'script' && parentTag !== 'style' && regex.test(textNode.data)) {
      matchedNodes.push(textNode);
    }
    regex.lastIndex = 0;
    currentNode = walker.nextNode();
  }

  matchedNodes.forEach((textNode) => {
    const fragment = parsed.createDocumentFragment();
    const parts = textNode.data.split(regex);

    parts.forEach((part) => {
      if (!part) return;
      if (regex.test(part)) {
        const mark = parsed.createElement('mark');
        mark.setAttribute('style', SEARCH_MARK_STYLE);
        mark.textContent = part;
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(parsed.createTextNode(part));
      }
      regex.lastIndex = 0;
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return parsed.body.innerHTML;
};

// WebArticleContent fetches and renders a cleaned article via server-side extraction.
export const WebArticleContent = React.memo(function WebArticleContent({
  id,
  url,
  title,
  isSelected,
  hoverScaleClass,
  onInteractionChange,
  onContextMenu,
}: WebArticleContentProps) {
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const cached = articleCache.get(url);
  const [state, setState] = useState<EmbedState>(
    cached ? ('html' in cached ? 'article' : 'error') : 'loading'
  );
  const [articleHtml, setArticleHtml] = useState<string | null>(
    cached && 'html' in cached ? cached.html : null
  );
  const [articleError, setArticleError] = useState<string | null>(
    cached && 'error' in cached ? cached.error : null
  );
  const [displayTitle, setDisplayTitle] = useState(title);
  const { isDark } = useThemeToggle();
  const highlightedArticleHtml = useMemo(() => {
    if (!articleHtml) return null;
    return highlightHtml(articleHtml, searchQuery);
  }, [articleHtml, searchQuery]);

  const markInteraction = (locked: boolean) => onInteractionChange?.(locked);

  const fetchArticle = useCallback(async () => {
    try {
      const params = new URLSearchParams({ url });
      const resp = await fetch(`${API_BASE}/article/extract?${params}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      const rawHtml = data.content_html || '<p>No content found.</p>';
      const html = DOMPurify.sanitize(rawHtml, ARTICLE_SANITIZE_OPTIONS);
      articleCache.set(url, { html });
      setArticleHtml(html);
      setState('article');
      if (data.title && (!title || title === url)) {
        setDisplayTitle(data.title);
        objectsApi.updateTitle(id, data.title).catch(() => {});
      }
    } catch (err: any) {
      console.error('[WebArticle] extraction failed', err);
      const error = err?.message || 'Failed to load article.';
      articleCache.set(url, { error });
      setArticleError(error);
      setState('error');
    }
  }, [url, id, title]);

  useEffect(() => {
    setDisplayTitle(title);
  }, [title]);

  useEffect(() => {
    if (articleCache.has(url)) return;
    setState('loading');
    setArticleHtml(null);
    setArticleError(null);
    fetchArticle();
  }, [url, fetchArticle]);

  const handleRetry = () => {
    articleCache.delete(url);
    setState('loading');
    setArticleHtml(null);
    setArticleError(null);
    fetchArticle();
  };

  const containerStyle: React.CSSProperties = {
    background: TILE_BACKGROUND,
    ...tileBackgroundFillStyle(TILE_BACKGROUND),
    ...tileRingStyle('link'),
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  };

  const titleBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    flexShrink: 0,
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    background: isDark ? TILE_BACKGROUND : 'rgba(255,255,255,0.6)',
  };

  return (
    <div
      className={`w-full h-full transition-transform duration-150 ${hoverScaleClass}`}
      style={containerStyle}
    >
      {/* Title bar */}
      <div style={titleBarStyle} onContextMenu={onContextMenu}>
        <Globe size={13} style={{ flexShrink: 0, opacity: 0.5 }} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            className="truncate"
            style={{
              fontFamily: TYPOGRAPHY_FONTS.TILE_TITLE,
              fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
              lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
              fontWeight: 700,
              color: isSelected ? '#1d4ed8' : 'var(--color-text-primary)',
            }}
          >
            <HighlightText text={displayTitle || url} query={searchQuery} />
          </span>
          {displayTitle && displayTitle !== url && (
            <span
              className="truncate"
              style={{
                fontSize: TYPOGRAPHY_SIZES.TILE_TITLE.fontSize,
                lineHeight: TYPOGRAPHY_SIZES.TILE_TITLE.lineHeight,
                opacity: 0.45,
                color: 'var(--color-text-primary)',
              }}
            >
              <HighlightText text={url} query={searchQuery} />
            </span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: 'default' }} onContextMenu={onContextMenu}>

        {state === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Loader2 size={24} className="animate-spin" style={{ opacity: 0.4 }} />
          </div>
        )}

        {state === 'article' && articleHtml && (
          <div
            className="article-scroll web-article-scroll"
            style={{
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '12px 16px',
              boxSizing: 'border-box',
              fontSize: 14,
              lineHeight: 1.65,
              color: 'var(--color-text-primary)',
              fontFamily: 'Georgia, "Times New Roman", serif',
              cursor: 'text',
              userSelect: 'text',
            }}
            onPointerDown={(e) => { e.stopPropagation(); markInteraction(true); }}
            onPointerUp={(e) => { e.stopPropagation(); markInteraction(false); }}
            onPointerLeave={() => markInteraction(false)}
            dangerouslySetInnerHTML={{ __html: highlightedArticleHtml ?? articleHtml }}
          />
        )}

        {state === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, padding: 16, textAlign: 'center' }}>
            <AlertCircle size={22} style={{ opacity: 0.45 }} />
            <span style={{ fontSize: 12, opacity: 0.6, maxWidth: 260 }}>{articleError || 'Could not load article.'}</span>
            <button
              onClick={(e) => { e.stopPropagation(); handleRetry(); }}
              style={{
                marginTop: 4,
                padding: '5px 14px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.15)',
                background: 'rgba(0,0,0,0.04)',
                cursor: 'pointer',
                color: 'var(--color-text-primary)',
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

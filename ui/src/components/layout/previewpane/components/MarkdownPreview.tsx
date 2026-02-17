import { useEffect, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useThemeContext } from '@/context/ThemeContext';

interface MarkdownPreviewProps {
  filePath?: string;
  content?: string;
  title?: string;
}

// MarkdownPreview renders markdown files with proper formatting
export function MarkdownPreview({ filePath, content, title }: MarkdownPreviewProps) {
  const [html, setHtml] = useState<string>('');
  const { isDark } = useThemeContext();

  useEffect(() => {
    if (content) {
      // Configure marked for safe rendering
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      const rendered = marked.parse(content) as string;
      setHtml(DOMPurify.sanitize(rendered));
    }
  }, [content]);

  return (
    <div className="flex-1 overflow-auto min-h-0 h-full article-scroll" style={{ background: 'var(--background-dark)' }}>
      <div className="p-6 max-w-4xl mx-auto w-full">
        <div className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          {filePath && <div className="font-mono break-all">{filePath}</div>}
          {title && <div className="font-semibold mt-1" style={{ color: 'var(--color-text-secondary)' }}>{title}</div>}
        </div>
        <div
          className={`prose max-w-none markdown-preview${isDark ? ' markdown-preview-dark' : ''}
            prose-headings:font-semibold
            prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6
            prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-5
            prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
            prose-p:leading-7
            prose-a:no-underline hover:prose-a:underline
            prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-pre:rounded-lg prose-pre:p-4
            prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic
            prose-ul:list-disc prose-ul:pl-6
            prose-ol:list-decimal prose-ol:pl-6
            prose-table:border-collapse
            prose-th:border prose-th:p-2 prose-th:text-left
            prose-td:border prose-td:p-2
            prose-img:rounded-lg prose-img:shadow-md
            prose-hr:border`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

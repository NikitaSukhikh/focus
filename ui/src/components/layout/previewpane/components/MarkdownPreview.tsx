import { useEffect, useState } from 'react';
import { marked } from 'marked';

interface MarkdownPreviewProps {
  filePath?: string;
  content?: string;
  title?: string;
}

// MarkdownPreview renders markdown files with proper formatting
export function MarkdownPreview({ filePath, content, title }: MarkdownPreviewProps) {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    if (content) {
      // Configure marked for safe rendering
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      const rendered = marked.parse(content) as string;
      setHtml(rendered);
    }
  }, [content]);

  return (
    <div className="flex-1 overflow-auto bg-white min-h-0 h-full">
      <div className="p-6 max-w-4xl mx-auto w-full">
        <div className="text-xs text-slate-500 mb-3">
          {filePath && <div className="font-mono break-all">{filePath}</div>}
          {title && <div className="font-semibold mt-1">{title}</div>}
        </div>
        <div
          className="prose prose-slate max-w-none
            prose-headings:font-semibold prose-headings:text-slate-900
            prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6
            prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-5
            prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
            prose-p:text-slate-700 prose-p:leading-7
            prose-a:text-purple-600 prose-a:no-underline hover:prose-a:underline
            prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg prose-pre:p-4
            prose-blockquote:border-l-4 prose-blockquote:border-purple-600 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600
            prose-ul:list-disc prose-ul:pl-6
            prose-ol:list-decimal prose-ol:pl-6
            prose-li:text-slate-700
            prose-table:border-collapse
            prose-th:border prose-th:border-slate-300 prose-th:bg-slate-100 prose-th:p-2 prose-th:text-left
            prose-td:border prose-td:border-slate-300 prose-td:p-2
            prose-img:rounded-lg prose-img:shadow-md
            prose-hr:border-slate-300"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

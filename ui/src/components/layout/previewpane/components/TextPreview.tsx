import { FONT_ROLES } from '../../../../styles/fontManager';

interface TextPreviewProps {
  title?: string;
  content: string;
}

// TextPreview formats text note content selected from the canvas, showing the title and pre-wrapped body text.
export function TextPreview({ title, content }: TextPreviewProps) {
  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ ...FONT_ROLES.paneTitle, fontSize: '28px' }}>
          {title || 'Untitled Note'}
        </h1>
        <div
          className="whitespace-pre-wrap text-gray-800 leading-loose"
          style={{ ...FONT_ROLES.paneBody, fontSize: '18px', lineHeight: '1.8' }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

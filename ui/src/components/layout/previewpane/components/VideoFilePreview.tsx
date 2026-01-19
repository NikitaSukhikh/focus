interface VideoFilePreviewProps {
  videoPreviewUrl: string;
  isFullWindow?: boolean;
}

// VideoFilePreview renders local video files with a consistent player layout.
export function VideoFilePreview({ videoPreviewUrl, isFullWindow = false }: VideoFilePreviewProps) {
  const containerClassName = isFullWindow
    ? 'flex items-center justify-center h-full p-8'
    : 'w-full flex justify-center p-6';
  const maxWidthClassName = isFullWindow ? 'max-w-5xl' : 'max-w-full';

  return (
    <div className={containerClassName}>
      <div className={`w-full ${maxWidthClassName}`}>
        <video
          src={videoPreviewUrl}
          controls
          controlsList="nodownload"
          preload="metadata"
          style={{
            width: '100%',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            background: '#000'
          }}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

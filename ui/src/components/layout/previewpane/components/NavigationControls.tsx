import { Z_INDEX } from '../../../../constants/zIndex';

interface NavigationControlsProps {
  onNavigateNext: () => void;
  onNavigatePrevious: () => void;
  canNavigateNext: boolean;
  canNavigatePrevious: boolean;
}

// NavigationControls exposes left/right navigation buttons for navigating between tiles in spatial order.
export function NavigationControls({
  onNavigateNext,
  onNavigatePrevious,
  canNavigateNext,
  canNavigatePrevious
}: NavigationControlsProps) {
  return (
    <>
      <button
        onClick={onNavigatePrevious}
        disabled={!canNavigatePrevious}
        className="absolute left-2 rounded-full w-10 h-10 flex items-center justify-center text-xl"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--glass-bg)',
          color: 'var(--color-text-primary)',
          opacity: canNavigatePrevious ? 0.5 : 0.2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: Z_INDEX.CONTENT_PREVIEW + 2,
          cursor: canNavigatePrevious ? 'pointer' : 'not-allowed',
        }}
        title="Previous tile (Left arrow)"
      >
        &lt;
      </button>
      <button
        onClick={onNavigateNext}
        disabled={!canNavigateNext}
        className="absolute right-2 rounded-full w-10 h-10 flex items-center justify-center text-xl"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--glass-bg)',
          color: 'var(--color-text-primary)',
          opacity: canNavigateNext ? 0.5 : 0.2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: Z_INDEX.CONTENT_PREVIEW + 2,
          cursor: canNavigateNext ? 'pointer' : 'not-allowed',
        }}
        title="Next tile (Right arrow)"
      >
        &gt;
      </button>
    </>
  );
}

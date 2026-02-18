interface NavBarProps {
  total: number;
  current: number;
  isLast: boolean;
  cardHorizontalPadding: number;
  onBack: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
}

export function NavBar({
  total,
  current,
  isLast,
  cardHorizontalPadding,
  onBack,
  onNext,
  onGoTo,
}: NavBarProps) {
  return (
    <div className="relative w-full flex items-center justify-center mt-auto py-2">
      {/* Dots - always centered */}
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            onClick={() => onGoTo(i)}
            className="rounded-full transition-all"
            style={{
              width: i === current ? 20 : 8,
              height: 8,
              background: i === current ? '#4A90E2' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </div>

      {/* Back - pinned to left */}
      <div className="absolute" style={{ left: -(cardHorizontalPadding - 4) }}>
        <button
          className="text-sm px-4 py-2 rounded-lg transition-colors"
          style={{
            color: 'var(--color-text-secondary, #888)',
            visibility: current === 0 ? 'hidden' : 'visible',
          }}
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      {/* Next - pinned to right */}
      <div className="absolute" style={{ right: -(cardHorizontalPadding - 20) }}>
        <button
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#4A90E2' }}
          onClick={onNext}
        >
          {isLast ? 'Get started' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

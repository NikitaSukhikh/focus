import { Slide } from './types';

interface SlideContentProps {
  slide: Slide;
}

export function SlideContent({ slide }: SlideContentProps) {
  return (
    <div className="w-full flex flex-col items-center text-center">
      <h2
        className="text-2xl font-bold mb-3"
        style={{ color: 'var(--color-text-primary, #fff)' }}
      >
        {slide.title}
      </h2>

      <p
        className="text-base leading-relaxed"
        style={{ color: 'var(--color-text-secondary, #aaa)' }}
      >
        {slide.description}
      </p>

      {slide.image && (
        <img
          src={slide.image}
          alt={slide.title}
          className="mt-4 select-none pointer-events-none"
          style={{ maxHeight: 250, maxWidth: '80%', objectFit: 'contain', borderRadius: 12, overflow: 'hidden' }}
          draggable={false}
        />
      )}

      {slide.subtext !== undefined && (
        <p
          className="leading-relaxed mt-3"
          style={{ color: 'var(--color-text-secondary, #aaa)', opacity: 0.6, fontSize: 11 }}
        >
          {slide.subtext}
        </p>
      )}
    </div>
  );
}

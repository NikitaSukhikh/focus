import { useTranslation } from 'react-i18next';
import { Slide } from './types';

interface SlideContentProps {
  slide: Slide;
}

export function SlideContent({ slide }: SlideContentProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full flex flex-col items-center text-center">
      <h2
        className="text-lg font-bold mb-3"
        style={{ color: 'var(--color-text-primary, #fff)' }}
      >
        {t(slide.title)}
      </h2>

      <p
        className="text-base leading-relaxed"
        style={{ color: 'var(--color-text-secondary, #aaa)', whiteSpace: 'pre-line', textAlign: slide.descriptionAlign ?? 'center' }}
      >
        {t(slide.description)}
      </p>

      {slide.image && (
        <div className="mt-4 w-full" style={{ height: 340, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
          <img
            src={slide.image}
            alt={slide.title}
            className="select-none pointer-events-none"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            draggable={false}
          />
        </div>
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import { Z_INDEX } from '@/constants/zIndex';
import focusBrandImage from '../../../src-electron/focus-brand.png';
import { SLIDES } from './slides';
import { SlideContent } from './SlideContent';
import { NavBar } from './NavBar';

const DEFAULT_SPACE_NAME = 'My Space';

const CARD_MAX_WIDTH = 720;
const CARD_MIN_HEIGHT = 560;
const CARD_HORIZONTAL_PADDING = 48;
const LOGO_HEIGHT = 58;

interface IntroSlideshowProps {
  initialSpaceName?: string;
  onDone: (spaceName: string) => void;
}

export function IntroSlideshow({ initialSpaceName, onDone }: IntroSlideshowProps) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [contentMinHeight, setContentMinHeight] = useState<number | undefined>(undefined);
  const [spaceName, setSpaceName] = useState(initialSpaceName ?? DEFAULT_SPACE_NAME);
  const measureRefs = useRef<Array<HTMLDivElement | null>>([]);
  const isLast = current === SLIDES.length - 1;

  const handleDone = useCallback(() => {
    onDone(spaceName.trim() || DEFAULT_SPACE_NAME);
  }, [onDone, spaceName]);

  const next = useCallback(() => {
    if (isLast) {
      handleDone();
    } else {
      setCurrent((c) => c + 1);
    }
  }, [isLast, handleDone]);

  const back = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'Escape') {
        handleDone();
      } else if (e.key === 'ArrowLeft') {
        back();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [next, back, handleDone]);

  const measureMaxContentHeight = useCallback(() => {
    const maxHeight = measureRefs.current.reduce((max, el) => {
      if (!el) return max;
      const h = el.getBoundingClientRect().height;
      return h > max ? h : max;
    }, 0);
    setContentMinHeight(maxHeight > 0 ? maxHeight : undefined);
  }, []);

  useEffect(() => {
    measureMaxContentHeight();
    window.addEventListener('resize', measureMaxContentHeight);
    return () => window.removeEventListener('resize', measureMaxContentHeight);
  }, [measureMaxContentHeight]);

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z_INDEX.INTRO_SLIDESHOW }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="relative flex flex-col items-center text-center rounded-2xl shadow-2xl mx-4"
        style={{
          width: '100%',
          maxWidth: CARD_MAX_WIDTH,
          minHeight: CARD_MIN_HEIGHT,
          padding: `32px ${CARD_HORIZONTAL_PADDING}px 20px`,
          background: 'color-mix(in srgb, var(--background-dark) 95%, transparent)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Logo */}
        <img
          src={focusBrandImage}
          alt="Focus"
          className="select-none pointer-events-none mb-7"
          style={{ height: LOGO_HEIGHT, objectFit: 'contain' }}
          draggable={false}
        />

        {/* Skip */}
        <button
          className="absolute top-4 right-4 text-sm px-3 py-1 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary, #888)' }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          onClick={handleDone}
        >
          {t('introSlideshow.skip')}
        </button>

        {/* Slide content */}
        <div
          className="w-full flex flex-col items-center text-center"
          style={{ minHeight: contentMinHeight }}
        >
          <SlideContent slide={SLIDES[current]} />
          {isLast && (
            <div className="w-full mt-6" style={{ maxWidth: 320 }}>
              <label
                className="block text-sm mb-2 text-left"
                style={{ color: 'var(--color-text-secondary, #aaa)' }}
              >
                {t('introSlideshow.spaceNameLabel')}
              </label>
              <input
                type="text"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDone()}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--color-text-primary, #fff)',
                }}
                maxLength={100}
                autoFocus
              />
            </div>
          )}
        </div>

        <NavBar
          total={SLIDES.length}
          current={current}
          isLast={isLast}
          cardHorizontalPadding={CARD_HORIZONTAL_PADDING}
          onBack={back}
          onNext={next}
          onGoTo={setCurrent}
        />
      </div>

      {/* Measure all slides to lock the tallest content height */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ visibility: 'hidden', zIndex: -1 }}
      >
        <div
          style={{
            width: 'calc(100vw - 2rem)',
            maxWidth: CARD_MAX_WIDTH,
            padding: `48px ${CARD_HORIZONTAL_PADDING}px 20px`,
          }}
        >
          {SLIDES.map((slide, index) => (
            <div
              key={slide.title}
              ref={(el) => { measureRefs.current[index] = el; }}
              className="w-full flex flex-col items-center text-center"
            >
              <SlideContent slide={slide} />
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heroApi, type HeroSlide, type SlideButton } from '@/api/hero.api';

// Renders a single CTA button from slide data.
// Internal hrefs (starting with '/') use React Router Link for SPA navigation.
// External hrefs open in a new tab.
const SlideButtonLink = ({ btn }: { btn: SlideButton }) => {
  const isInternal = btn.href.startsWith('/');
  const baseStyle: React.CSSProperties =
    btn.variant === 'default'
      ? { background: '#B8913A', color: '#fff' }
      : { border: '1px solid rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.9)' };
  const className =
    'px-4 py-2 rounded-full text-[9px] font-bold tracking-[0.08em] uppercase transition-opacity hover:opacity-80';

  if (isInternal) {
    return (
      <Link to={btn.href} className={className} style={baseStyle}>
        {btn.label}
      </Link>
    );
  }
  return (
    <a href={btn.href} target="_blank" rel="noopener noreferrer" className={className} style={baseStyle}>
      {btn.label}
    </a>
  );
};

// Single slide layer — absolute positioned, fades in/out via opacity.
const SlideLayer = ({ slide, active }: { slide: HeroSlide; active: boolean }) => {
  const hasButtons = slide.buttons && slide.buttons.length > 0;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${slide.imagePath})` }}
      />
      {/* Gradient overlay — ensures text legibility */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.78) 55%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      {/* Text content — bottom-left. Label always visible; heading/subtitle/buttons conditional. */}
      <div className="absolute inset-0 flex flex-col justify-end p-[14px_16px]">
        <p
          className="text-[8px] font-bold uppercase mb-1"
          style={{ color: '#B8913A', letterSpacing: '0.22em', fontFamily: 'sans-serif' }}
        >
          ✦ Nowości &amp; Aktualności
        </p>
        {slide.heading && (
          <p
            className="font-bold text-white leading-tight mb-1 text-sm md:text-base"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {slide.heading}
          </p>
        )}
        {slide.subtitle && (
          <p className="text-[9px] mb-2.5" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif' }}>
            {slide.subtitle}
          </p>
        )}
        {hasButtons && (
          <div className="flex flex-wrap gap-1.5">
            {slide.buttons!.map((btn, i) => (
              <SlideButtonLink key={i} btn={btn} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const DashboardNewsBanner = () => {
  const { data: slides = [], isLoading } = useQuery({
    queryKey: ['hero-slides'], // shared cache with HeroSlider + admin invalidations
    queryFn: heroApi.getSlides,
    staleTime: 5 * 60 * 1000,
  });

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // restartKey is incremented on dot click to reset the autoplay interval from zero
  const [restartKey, setRestartKey] = useState(0);

  const next = useCallback(
    () => setCurrent(c => (c + 1) % slides.length),
    [slides.length],
  );
  const prev = useCallback(
    () => setCurrent(c => (c - 1 + slides.length) % slides.length),
    [slides.length],
  );

  // Clamp current index when slides list shrinks (e.g. admin removes a slide during session)
  useEffect(() => {
    setCurrent(c => (slides.length > 0 ? Math.min(c, slides.length - 1) : 0));
  }, [slides.length]);

  // Autoplay — cleared on unmount to prevent memory leaks.
  // restartKey in deps ensures the interval is reset from zero on dot click.
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [slides.length, paused, next, restartKey]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div
        className="w-full animate-pulse rounded-none"
        style={{ height: '160px', background: 'rgba(0,0,0,0.08)' }}
      />
    );
  }

  // Hidden when no active slides
  if (!slides.length) return null;

  const showNav = slides.length > 1;

  return (
    <section
      aria-label="Nowości i aktualności"
      className="relative w-full overflow-hidden"
      style={{ height: '160px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <SlideLayer key={slide.id} slide={slide} active={i === current} />
      ))}

      {showNav && (
        <>
          {/* Prev button */}
          <button
            onClick={prev}
            aria-label="Poprzedni slajd"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-colors hover:bg-white/20"
            style={{
              width: '24px',
              height: '24px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <ChevronLeft size={14} className="text-white/80" />
          </button>

          {/* Next button */}
          <button
            onClick={next}
            aria-label="Następny slajd"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full transition-colors hover:bg-white/20"
            style={{
              width: '24px',
              height: '24px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <ChevronRight size={14} className="text-white/80" />
          </button>

          {/* Dot indicators — vertical, right edge */}
          <div
            className="absolute flex flex-col"
            style={{ right: '36px', top: '50%', transform: 'translateY(-50%)', gap: '5px' }}
          >
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setRestartKey(k => k + 1); }}
                aria-label={`Przejdź do slajdu ${i + 1}`}
                aria-current={i === current ? 'true' : undefined}
                className="pointer-events-auto rounded-full transition-colors"
                style={{
                  width: '6px',
                  height: '6px',
                  background: i === current ? '#B8913A' : 'rgba(255,255,255,0.28)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

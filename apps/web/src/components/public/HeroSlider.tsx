import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heroApi } from '@/api/hero.api';
import { Button } from '@/components/ui/button';

const POSITION_CLASSES: Record<string, string> = {
  'top-left':      'items-start justify-start text-left',
  'top-center':    'items-start justify-center text-center',
  'top-right':     'items-start justify-end text-right',
  'middle-left':   'items-center justify-start text-left',
  'middle-center': 'items-center justify-center text-center',
  'middle-right':  'items-center justify-end text-right',
  'bottom-left':   'items-end justify-start text-left',
  'bottom-center': 'items-end justify-center text-center',
  'bottom-right':  'items-end justify-end text-right',
};

const BUTTON_JUSTIFY_CLASSES: Record<string, string> = {
  'top-left':      'justify-start',
  'top-center':    'justify-center',
  'top-right':     'justify-end',
  'middle-left':   'justify-start',
  'middle-center': 'justify-center',
  'middle-right':  'justify-end',
  'bottom-left':   'justify-start',
  'bottom-center': 'justify-center',
  'bottom-right':  'justify-end',
};

const FONT_CLASSES: Record<string, string> = {
  'heading': 'font-heading',
  'sans':    'font-sans',
  'elegant': 'font-light italic',
};

export const HeroSlider = () => {
  const { data: slides = [] } = useQuery({
    queryKey: ['hero-slides'],
    queryFn: heroApi.getSlides,
    staleTime: 5 * 60_000,
  });

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [scale, setScale] = useState(1.08);

  useEffect(() => {
    const onScroll = () => {
      const progress = Math.min(window.scrollY / 300, 1);
      setScale(1.08 - 0.08 * progress);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const next = useCallback(() => setCurrent(c => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [slides.length, paused, next]);

  if (!slides.length) return null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: '100vh' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => {
        const pos = slide.textPosition ?? 'middle-center';
        const posClass = POSITION_CLASSES[pos] ?? POSITION_CLASSES['middle-center'];
        const buttonJustify = BUTTON_JUSTIFY_CLASSES[pos] ?? 'justify-start';
        const fontClass = FONT_CLASSES[slide.fontStyle ?? 'heading'] ?? FONT_CLASSES['heading'];
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <img
              src={slide.imagePath}
              alt={slide.title ?? ''}
              className="w-full h-full object-cover"
              style={{
                transform: i === current ? `scale(${scale})` : 'scale(1)',
                willChange: i === current ? 'transform' : 'auto',
                transition: 'none',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, transparent 40%, rgba(28,21,16,0.7) 100%)',
              }}
            />
            {(slide.heading || slide.subtitle || slide.buttons?.length) && (
              <div className={`absolute inset-0 flex p-10 md:p-16 ${posClass}`}>
                <div className="max-w-2xl">
                  {slide.heading && (
                    <h1 className={`text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-md ${fontClass}`}>
                      {slide.heading}
                    </h1>
                  )}
                  {slide.subtitle && (
                    <p className="text-base md:text-lg text-white/90 mb-8 drop-shadow">
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.buttons && slide.buttons.length > 0 && (
                    <div className={`flex flex-wrap gap-3 ${buttonJustify}`}>
                      {slide.buttons.map((btn, j) => (
                        <Link key={j} to={btn.href}>
                          <Button variant={btn.variant} size="lg">{btn.label}</Button>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"
            aria-label="Poprzedni slajd"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-2 transition-colors"
            aria-label="Następny slajd"
          >
            <ChevronRight size={24} />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                aria-label={`Slajd ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

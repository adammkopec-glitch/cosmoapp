import { useEffect, useRef, useState } from 'react';

interface UseClipRevealOptions {
  threshold?: number;  // 0–1, default 0.15
  delay?: number;      // ms delay after element enters viewport
}

export function useClipReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseClipRevealOptions = {}
) {
  const { threshold = 0.15, delay = 0 } = options;
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setRevealed(true), delay);
          } else {
            setRevealed(true);
          }
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, delay]);

  return { ref, revealed };
}

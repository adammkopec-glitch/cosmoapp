import { cn } from '@/lib/utils';

interface GeoCircleProps {
  size?: number;
  opacity?: number;
  className?: string;
}

/** Radial gradient circle — dekoracja tła */
export function GeoCircle({ size = 240, opacity = 0.18, className }: GeoCircleProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('absolute pointer-events-none select-none deco-float', className)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(196,168,130,${opacity}) 0%, transparent 70%)`,
      }}
    />
  );
}

interface GeoArcProps {
  size?: number;
  opacity?: number;
  className?: string;
}

/** Ćwiartka okręgu (stroke only) — dekoracja narożnika */
export function GeoArc({ size = 100, opacity = 0.25, className }: GeoArcProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('absolute pointer-events-none select-none deco-float', className)}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `1px solid rgba(196,168,130,${opacity})`,
      }}
    />
  );
}

interface SectionNumberProps {
  n: number;
  opacity?: number;
  className?: string;
}

/** Wielka dekoracyjna cyfra sekcji (01, 02, …) */
export function SectionNumber({ n, opacity = 0.07, className }: SectionNumberProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute pointer-events-none select-none font-heading leading-none',
        className
      )}
      style={{
        fontSize: 130,
        fontWeight: 700,
        color: `rgba(196,168,130,${opacity})`,
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}
    >
      {String(n).padStart(2, '0')}
    </span>
  );
}

interface DecoLineProps {
  width?: number;
  className?: string;
}

/** Horizontal caramel line — do eyebrow labels */
export function DecoLine({ width = 24, className }: DecoLineProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block bg-caramel flex-shrink-0 pointer-events-none select-none', className)}
      style={{ width, height: 1 }}
    />
  );
}

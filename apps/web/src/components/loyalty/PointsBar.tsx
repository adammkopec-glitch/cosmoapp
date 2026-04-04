// filepath: apps/web/src/components/loyalty/PointsBar.tsx
import { useEffect, useRef } from 'react';

export const PointsBar = ({
  completedVisits,
  nextTierVisits,
  currentTierName,
  nextTierName,
}: {
  completedVisits: number;
  nextTierVisits: number;
  currentTierName: string;
  nextTierName: string;
}) => {
  const isMaxTier = nextTierName === 'Maksymalny Poziom' || completedVisits >= nextTierVisits;
  const percentage = isMaxTier ? 100 : Math.min(100, Math.max(0, (completedVisits / nextTierVisits) * 100));
  const visitsLeft = Math.max(0, nextTierVisits - completedVisits);

  // SVG ring calculations
  const radius = 56;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!circleRef.current) return;
    const offset = circumference - (percentage / 100) * circumference;
    circleRef.current.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
    circleRef.current.style.strokeDashoffset = String(offset);
  }, [percentage, circumference]);

  const size = (radius + strokeWidth) * 2;

  return (
    <div className="space-y-4" data-tour="loyalty-points-bar">
      <div className="flex items-center gap-6">
        {/* Circular ring */}
        <div className="shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(184,145,58,0.12)"
              strokeWidth={strokeWidth}
            />
            {/* Progress arc */}
            <circle
              ref={circleRef}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#B8913A"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference} /* starts at 0%, animates to target */
            />
          </svg>
          {/* Center label — positioned via relative wrapper */}
          <div
            style={{
              marginTop: `-${size}px`,
              height: `${size}px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#B8913A', lineHeight: 1 }}>
              {completedVisits}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(26,18,8,0.5)', marginTop: 2 }}>wizyt</span>
          </div>
        </div>

        {/* Right side info */}
        <div className="flex-1">
          <p className="font-heading font-bold text-xl" style={{ color: '#1A1208' }}>
            {currentTierName}
          </p>
          {!isMaxTier ? (
            <>
              <p className="text-sm mt-1" style={{ color: 'rgba(26,18,8,0.6)' }}>
                Poziom: <strong style={{ color: '#1A1208' }}>{currentTierName}</strong>
              </p>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(26,18,8,0.5)' }}>
                {Math.round(percentage)}% do {nextTierName}
              </p>
            </>
          ) : (
            <p className="text-sm mt-1" style={{ color: '#B8913A' }}>Najwyższy poziom!</p>
          )}
        </div>
      </div>

      {/* Progress message */}
      {!isMaxTier ? (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: 'rgba(184,145,58,0.1)', color: '#92400E' }}
        >
          ✦ Zostało Ci <strong>{visitsLeft} {visitsLeft === 1 ? 'wizyta' : visitsLeft < 5 ? 'wizyty' : 'wizyt'}</strong> do poziomu <strong>{nextTierName}</strong>!
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: 'rgba(184,145,58,0.1)', color: '#92400E' }}
        >
          🏆 Osiągnąłeś/aś najwyższy poziom lojalnościowy!
        </div>
      )}
    </div>
  );
};

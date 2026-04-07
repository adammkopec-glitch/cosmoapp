import React from 'react';
import { useClipReveal } from '@/hooks/useClipReveal';
import { cn } from '@/lib/utils';

interface ClipRevealImageProps {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  delay?: number;
  objectFit?: 'cover' | 'contain';
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

export const ClipRevealImage = ({
  src,
  alt,
  className,
  wrapperClassName,
  delay = 0,
  objectFit = 'cover',
  onError,
}: ClipRevealImageProps) => {
  const { ref, revealed } = useClipReveal<HTMLDivElement>({ delay });

  return (
    <div
      ref={ref}
      className={cn('overflow-hidden', wrapperClassName)}
      style={{
        clipPath: revealed ? 'inset(0% 0 0 0)' : 'inset(100% 0 0 0)',
        transition: 'clip-path 0.7s cubic-bezier(0.76,0,0.24,1)',
      }}
    >
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full transition-transform duration-700',
          objectFit === 'cover' ? 'object-cover' : 'object-contain',
          className
        )}
        style={{
          transform: revealed ? 'scale(1)' : 'scale(1.05)',
          transition: 'transform 0.9s cubic-bezier(0.76,0,0.24,1)',
        }}
        onError={onError}
      />
    </div>
  );
};

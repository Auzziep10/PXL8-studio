
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type ParallaxImageProps = {
  src: string;
  alt: string;
  className?: string;
  [key: string]: any; // Allow other props like data-ai-hint
};

export function ParallaxImage({ src, alt, className, ...props }: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<React.CSSProperties>({});
  const [imageTransform, setImageTransform] = useState<React.CSSProperties>({});

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();

    const x = clientX - left;
    const y = clientY - top;

    const rotateX = ((y / height) - 0.5) * -15; // Max rotation of 7.5 degrees
    const rotateY = ((x / width) - 0.5) * 15;  // Max rotation of 7.5 degrees
    
    const translateX = ((x / width) - 0.5) * -20; // Max translate of 10px
    const translateY = ((y / height) - 0.5) * -20; // Max translate of 10px

    setTransform({
      transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: 'transform 0.1s ease-out',
    });
    
    setImageTransform({
        transform: `translateX(${translateX}px) translateY(${translateY}px) scale(1.1)`,
        transition: 'transform 0.1s ease-out',
    });
  };

  const handleMouseLeave = () => {
    setTransform({
      transform: 'rotateX(0deg) rotateY(0deg)',
      transition: 'transform 0.6s ease-in-out',
    });
    setImageTransform({
        transform: 'translateX(0) translateY(0) scale(1.1)',
        transition: 'transform 0.6s ease-in-out',
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={transform}
      className={cn(
        'relative aspect-[4/3] transform-style-3d rounded-2xl border border-border transition-transform',
        className
      )}
    >
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <Image
                src={src}
                alt={alt}
                fill
                className="object-cover"
                style={imageTransform}
                {...props}
            />
        </div>
    </div>
  );
}

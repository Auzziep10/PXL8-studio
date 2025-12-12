
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type ParallaxContainerProps = {
  children: React.ReactNode;
  className?: string;
  speed?: number; // Speed factor for the parallax effect, e.g., 0.5 for half speed
};

export function ParallaxContainer({
  children,
  className,
  speed = 0.5,
}: ParallaxContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const screenHeight = window.innerHeight;

        // Check if the element is in the viewport
        if (rect.top < screenHeight && rect.bottom > 0) {
          // Calculate the center of the element relative to the viewport
          const elementCenterY = rect.top + rect.height / 2;
          // Calculate how far the center of the element is from the center of the screen
          const distanceFromCenter = screenHeight / 2 - elementCenterY;
          // Apply the parallax effect
          setTranslateY(distanceFromCenter * speed);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [speed]);

  return (
    <div ref={containerRef} className={cn('overflow-hidden', className)}>
      <div
        style={{
          transform: `translateY(${translateY}px) scale(1.25)`,
          willChange: 'transform',
          transition: 'transform 0.2s ease-out', // Smooth out the transform
        }}
        className="h-full w-full"
      >
        {children}
      </div>
    </div>
  );
}

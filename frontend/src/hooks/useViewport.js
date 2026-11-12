import { useState, useEffect } from 'react';

/**
 * Pixel-aware viewport hook
 * Tracks viewport dimensions with zero flicker and provides strict responsive boundaries
 */
export function useViewport() {
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId = null;
    const handleResize = () => {
      // Small debounce to avoid redundant renders during active drag-resizing
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 50);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const width = dimensions.width;
  const height = dimensions.height;

  const isCompactMobile = width <= 390;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  return {
    width,
    height,
    isCompactMobile,
    isMobile,
    isTablet,
    isDesktop,
  };
}


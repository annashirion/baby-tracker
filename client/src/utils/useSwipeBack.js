import { useEffect, useRef } from 'react';

/**
 * Custom hook to enable swipe-back gesture from the left or right edge
 * @param {Function} onBack - Callback function to execute when swipe-back is detected
 * @param {Object} options - Configuration options
 * @param {number} options.minSwipeDistance - Minimum distance in pixels to trigger (default: 100)
 * @param {number} options.edgeThreshold - Distance from edge to start detecting (default: 20)
 * @param {number} options.maxVerticalDeviation - Maximum vertical movement allowed (default: 50)
 */
export function useSwipeBack(onBack, options = {}) {
  const {
    minSwipeDistance = 100,
    edgeThreshold = 20,
    maxVerticalDeviation = 50,
  } = options;

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartEdge = useRef(null); // 'left' or 'right'
  const containerRef = useRef(null);

  useEffect(() => {
    if (!onBack) return;

    const container = containerRef.current;
    if (!container) return;

    const getContainerWidth = () => {
      return container.clientWidth || window.innerWidth;
    };

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      const containerWidth = getContainerWidth();
      const leftEdge = touch.clientX <= edgeThreshold;
      const rightEdge = touch.clientX >= containerWidth - edgeThreshold;

      if (leftEdge) {
        // Touch started from left edge - expect swipe right
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        touchStartEdge.current = 'left';
      } else if (rightEdge) {
        // Touch started from right edge - expect swipe left
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        touchStartEdge.current = 'right';
      } else {
        touchStartX.current = null;
        touchStartY.current = null;
        touchStartEdge.current = null;
      }
    };

    const handleTouchMove = (e) => {
      // Prevent default scrolling if we're tracking a swipe
      if (touchStartX.current !== null) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX.current);
        const deltaY = Math.abs(touch.clientY - touchStartY.current);
        
        // If horizontal movement is significant and vertical is minimal, prevent scroll
        if (deltaX > 10 && deltaY < maxVerticalDeviation) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (touchStartX.current === null || touchStartEdge.current === null) return;

      const touch = e.changedTouches[0];
      const containerWidth = getContainerWidth();
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      let isValidSwipe = false;

      if (touchStartEdge.current === 'left') {
        // Swipe from left edge: must swipe right
        isValidSwipe = 
          deltaX > minSwipeDistance &&
          deltaY < maxVerticalDeviation &&
          touch.clientX > edgeThreshold;
      } else if (touchStartEdge.current === 'right') {
        // Swipe from right edge: must swipe left
        isValidSwipe = 
          deltaX < -minSwipeDistance &&
          deltaY < maxVerticalDeviation &&
          touch.clientX < containerWidth - edgeThreshold;
      }

      if (isValidSwipe) {
        onBack();
      }

      touchStartX.current = null;
      touchStartY.current = null;
      touchStartEdge.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onBack, minSwipeDistance, edgeThreshold, maxVerticalDeviation]);

  return containerRef;
}


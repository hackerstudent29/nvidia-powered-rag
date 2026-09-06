import { useState, useEffect, useCallback } from "react";

interface MobileLayoutState {
  isMobile: boolean;       // < 640px viewport width
  isTablet: boolean;       // 640–1023px
  isIOS: boolean;          // iPhone / iPad Safari
  isTouchDevice: boolean;  // Any touch-capable device
  keyboardOffset: number;  // Pixels the keyboard is pushing up from bottom
  isKeyboardOpen: boolean; // True when virtual keyboard is visible
  viewportHeight: number;  // Current visible viewport height (dvh equivalent)
}

/**
 * useMobileLayout — Single source of truth for all mobile/touch layout state.
 *
 * Uses the `visualViewport` API to accurately detect iOS virtual keyboard
 * appearance and compute how many pixels the input needs to shift upward.
 *
 * Falls back gracefully on browsers that don't support visualViewport.
 */
export function useMobileLayout(): MobileLayoutState {
  const [state, setState] = useState<MobileLayoutState>(() => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = typeof window !== "undefined" ? window.innerHeight : 768;
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    const isTouchDevice =
      typeof navigator !== "undefined" &&
      (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

    return {
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isIOS,
      isTouchDevice,
      keyboardOffset: 0,
      isKeyboardOpen: false,
      viewportHeight: h,
    };
  });

  const updateLayout = useCallback(() => {
    const w = window.innerWidth;
    const windowHeight = window.innerHeight;

    // visualViewport is the most accurate API for tracking keyboard presence
    const visualVp = window.visualViewport;
    const vpHeight = visualVp ? visualVp.height : windowHeight;
    const vpOffsetTop = visualVp ? visualVp.offsetTop : 0;

    // Keyboard offset = difference between full window height and visible viewport
    // When keyboard is open on iOS, vpHeight shrinks significantly
    const rawKeyboardOffset = Math.max(0, windowHeight - vpHeight - vpOffsetTop);

    // Only consider keyboard "open" if offset > 100px (avoids browser chrome noise)
    const isKeyboardOpen = rawKeyboardOffset > 100;

    setState({
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isIOS:
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream,
      isTouchDevice: navigator.maxTouchPoints > 0 || "ontouchstart" in window,
      keyboardOffset: isKeyboardOpen ? rawKeyboardOffset : 0,
      isKeyboardOpen,
      viewportHeight: vpHeight,
    });
  }, []);

  useEffect(() => {
    updateLayout();

    const vvp = window.visualViewport;
    if (vvp) {
      vvp.addEventListener("resize", updateLayout);
      vvp.addEventListener("scroll", updateLayout);
    }
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", updateLayout);

    return () => {
      if (vvp) {
        vvp.removeEventListener("resize", updateLayout);
        vvp.removeEventListener("scroll", updateLayout);
      }
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("orientationchange", updateLayout);
    };
  }, [updateLayout]);

  return state;
}

import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  delay?: number;
  position?: 'top' | 'bottom';
  className?: string;
  disabled?: boolean;
}

export function Tooltip({ content, children, delay = 300, position = 'top', className = '', disabled = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<any>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 360;
    const vh = typeof window !== "undefined" ? window.innerHeight : 600;

    const rawX = rect.left + rect.width / 2;
    const clampedX = Math.max(16, Math.min(vw - 16, rawX));
    const clampedY = position === 'top' 
      ? Math.max(8, rect.top - 8) 
      : Math.min(vh - 8, rect.bottom + 8);

    setCoords({ x: clampedX, y: clampedY });
  };

  const isTouchScreen = () => {
    if (typeof window === "undefined") return false;
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia("(pointer: coarse)").matches
    );
  };

  const showTooltip = () => {
    if (disabled || !content || isTouchScreen()) return;
    timeoutRef.current = setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const child = React.Children.only(children) as any;
  const clone = React.cloneElement(child, {
    ref: triggerRef,
    onMouseEnter: (e: any) => {
      if (!isTouchScreen()) showTooltip();
      if (child.props?.onMouseEnter) child.props.onMouseEnter(e);
    },
    onMouseLeave: (e: any) => {
      hideTooltip();
      if (child.props?.onMouseLeave) child.props.onMouseLeave(e);
    },
    onFocus: (e: any) => {
      if (!isTouchScreen()) showTooltip();
      if (child.props?.onFocus) child.props.onFocus(e);
    },
    onBlur: (e: any) => {
      hideTooltip();
      if (child.props?.onBlur) child.props.onBlur(e);
    },
    onTouchStart: (e: any) => {
      hideTooltip();
      if (child.props?.onTouchStart) child.props.onTouchStart(e);
    },
    onClick: (e: any) => {
      hideTooltip(); 
      if (child.props?.onClick) child.props.onClick(e);
    },
  });

  return (
    <>
      {clone}
      {isVisible && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: position === 'top' ? 4 : -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={{
                position: 'fixed',
                top: coords.y,
                left: coords.x,
                pointerEvents: 'none',
                zIndex: 9999,
              }}
              className="flex items-center justify-center"
            >
              <div 
                className={`
                  relative -translate-x-1/2 
                  ${position === 'top' ? '-translate-y-full' : 'translate-y-0'}
                  px-2.5 py-1.5 text-[11.5px] font-semibold tracking-wide font-sans
                  bg-[#2E6B5E] text-white dark:bg-[#18181b] dark:text-zinc-100
                  border border-[#2E6B5E]/20 dark:border-[#10b981]/50 rounded-md shadow-xl whitespace-nowrap backdrop-blur-md max-w-[85vw] truncate
                  ${className}
                `}
              >
                {content}
                <div 
                  className={`
                    absolute left-1/2 -translate-x-1/2 w-0 h-0
                    border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent
                    ${position === 'top' ? 'top-full border-t-[5px] border-t-[#2E6B5E] dark:border-t-[#18181b]' : 'bottom-full border-b-[5px] border-b-[#2E6B5E] dark:border-b-[#18181b]'}
                  `} 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

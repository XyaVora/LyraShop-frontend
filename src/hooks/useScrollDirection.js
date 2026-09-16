// src/hooks/useScrollDirection.js — chiều cuộn + khoảng cách, dùng chung cho navbar / marquee / parallax.
import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * @returns {{ y: number, dir: 'up'|'down', compact: boolean, hidden: boolean }}
 */
export function useScrollDirection() {
  const [state, setState] = useState({
    y: 0,
    dir: 'down',
    compact: false,
    hidden: false,
  });
  const lastY = useRef(0);
  const dirRef = useRef('down');
  const hiddenRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    lastY.current = window.scrollY || 0;
    let ticking = false;

    const read = () => {
      const y = window.scrollY || 0;
      const delta = y - lastY.current;
      if (Math.abs(delta) > 4) dirRef.current = delta > 0 ? 'down' : 'up';

      const compact = y > 40;
      if (prefersReducedMotion()) {
        hiddenRef.current = false;
      } else if (y < 80) {
        hiddenRef.current = false;
      } else if (dirRef.current === 'down' && y > 120) {
        hiddenRef.current = true;
      } else if (dirRef.current === 'up') {
        hiddenRef.current = false;
      }

      lastY.current = y;
      ticking = false;
      setState({
        y,
        dir: dirRef.current,
        compact,
        hidden: hiddenRef.current,
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return state;
}

export default useScrollDirection;

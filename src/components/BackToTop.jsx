// src/components/BackToTop.jsx — nút góc phải dưới, kéo về đầu trang.
import { useEffect } from 'react';
import { useScrollDirection } from '../hooks/useScrollDirection';

export default function BackToTop() {
  const { y, dir } = useScrollDirection();
  const visible = y > 420;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    document.documentElement.dataset.scroll = dir;
    return undefined;
  }, [dir]);

  const goTop = () => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      className={`back-to-top${visible ? ' is-visible' : ''}`}
      onClick={goTop}
      aria-label="Về đầu trang"
      tabIndex={visible ? 0 : -1}
    >
      <i className="bi bi-arrow-up" aria-hidden="true" />
    </button>
  );
}

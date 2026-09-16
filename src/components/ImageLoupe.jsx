// src/components/ImageLoupe.jsx — kính lúp vuông khi di chuột trên ảnh sản phẩm.
import { useCallback, useRef, useState } from 'react';
import { Pic } from './index.jsx';

const LENS = 168;
const ZOOM = 2.45;

function zoomSrc(src) {
  if (!src || !/images\.unsplash\.com/.test(src)) return src;
  return src.replace(/([?&]w=)\d+/, '$11600');
}

export default function ImageLoupe({
  src,
  alt,
  tint,
  icon,
  sizes,
  onFallbackClick,
}) {
  const stageRef = useRef(null);
  const [lens, setLens] = useState(null);

  const updateLens = useCallback((clientX, clientY) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    const px = Math.max(0, Math.min(r.width, clientX - r.left));
    const py = Math.max(0, Math.min(r.height, clientY - r.top));
    setLens({ px, py, w: r.width, h: r.height });
  }, []);

  const onMove = (e) => updateLens(e.clientX, e.clientY);
  const onLeave = () => setLens(null);

  const onClick = (e) => {
    if (lens) {
      e.preventDefault();
      return;
    }
    onFallbackClick?.(e);
  };

  const left = lens ? Math.max(0, Math.min(lens.w - LENS, lens.px - LENS / 2)) : 0;
  const top = lens ? Math.max(0, Math.min(lens.h - LENS, lens.py - LENS / 2)) : 0;

  return (
    <div
      ref={stageRef}
      className={`gallery-loupe${lens ? ' is-active' : ''}`}
      onMouseMove={onMove}
      onMouseEnter={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      role="img"
      aria-label={`${alt}. Di chuột để phóng to như kính lúp.`}
    >
      <Pic
        as="span"
        src={src}
        alt={alt}
        tint={tint}
        icon={icon}
        eager
        sizes={sizes}
      />
      {lens && src && (
        <span
          className="gallery-loupe-lens"
          aria-hidden="true"
          style={{
            width: LENS,
            height: LENS,
            left,
            top,
            backgroundImage: `url("${zoomSrc(src)}")`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${lens.w * ZOOM}px ${lens.h * ZOOM}px`,
            backgroundPosition: `${-(lens.px * ZOOM - LENS / 2)}px ${-(lens.py * ZOOM - LENS / 2)}px`,
          }}
        />
      )}
    </div>
  );
}

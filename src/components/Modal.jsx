// src/components/Modal.jsx — modal dùng chung (bảng size, xác nhận, form, lightbox…)
// Overlay + ESC + khoá cuộn + role/aria + quản lý focus. Dùng class của index.css.
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock, useDialogA11y } from './index.jsx';
import '../styles/components.css';

/** Ánh xạ prop size sang class có sẵn trong index.css. */
function sizeClass(size) {
  if (size === 'sm') return ' narrow';
  if (size === 'lg' || size === 'full') return ' wide';
  if (size === 'lightbox') return ' lightbox';
  return '';
}

/**
 * @param {boolean} open
 * @param {Function} onClose
 * @param {string} title            tiêu đề (dùng cho aria-labelledby)
 * @param {React.ReactNode} footer  vùng nút ở đáy modal
 * @param {'sm'|'md'|'lg'|'full'|'lightbox'} size
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
  hideClose = false,
  label,
}) {
  const panelRef = useRef(null);
  const titleId = useId();

  useBodyScrollLock(open);
  useDialogA11y(open, panelRef, onClose);

  if (!open || typeof document === 'undefined') return null;

  // Bấm ra vùng nền (không phải panel) thì đóng.
  const onOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div className="lyra-modal-overlay" onClick={onOverlayClick}>
      <div
        ref={panelRef}
        className={`lyra-modal${sizeClass(size)}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? label || 'Hộp thoại' : undefined}
        tabIndex={-1}
      >
        {(title || !hideClose) && (
          <div className="modal-head">
            {title ? (
              <h2 className="modal-title" id={titleId}>
                {title}
              </h2>
            ) : (
              <span />
            )}
            {!hideClose && (
              <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

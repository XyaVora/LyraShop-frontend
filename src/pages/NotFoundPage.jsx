// src/pages/NotFoundPage.jsx
import { useApp } from '../context/AppContext';

export default function NotFoundPage() {
  const { navigate } = useApp();
  return (
    <div className="not-found">
      <div className="not-found-num">404</div>
      <h2 className="not-found-title">Trang không tồn tại</h2>
      <p className="not-found-sub">Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang địa chỉ khác.</p>
      <div className="d-flex gap-3">
        <button className="btn-maison" onClick={() => navigate('home')}>
          <i className="bi bi-house" /> Về trang chủ
        </button>
        <button className="btn-outline-maison" onClick={() => navigate('shop')}>
          Khám phá shop
        </button>
      </div>
    </div>
  );
}

// src/components/LoadingScreen.jsx
export function LoadingScreen() {
  return (
    <div className="loader-screen">
      <div className="loader-logo">MAISON</div>
      <div className="loader-bar" />
      <div style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 12 }}>
        Loading...
      </div>
    </div>
  );
}

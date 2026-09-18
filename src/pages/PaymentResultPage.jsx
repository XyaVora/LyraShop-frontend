import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { extractErrorMessage, paymentApi } from '../services/api';
import { Footer } from '../components/index.jsx';

export default function PaymentResultPage() {
  const { navigate } = useApp();
  const [state, setState] = useState({ status: 'loading', message: 'Đang xác thực giao dịch VNPay...' });

  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const gatewaySucceeded = params.vnp_ResponseCode === '00';

    paymentApi.confirmVnpayReturn(params)
      .then(({ data }) => {
        if (cancelled) return;
        const backendAccepted = data?.RspCode === '00' || data?.RspCode === '02';
        if (gatewaySucceeded && backendAccepted) {
          setState({ status: 'success', message: 'Thanh toán đã được xác nhận thành công.' });
        } else {
          setState({ status: 'failed', message: 'Giao dịch chưa thành công hoặc đã bị hủy.' });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: 'failed', message: extractErrorMessage(error, 'Không thể xác thực giao dịch VNPay.') });
        }
      });

    return () => { cancelled = true; };
  }, []);

  const success = state.status === 'success';
  return (
    <div>
      <main style={{ minHeight: '65vh', display: 'grid', placeItems: 'center', padding: '72px 20px' }}>
        <section style={{ maxWidth: 560, width: '100%', textAlign: 'center', padding: 40, border: '1px solid var(--border)', background: '#fff' }}>
          <i
            className={`bi ${state.status === 'loading' ? 'bi-arrow-repeat' : success ? 'bi-check-circle' : 'bi-x-circle'}`}
            style={{ fontSize: 52, color: success ? '#2E7D32' : state.status === 'failed' ? '#C53030' : 'var(--warm)' }}
          />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 300, margin: '20px 0 10px' }}>
            {state.status === 'loading' ? 'Đang xử lý' : success ? 'Thanh toán thành công' : 'Thanh toán chưa thành công'}
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: 28 }}>{state.message}</p>
          {state.status !== 'loading' && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-lyra" onClick={() => navigate('profile', { profileTab: 'orders' })}>Xem đơn hàng</button>
              <button className="btn-outline-lyra" onClick={() => navigate(success ? 'shop' : 'cart')}>
                {success ? 'Tiếp tục mua sắm' : 'Quay lại giỏ hàng'}
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}

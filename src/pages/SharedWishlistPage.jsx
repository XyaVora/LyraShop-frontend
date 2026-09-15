import { useEffect, useState } from 'react';
import { wishlistApi, productApi, extractErrorMessage } from '../services/api';
import { normalizeProduct } from '../data/products';
import { ProductCard, Footer } from '../components/index.jsx';
import { useApp } from '../context/AppContext';

export default function SharedWishlistPage() {
  const { navigate } = useApp();
  const shareId = window.location.pathname.split('/').filter(Boolean)[1];
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    wishlistApi.shared(shareId).then(async ({ data }) => {
      const details = await Promise.allSettled((data || []).map(item => productApi.get(item.productId)));
      if (!cancelled) setProducts(details.filter(x => x.status === 'fulfilled').map((x, i) => normalizeProduct(x.value.data, i)));
    }).catch(e => {
      if (!cancelled) setError(extractErrorMessage(e, 'Liên kết không tồn tại hoặc đã hết hạn'));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [shareId]);

  return <div>
    <section className="section"><div className="container-fluid px-4 px-lg-5">
      <h1 className="section-title">Danh sách <em>được chia sẻ</em></h1>
      {loading ? <p>Đang tải...</p> : error ? <p style={{ color: 'var(--danger)' }}>{error}</p>
        : products.length === 0 ? <p>Danh sách này chưa có sản phẩm.</p>
          : <div className="products-grid">{products.map((p, i) => <ProductCard key={p.id} product={p} delay={i % 4} />)}</div>}
    </div></section>
    <Footer navigate={navigate} />
  </div>;
}

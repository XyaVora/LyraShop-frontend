// src/pages/WishlistPage.jsx — Danh sách yêu thích của LYRA.
// Lưới dùng .products-grid (không inline gridTemplateColumns), thẻ dùng <Pic>,
// chế độ chọn nhiều bằng checkbox thật, mọi thao tác hàng loạt chỉ mở drawer
// MỘT lần và hiện MỘT toast tổng kết.
import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, fmt, relatedProducts } from '../data/products';
import { buildUrl } from '../router.js';
import {
  EmptyState,
  Footer,
  Pic,
  ProductCard,
  SectionHeader,
  Stars,
  isModifiedClick,
} from '../components/index.jsx';
import Modal from '../components/Modal.jsx';
import '../styles/wishlist.css';

const SORTS = [
  { value: 'added', label: 'Mới lưu nhất' },
  { value: 'price-asc', label: 'Giá: thấp đến cao' },
  { value: 'price-desc', label: 'Giá: cao đến thấp' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'discount', label: 'Giảm giá nhiều nhất' },
];

export default function WishlistPage() {
  const { navigate } = useApp();
  const { wishlist, toggleWishlist, addToCart, openCart, showToast } = useCart();

  const [sortBy, setSortBy] = useState('added');
  const [catFilter, setCatFilter] = useState('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmRemove, setConfirmRemove] = useState(false);

  /* ── Số liệu tính THẬT từ danh sách đã lưu ─────────────────────────── */
  const totalValue = useMemo(
    () => wishlist.reduce((sum, p) => sum + p.price, 0),
    [wishlist],
  );
  const totalSaving = useMemo(
    () => wishlist.reduce((sum, p) => sum + Math.max(0, (p.oldPrice || 0) - p.price), 0),
    [wishlist],
  );

  /* ── Bộ lọc danh mục dựng từ chính danh sách ───────────────────────── */
  const catTabs = useMemo(() => {
    const counter = new Map();
    wishlist.forEach((p) => counter.set(p.cat, (counter.get(p.cat) || 0) + 1));
    return [...counter.entries()].map(([name, count]) => ({ name, count }));
  }, [wishlist]);

  const filtered = useMemo(
    () => (catFilter === 'all' ? wishlist : wishlist.filter((p) => p.cat === catFilter)),
    [wishlist, catFilter],
  );

  /* ── Sắp xếp — luôn thao tác trên bản sao ──────────────────────────── */
  const view = useMemo(() => {
    const list = [...filtered];
    // toggleWishlist thêm vào CUỐI mảng ⇒ "mới lưu nhất" là mảng đảo ngược.
    if (sortBy === 'added') return list.reverse();
    if (sortBy === 'price-asc') return list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return list.sort((a, b) => b.price - a.price);
    if (sortBy === 'rating') return list.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'discount') return list.sort((a, b) => b.discount - a.discount);
    return list;
  }, [filtered, sortBy]);

  /* ── Lựa chọn: luôn dẫn xuất từ wishlist nên không bao giờ "đếm ma" ── */
  const selectedProducts = useMemo(
    () => wishlist.filter((p) => selected.has(p.id)),
    [wishlist, selected],
  );
  const selectedCount = selectedProducts.length;
  const allViewSelected = view.length > 0 && view.every((p) => selected.has(p.id));

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const every = view.length > 0 && view.every((p) => next.has(p.id));
      view.forEach((p) => (every ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  }, [view]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  /* ── Thêm hàng loạt: KHÔNG mở drawer từng lần, một toast duy nhất ──── */
  const addMany = useCallback((items) => {
    if (!items.length) return;
    items.forEach((p) => addToCart(p, 1, undefined, undefined, { openDrawer: false }));
    openCart();
    showToast(`Đã thêm ${items.length} sản phẩm vào giỏ hàng`, 'bi-bag-check');
  }, [addToCart, openCart, showToast]);

  const addAllToCart = useCallback(() => addMany(wishlist), [addMany, wishlist]);

  const addSelectedToCart = useCallback(() => {
    const items = selectedProducts;
    if (!items.length) return;
    addMany(items);
    exitSelectMode();
  }, [addMany, selectedProducts, exitSelectMode]);

  /* ── Xoá hàng loạt: toggleWishlist im lặng + một toast tổng kết ────── */
  const removeSelected = useCallback(() => {
    const items = selectedProducts;
    setConfirmRemove(false);
    if (!items.length) return;
    items.forEach((p) => toggleWishlist(p, { silent: true }));
    exitSelectMode();
    showToast(`Đã bỏ ${items.length} sản phẩm khỏi danh sách yêu thích`, 'bi-heart');
  }, [selectedProducts, toggleWishlist, exitSelectMode, showToast]);

  /* Bỏ một sản phẩm: dọn luôn id khỏi tập đang chọn để bộ đếm không lệch. */
  const removeOne = useCallback((product) => {
    toggleWishlist(product);
    setSelected((prev) => {
      if (!prev.has(product.id)) return prev;
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
  }, [toggleWishlist]);

  /* ── Chia sẻ: mọi nhánh đều xử lý lỗi, không báo thành công giả ────── */
  const shareWishlist = useCallback(async () => {
    const text = `Danh sách yêu thích của tôi tại LYRA:\n${
      wishlist.map((p) => `• ${p.name} — ${fmt(p.price)}`).join('\n')}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'LYRA — Danh sách yêu thích', text });
      } catch {
        /* người dùng đóng hộp chia sẻ — không báo gì */
      }
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      showToast('Trình duyệt không hỗ trợ sao chép tự động', 'bi-exclamation-circle');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('Đã sao chép danh sách yêu thích', 'bi-clipboard-check');
    } catch {
      showToast('Không thể sao chép, vui lòng thử lại', 'bi-x-circle');
    }
  }, [wishlist, showToast]);

  /* ── Gợi ý: dựa trên sản phẩm vừa lưu, loại bỏ thứ đã có ───────────── */
  const suggestions = useMemo(() => {
    const saved = new Set(wishlist.map((p) => p.id));
    const seed = wishlist.length ? wishlist[wishlist.length - 1] : null;
    const pool = seed
      ? relatedProducts(seed, 12)
      : [...PRODUCTS].sort((a, b) => b.sold - a.sold);
    return pool.filter((p) => !saved.has(p.id)).slice(0, 4);
  }, [wishlist]);

  const isEmpty = wishlist.length === 0;

  return (
    <div className="wishlist-page">
      {/* ══ Mở đầu ══ */}
      <section className="wishlist-hero">
        <div className="wrap">
          <div className="wishlist-hero-inner" data-reveal>
            <div className="wishlist-hero-copy">
              <div className="eyebrow">Bộ sưu tập cá nhân</div>
              <h1 className="t-h1">
                Danh sách
                <br />
                <em>yêu thích</em>
              </h1>
              <p className="wishlist-lead">
                {isEmpty
                  ? 'Nơi giữ lại những thiết kế bạn muốn ngắm thêm một lần nữa trước khi quyết định. Danh sách được lưu ngay trên thiết bị này.'
                  : 'Những thiết kế bạn đã chọn giữ lại cho mùa Thu – Đông 2026. Thêm vào giỏ khi bạn sẵn sàng, hoặc chia sẻ danh sách cho người thân.'}
              </p>
            </div>

            {!isEmpty && (
              <div className="wishlist-hero-side">
                <dl className="wishlist-stats">
                  <div className="wishlist-stat">
                    <dt>Sản phẩm đã lưu</dt>
                    <dd>{wishlist.length}</dd>
                  </div>
                  <div className="wishlist-stat">
                    <dt>Tổng giá trị</dt>
                    <dd>{fmt(totalValue)}</dd>
                  </div>
                  {totalSaving > 0 && (
                    <div className="wishlist-stat">
                      <dt>Đang tiết kiệm</dt>
                      <dd className="is-warm">{fmt(totalSaving)}</dd>
                    </div>
                  )}
                </dl>

                <div className="wishlist-hero-actions">
                  <button type="button" className="btn-lyra btn-sm" onClick={addAllToCart}>
                    <i className="bi bi-bag-plus" aria-hidden="true" />
                    Thêm tất cả vào giỏ
                  </button>
                  <button
                    type="button"
                    className={`btn-outline-lyra btn-sm${selectMode ? ' is-on' : ''}`}
                    onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
                    aria-pressed={selectMode}
                  >
                    <i className={`bi ${selectMode ? 'bi-x-lg' : 'bi-check2-square'}`} aria-hidden="true" />
                    {selectMode ? 'Thoát chọn nhiều' : 'Chọn nhiều'}
                  </button>
                  <button type="button" className="btn-outline-lyra btn-sm" onClick={shareWishlist}>
                    <i className="bi bi-share" aria-hidden="true" />
                    Chia sẻ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ Nội dung ══ */}
      <section className="wishlist-body">
        <div className="wrap">
          {isEmpty ? (
            <EmptyState
              icon="bi-heart"
              title="Danh sách còn trống"
              sub="Chạm vào biểu tượng trái tim trên mỗi sản phẩm để giữ lại thiết kế bạn thích. Chúng tôi sẽ nhớ giúp bạn."
              action={{ label: 'Khám phá bộ sưu tập', onClick: () => navigate('shop') }}
            >
              <button type="button" className="btn-outline-lyra" onClick={() => navigate('new')}>
                Hàng mới về
              </button>
            </EmptyState>
          ) : (
            <>
              {/* Thanh công cụ */}
              <div className="wishlist-toolbar">
                <div className="chip-row wishlist-cats">
                  <button
                    type="button"
                    className={`chip${catFilter === 'all' ? ' active' : ''}`}
                    onClick={() => setCatFilter('all')}
                    aria-pressed={catFilter === 'all'}
                  >
                    Tất cả <span className="wishlist-chip-num">{wishlist.length}</span>
                  </button>
                  {catTabs.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className={`chip${catFilter === c.name ? ' active' : ''}`}
                      onClick={() => setCatFilter(c.name)}
                      aria-pressed={catFilter === c.name}
                    >
                      {c.name} <span className="wishlist-chip-num">{c.count}</span>
                    </button>
                  ))}
                </div>

                <div className="wishlist-sort">
                  <label className="sr-only" htmlFor="wishlist-sort">Sắp xếp danh sách</label>
                  <select
                    id="wishlist-sort"
                    className="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    {SORTS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Thanh thao tác hàng loạt */}
              {selectMode && (
                <div className="wishlist-selectbar" role="group" aria-label="Thao tác với sản phẩm đã chọn">
                  <span className="wishlist-selectbar-count">
                    {selectedCount > 0
                      ? `Đã chọn ${selectedCount} sản phẩm`
                      : 'Chưa chọn sản phẩm nào'}
                  </span>
                  <div className="wishlist-selectbar-actions">
                    <button type="button" className="btn-outline-lyra btn-sm" onClick={toggleSelectAll}>
                      {allViewSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                    <button
                      type="button"
                      className="btn-lyra btn-sm"
                      onClick={addSelectedToCart}
                      disabled={selectedCount === 0}
                    >
                      <i className="bi bi-bag-plus" aria-hidden="true" />
                      Thêm vào giỏ
                    </button>
                    <button
                      type="button"
                      className="btn-outline-lyra btn-sm wishlist-danger-btn"
                      onClick={() => setConfirmRemove(true)}
                      disabled={selectedCount === 0}
                    >
                      <i className="bi bi-trash3" aria-hidden="true" />
                      Bỏ khỏi danh sách
                    </button>
                  </div>
                </div>
              )}

              <p className="wishlist-count" aria-live="polite">
                {catFilter === 'all'
                  ? `${view.length} sản phẩm trong danh sách`
                  : `${view.length} sản phẩm — ${catFilter}`}
              </p>

              {/* Lưới */}
              {view.length === 0 ? (
                <EmptyState
                  icon="bi-funnel"
                  title="Không có sản phẩm trong danh mục này"
                  sub="Hãy chọn một danh mục khác để xem tiếp danh sách của bạn."
                  action={{ label: 'Xem tất cả', onClick: () => setCatFilter('all') }}
                />
              ) : (
                <div className="products-grid wishlist-grid">
                  {view.map((p, i) => (
                    <WishlistCard
                      key={p.id}
                      product={p}
                      index={i}
                      selectMode={selectMode}
                      isSelected={selected.has(p.id)}
                      onToggleSelect={() => toggleSelect(p.id)}
                      onRemove={() => removeOne(p)}
                      onAdd={() => addToCart(p, 1)}
                      onOpen={() => navigate('detail', { product: p })}
                    />
                  ))}
                </div>
              )}

              {/* Tổng kết */}
              <div className="wishlist-summary">
                <div className="wishlist-summary-figures">
                  <div className="wishlist-summary-label">Tổng giá trị danh sách</div>
                  <div className="wishlist-summary-value">{fmt(totalValue)}</div>
                  {totalSaving > 0 && (
                    <div className="wishlist-summary-note">
                      Tiết kiệm {fmt(totalSaving)} so với giá gốc
                    </div>
                  )}
                </div>
                <div className="wishlist-summary-actions">
                  <button type="button" className="btn-outline-lyra" onClick={() => navigate('shop')}>
                    Tiếp tục mua sắm
                  </button>
                  <button type="button" className="btn-lyra" onClick={addAllToCart}>
                    <i className="bi bi-bag-plus" aria-hidden="true" />
                    Thêm tất cả ({wishlist.length}) vào giỏ
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Gợi ý */}
          {suggestions.length > 0 && (
            <div className="wishlist-suggest">
              <SectionHeader
                eyebrow={isEmpty ? 'Được yêu thích nhất' : 'Có thể bạn cũng thích'}
                title={isEmpty ? (<>Bắt đầu từ <em>đây</em></>) : (<>Hợp gu <em>của bạn</em></>)}
                link={{ label: 'Xem tất cả sản phẩm', page: 'shop' }}
              />
              <div className="products-grid">
                {suggestions.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Xác nhận bỏ khỏi danh sách */}
      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Bỏ khỏi danh sách yêu thích?"
        size="sm"
        footer={(
          <>
            <button type="button" className="btn-outline-lyra" onClick={() => setConfirmRemove(false)}>
              Giữ lại
            </button>
            <button type="button" className="btn-lyra" onClick={removeSelected}>
              Bỏ {selectedCount} sản phẩm
            </button>
          </>
        )}
      >
        <p className="wishlist-modal-text">
          {selectedCount} sản phẩm sẽ được gỡ khỏi danh sách yêu thích. Bạn vẫn có thể lưu lại
          bất cứ lúc nào từ trang sản phẩm.
        </p>
      </Modal>

      <Footer />
    </div>
  );
}

/* ══════════════════════════════════════════════
   Thẻ sản phẩm trong danh sách yêu thích
   ══════════════════════════════════════════════ */
function WishlistCard({
  product: p,
  index = 0,
  selectMode,
  isSelected,
  onToggleSelect,
  onRemove,
  onAdd,
  onOpen,
}) {
  const href = buildUrl('detail', { product: p.slug || p.id });
  const images = Array.isArray(p.images) ? p.images : [];

  // Ctrl/Cmd-click vẫn mở tab mới; click thường điều hướng trong SPA.
  const open = (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    onOpen();
  };

  return (
    <article
      className={`wishlist-card${isSelected ? ' is-selected' : ''}`}
      data-reveal
      style={{ '--i': index % 8 }}
    >
      <div className="wishlist-card-media">
        {/* Ảnh là liên kết thật nhưng không tạo thêm điểm dừng Tab —
            tên sản phẩm bên dưới đã là liên kết có nhãn rõ ràng. */}
        <a className="wishlist-card-link" href={href} onClick={open} tabIndex={-1} aria-hidden="true">
          <Pic
            src={images[0]}
            alt={p.name}
            tint={p.color}
            icon={p.icon}
            ratio="3/4"
            sizes="(max-width: 900px) 50vw, 25vw"
          />
          {images[1] && (
            <Pic src={images[1]} alt="" tint={p.color} icon={p.icon} ratio="3/4" className="pic--hover" />
          )}
        </a>

        {selectMode && (
          <input
            type="checkbox"
            className="wishlist-check"
            checked={isSelected}
            onChange={onToggleSelect}
            aria-label={`Chọn ${p.name}`}
          />
        )}

        <button
          type="button"
          className="wishlist-remove"
          onClick={onRemove}
          aria-label={`Bỏ ${p.name} khỏi danh sách yêu thích`}
        >
          <i className="bi bi-heart-fill" aria-hidden="true" />
        </button>

        {p.badge && (
          <span className={`wishlist-badge${p.badge === 'Sale' ? ' is-sale' : ''}`}>{p.badge}</span>
        )}
      </div>

      <div className="wishlist-card-body">
        <Stars rating={p.rating} size={10} />
        <a className="wishlist-name" href={href} onClick={open}>{p.name}</a>
        <div className="wishlist-meta">{p.brand} · {p.cat}</div>

        <div className="wishlist-price-row">
          <span className="wishlist-price">{fmt(p.price)}</span>
          {p.oldPrice > p.price && (
            <>
              <span className="wishlist-price-old">{fmt(p.oldPrice)}</span>
              <span className="wishlist-off">−{p.discount}%</span>
            </>
          )}
        </div>

        {p.stock <= 5 && (
          <div className="wishlist-stock">Chỉ còn {p.stock} sản phẩm</div>
        )}

        <button type="button" className="btn-lyra btn-sm wishlist-add" onClick={onAdd}>
          <i className="bi bi-bag-plus" aria-hidden="true" />
          Thêm giỏ
        </button>
      </div>
    </article>
  );
}

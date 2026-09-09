// src/pages/SalePage.jsx — Trang khuyến mãi của LYRA.
// Mọi con số quảng cáo đều tính từ dữ liệu thật trong src/data/products.js.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, CATEGORIES, COUPONS, FREE_SHIPPING_THRESHOLD, fmt, img } from '../data/products';
import { ProductCard, Pic, EmptyState, Footer, Reveal, isModifiedClick } from '../components/index.jsx';
import { buildUrl } from '../router.js';
import '../styles/sale.css';

/* ══════════════════════════════════════════════════════════
   DỮ LIỆU DẪN XUẤT — tính một lần ở tầng module, thuần tuý
   ══════════════════════════════════════════════════════════ */

/** Sản phẩm đang giảm giá thật sự (có giá cũ cao hơn giá bán). */
const SALE_PRODUCTS = PRODUCTS.filter((p) => p.oldPrice > p.price && p.discount > 0);

/** Ngưỡng "giảm sâu nhất". */
const FLASH_THRESHOLD = 28;
const FLASH_PRODUCTS = SALE_PRODUCTS.filter((p) => p.discount >= FLASH_THRESHOLD);

/** Mức giảm cao nhất có thật trong dữ liệu (hiện tại: 32%). */
const MAX_DISCOUNT = SALE_PRODUCTS.length
  ? Math.max(...SALE_PRODUCTS.map((p) => p.discount))
  : 0;

/** Tổng số tiền khách tiết kiệm được nếu mua trọn bộ sản phẩm sale. */
const TOTAL_SAVING = SALE_PRODUCTS.reduce((sum, p) => sum + (p.oldPrice - p.price), 0);

/** Tab danh mục — chỉ dựng từ danh mục THỰC SỰ có hàng giảm giá. */
const SALE_TABS = [
  { id: 'all', name: null, label: 'Tất cả', count: SALE_PRODUCTS.length },
  ...CATEGORIES.map((c) => ({
    id: c.slug,
    name: c.name,
    label: c.name,
    count: SALE_PRODUCTS.filter((p) => p.cat === c.name).length,
  })).filter((t) => t.count > 0),
];

/** Mã giảm giá gợi ý — lấy đúng từ bảng COUPONS. */
const COUPON_CODES = ['LYRA10', 'SAVE100K', 'FREESHIP'].filter((code) => COUPONS[code]);

const HERO_IMAGE = img('1481437156560-3205f6a55735', 1600);

const SORT_OPTIONS = [
  { id: 'discount', label: 'Giảm nhiều nhất' },
  { id: 'saving', label: 'Tiết kiệm nhiều nhất' },
  { id: 'price-asc', label: 'Giá: thấp đến cao' },
  { id: 'price-desc', label: 'Giá: cao đến thấp' },
  { id: 'popular', label: 'Bán chạy nhất' },
];

const STRIP_ITEMS = [
  { icon: 'bi-truck', text: `Miễn phí giao hàng cho đơn từ ${fmt(FREE_SHIPPING_THRESHOLD)}` },
  { icon: 'bi-arrow-repeat', text: 'Đổi trả trong 30 ngày' },
  { icon: 'bi-patch-check', text: 'Hàng chính hãng LYRA 100%' },
];

/* ══════════════════════════════════════════════════════════
   ĐẾM NGƯỢC
   ══════════════════════════════════════════════════════════ */

/**
 * Hạn kết thúc đợt ưu đãi: Chủ nhật gần nhất, 23:59:59 giờ địa phương.
 * Là một mốc CỐ ĐỊNH trong tuần — tải lại trang không làm đồng hồ chạy lại từ đầu.
 */
function computeSaleEnd() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7)); // 0 = Chủ nhật
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

const pad2 = (n) => String(n).padStart(2, '0');

/** "23:59 ngày 06/09/2026" */
function formatDeadline(ts) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} ngày ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Đếm ngược tới mốc `target` (timestamp). Trả về ngày/giờ/phút/giây ĐÚNG, chạm 0 thì dừng. */
function useCountdown(target) {
  const [remain, setRemain] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const left = Math.max(0, target - Date.now());
    setRemain(left);
    if (left <= 0) return undefined; // đã kết thúc: không cần đếm nữa
    const id = setInterval(() => {
      const next = Math.max(0, target - Date.now());
      setRemain(next);
      // Chạm 0 thì dừng hẳn, tránh chạy interval vô hạn suốt phiên làm việc.
      if (next <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  return useMemo(
    () => ({
      d: Math.floor(remain / 86400000),
      h: Math.floor((remain % 86400000) / 3600000),
      m: Math.floor((remain % 3600000) / 60000),
      s: Math.floor((remain % 60000) / 1000),
      ended: remain <= 0,
    }),
    [remain]
  );
}


/** Khối đếm ngược tách riêng: cô lập việc vẽ lại mỗi giây khỏi phần còn lại của trang. */
function SaleCountdown({ target, deadlineText }) {
  const countdown = useCountdown(target);
  const cells = [
    { value: countdown.d, unit: 'Ngày' },
    { value: countdown.h, unit: 'Giờ' },
    { value: countdown.m, unit: 'Phút' },
    { value: countdown.s, unit: 'Giây' },
  ];

  return (
    <div className="sale-countdown">
      <p className="sale-countdown-label">
        {countdown.ended ? 'Trạng thái' : 'Kết thúc sau'}
      </p>

      {countdown.ended ? (
        <p className="sale-countdown-ended">
          Đã kết thúc. Cảm ơn bạn đã đồng hành — hẹn gặp lại ở đợt ưu đãi tiếp theo.
        </p>
      ) : (
        <>
          <ul className="sale-countdown-row" aria-hidden="true">
            {cells.map(({ value, unit }) => (
              <li className="sale-countdown-cell" key={unit}>
                <span className="sale-countdown-val">{pad2(value)}</span>
                <span className="sale-countdown-unit">{unit}</span>
              </li>
            ))}
          </ul>
          {/* Trình đọc màn hình nhận mốc thời gian tĩnh, không bị đọc lại mỗi giây */}
          <p className="sr-only">Chương trình kết thúc lúc {deadlineText}.</p>
          <p className="sale-countdown-note">Kết thúc lúc {deadlineText}</p>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SAO CHÉP MÃ — có đường lui khi Clipboard API bị chặn
   ══════════════════════════════════════════════════════════ */
function legacyCopy(text) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/* ══════════════════════════════════════════════════════════
   TRANG
   ══════════════════════════════════════════════════════════ */
export default function SalePage() {
  const { navigate } = useApp();
  const { showToast, applyCoupon } = useCart();

  // Mốc kết thúc tính MỘT LẦN cho suốt vòng đời trang.
  const saleEnd = useMemo(() => computeSaleEnd(), []);
  const deadlineText = useMemo(() => formatDeadline(saleEnd), [saleEnd]);

  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('discount');
  const [copied, setCopied] = useState('');

  // Nhãn "Đã sao chép" tự trở lại sau 2 giây.
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(''), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const filtered = useMemo(() => {
    const tab = SALE_TABS.find((t) => t.id === activeTab);
    const list = tab && tab.name ? SALE_PRODUCTS.filter((p) => p.cat === tab.name) : [...SALE_PRODUCTS];
    switch (sortBy) {
      case 'saving':
        return list.sort((a, b) => (b.oldPrice - b.price) - (a.oldPrice - a.price));
      case 'price-asc':
        return list.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return list.sort((a, b) => b.price - a.price);
      case 'popular':
        return list.sort((a, b) => b.sold - a.sold);
      case 'discount':
      default:
        return list.sort((a, b) => b.discount - a.discount);
    }
  }, [activeTab, sortBy]);

  const copyCode = useCallback(
    async (code) => {
      let ok = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code);
          ok = true;
        }
      } catch {
        ok = false;
      }
      if (!ok) ok = legacyCopy(code);
      if (ok) {
        setCopied(code);
        showToast(`Đã sao chép mã ${code}`, 'bi-clipboard-check');
      } else {
        showToast(`Không sao chép được. Mã của bạn là ${code}.`, 'bi-exclamation-circle');
      }
    },
    [showToast]
  );


  return (
    <div className="sale-page">
      {/* ═══════════ HERO ═══════════ */}
      <section className="sale-hero" aria-labelledby="sale-hero-title">
        <Pic
          className="sale-hero-media"
          src={HERO_IMAGE}
          alt="Không gian cửa hàng LYRA trong đợt ưu đãi cuối mùa"
          ratio="auto"
          tint="#17150F"
          icon="bi-tags"
          eager
          sizes="100vw"
        />
        <span className="sale-hero-veil" aria-hidden="true" />

        <div className="wrap sale-hero-inner">
          <p className="eyebrow on-ink">Ưu đãi cuối mùa · Thu – Đông 2026</p>

          <h1 className="t-h1 sale-hero-title" id="sale-hero-title">
            Giảm giá
            <br />
            cuối <em>mùa</em>
          </h1>

          <p className="sale-hero-lead">
            {SALE_PRODUCTS.length} thiết kế được tuyển chọn từ bộ sưu tập Thu – Đông, giảm đến{' '}
            <strong>{MAX_DISCOUNT}%</strong>. Mỗi mẫu chỉ còn số lượng nhỏ — hết size là dừng.
          </p>

          {/* Đếm ngược — component riêng để mỗi giây chỉ vẽ lại khối này */}
          <SaleCountdown target={saleEnd} deadlineText={deadlineText} />

          {/* Số liệu — tính từ dữ liệu thật */}
          <ul className="sale-hero-stats">
            <li className="sale-stat">
              <span className="sale-stat-num">{SALE_PRODUCTS.length}</span>
              <span className="sale-stat-label">Thiết kế đang giảm giá</span>
            </li>
            <li className="sale-stat">
              <span className="sale-stat-num">{MAX_DISCOUNT}%</span>
              <span className="sale-stat-label">Mức giảm sâu nhất</span>
            </li>
            <li className="sale-stat">
              <span className="sale-stat-num">{fmt(TOTAL_SAVING)}</span>
              <span className="sale-stat-label">Tổng mức tiết kiệm</span>
            </li>
            <li className="sale-stat">
              <span className="sale-stat-num">Từ {fmt(FREE_SHIPPING_THRESHOLD)}</span>
              <span className="sale-stat-label">Miễn phí giao hàng</span>
            </li>
          </ul>

          {FLASH_PRODUCTS.length > 0 && (
            <div className="sale-hero-picks">
              {FLASH_PRODUCTS.slice(0, 3).map((p) => (
                <a
                  key={p.id}
                  className="sale-hero-pick"
                  href={buildUrl('detail', { product: p.slug })}
                  onClick={(e) => {
                    if (isModifiedClick(e)) return;
                    e.preventDefault();
                    navigate('detail', { product: p.slug });
                  }}
                >
                  <Pic
                    as="span"
                    src={p.images?.[0]}
                    alt={p.name}
                    ratio="3/4"
                    tint={p.color}
                    icon={p.icon}
                    sizes="120px"
                  />
                  <span className="sale-hero-pick-off">−{p.discount}%</span>
                  <span className="sale-hero-pick-name">{p.name}</span>
                  <span className="sale-hero-pick-price">{fmt(p.price)}</span>
                </a>
              ))}
            </div>
          )}

          <div className="sale-hero-actions">
            <a className="btn-warm" href="#tat-ca-uu-dai">
              Xem tất cả ưu đãi
            </a>
            <a
              className="link-underline sale-hero-link"
              href={buildUrl('shop', {})}
              onClick={(e) => {
                if (isModifiedClick(e)) return;
                e.preventDefault();
                navigate('shop');
              }}
            >
              Xem toàn bộ bộ sưu tập
            </a>
          </div>
        </div>

        <div className="sale-strip grain sale-hero-strip">
          <div className="wrap">
            <ul className="sale-strip-list">
              {STRIP_ITEMS.map((s) => (
                <li key={s.text}>
                  <i className={`bi ${s.icon}`} aria-hidden="true" />
                  {s.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════ GIẢM SÂU NHẤT ═══════════ */}
      {FLASH_PRODUCTS.length > 0 && (
        <section className="section sale-flash" aria-labelledby="sale-flash-title">
          <div className="wrap">
            <div className="section-header">
              <div className="section-header-text">
                <p className="eyebrow">Giảm sâu nhất</p>
                <h2 className="section-title" id="sale-flash-title">
                  Những mức giảm
                  <br />
                  <em>đậm</em> nhất mùa
                </h2>
                <p className="section-sub">
                  {FLASH_PRODUCTS.length} thiết kế giảm từ {FLASH_THRESHOLD}% trở lên. Số lượng cuối cùng của mùa.
                </p>
              </div>
            </div>

            <div className="flash-sale-grid">
              {FLASH_PRODUCTS.map((p, i) => (
                <div className="flash-sale-item" key={p.id}>
                  <p className="sale-ribbon">
                    <span className="sale-ribbon-pct">−{p.discount}%</span>
                    <span className="sale-ribbon-note">Tiết kiệm {fmt(p.oldPrice - p.price)}</span>
                  </p>
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ TẤT CẢ ƯU ĐÃI ═══════════ */}
      <section className="section sale-all" id="tat-ca-uu-dai" aria-labelledby="sale-all-title">
        <div className="wrap">
          <div className="section-header">
            <div className="section-header-text">
              <p className="eyebrow">Danh mục ưu đãi</p>
              <h2 className="section-title" id="sale-all-title">
                Tất cả <em>ưu đãi</em>
              </h2>
              <p className="section-sub">
                {filtered.length} thiết kế đang giảm giá
                {activeTab !== 'all' ? ` trong ${SALE_TABS.find((t) => t.id === activeTab)?.label}` : ''}.
              </p>
            </div>
          </div>

          <div className="sale-toolbar">
            <div className="sale-tabs" role="group" aria-label="Lọc ưu đãi theo danh mục">
              {SALE_TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  className="sale-tab"
                  aria-pressed={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  <span className="sale-tab-count">{tab.count}</span>
                </button>
              ))}
            </div>

            <div className="sale-sort">
              <label className="sr-only" htmlFor="sale-sort-select">
                Sắp xếp sản phẩm
              </label>
              <select
                id="sale-sort-select"
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option value={o.id} key={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="products-grid">
              {filtered.map((p, i) => (
                <ProductCard product={p} key={p.id} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon="bi-tag"
              title="Chưa có ưu đãi trong danh mục này"
              sub="Hãy xem toàn bộ danh sách giảm giá hoặc ghé cửa hàng để tìm thiết kế phù hợp."
              action={{ label: 'Xem tất cả ưu đãi', onClick: () => setActiveTab('all') }}
            />
          )}
        </div>
      </section>

      {/* ═══════════ MÃ GIẢM THÊM ═══════════ */}
      <section className="sale-coupons" aria-labelledby="sale-coupon-title">
        <div className="wrap">
          <Reveal className="sale-coupon-panel">
            <div className="sale-coupon-intro">
              <p className="eyebrow">Giảm thêm khi thanh toán</p>
              <h2 className="section-title" id="sale-coupon-title">
                Mã ưu đãi <em>dành riêng</em>
              </h2>
              <p className="section-sub">
                Ưu đãi cộng dồn với giá đã giảm. Sao chép mã hoặc áp dụng ngay cho giỏ hàng hiện tại của bạn.
              </p>
            </div>

            <ul className="sale-coupon-list">
              {COUPON_CODES.map((code) => {
                const c = COUPONS[code];
                return (
                  <li className="sale-coupon" key={code}>
                    <span className="sale-coupon-code">{code}</span>
                    <span className="sale-coupon-label">{c.label}</span>
                    <span className="sale-coupon-min">
                      {c.min > 0 ? `Áp dụng cho đơn từ ${fmt(c.min)}` : 'Không yêu cầu giá trị tối thiểu'}
                    </span>
                    <div className="sale-coupon-actions">
                      <button
                        type="button"
                        className="btn-outline-lyra btn-sm"
                        onClick={() => copyCode(code)}
                        aria-label={`Sao chép mã ${code}`}
                      >
                        <i
                          className={`bi ${copied === code ? 'bi-clipboard-check' : 'bi-clipboard'}`}
                          aria-hidden="true"
                        />
                        {copied === code ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                      <button
                        type="button"
                        className="btn-lyra btn-sm"
                        onClick={() => applyCoupon(code)}
                        aria-label={`Áp dụng mã ${code} cho giỏ hàng`}
                      >
                        Áp dụng
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

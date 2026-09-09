// src/pages/NewArrivalsPage.jsx — trang "Mới về" của LYRA.
// Hợp đồng: spec.md §4/§5 + pages.md (NewArrivalsPage). Chỉ dùng API context/component đã có.
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, fmt, img, slugify } from '../data/products';
import { useCatalog } from '../context/CatalogContext';
import { buildUrl } from '../router.js';
import { isEmail } from '../utils/validate.js';
import {
  CatalogEmpty,
  ProductCard,
  Footer,
  Pic,
  Reveal,
  EmptyState,
  isModifiedClick,
} from '../components/index.jsx';
import '../styles/new.css';

/* ------------------------------------------------------------------ */
/* Dữ liệu dẫn xuất — tính MỘT LẦN ở tầng module, không nằm trong render */
/* ------------------------------------------------------------------ */

/** Mốc "hôm nay" (00:00) — tính một lần khi nạp module, không gọi trong render. */
const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

/** Số ngày từ `createdAt` (chuỗi 'YYYY-MM-DD') tới hôm nay. */
function daysAgo(iso) {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return Number.MAX_SAFE_INTEGER;
  return Math.floor((TODAY.getTime() - d.getTime()) / 86400000);
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. */
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(iso);
}

const byNewest = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

/**
 * Danh sách hàng mới: ưu tiên sản phẩm gắn badge "New";
 * nếu chưa đủ 6 thì bổ sung bằng những thiết kế có `createdAt` mới nhất.
 */
function arrivalsFrom(products) {
  const list = products || [];
  const flagged = list.filter((p) => p.badge === 'New');
  if (flagged.length >= 6) return [...flagged].sort(byNewest);
  const chosen = new Set(flagged.map((p) => p.id));
  const fillers = [...list]
    .filter((p) => !chosen.has(p.id))
    .sort(byNewest)
    .slice(0, 6 - flagged.length);
  return [...flagged, ...fillers].sort(byNewest);
}

const CAT_SHORT = {
  'Thời trang nữ': 'Nữ',
  'Thời trang nam': 'Nam',
  'Giày dép': 'Giày dép',
  'Phụ kiện': 'Phụ kiện',
};

/** Ba nhóm thời gian theo `createdAt` thật. */
const GROUP_DEFS = [
  { id: 'this', label: 'Tuần này', note: 'Vừa lên kệ trong 7 ngày', test: (d) => d <= 7 },
  { id: 'last', label: 'Tuần trước', note: 'Về kho 8 – 14 ngày trước', test: (d) => d > 7 && d <= 14 },
  { id: 'month', label: 'Trong tháng', note: 'Những thiết kế mới còn lại', test: (d) => d > 14 },
];

/**
 * Ảnh lookbook lấy THẲNG từ catalog LYRA (ảnh chính + màu của chính sản phẩm),
 * để hình ảnh luôn khớp với danh mục mà thẻ dẫn tới và không bao giờ trưng
 * logo của một thương hiệu khác dưới lời cam kết thủ công của LYRA.
 */
const lookOf = (name) => {
  const p = PRODUCTS.find((x) => x.name === name);
  return { image: p?.images?.[0], tint: p?.color };
};

/** Lookbook Thu – Đông 2026 — mỗi look trỏ tới một danh mục có thật. */
const LOOKBOOK = [
  {
    title: 'Tối giản & Sang trọng',
    sub: 'Lụa, blazer phom mềm cho ngày làm việc dài',
    cat: 'Thời trang nữ',
    image: img('1571513722275-4b41940f54b8', 900),
    tint: '#E4DAD0',
    icon: 'bi-bag-heart',
  },
  {
    title: 'Năng động & Trẻ trung',
    sub: 'Cotton, denim và những lớp mặc chồng nhẹ',
    cat: 'Thời trang nam',
    // Áo khoác denim trucker — đúng "denim" và "lớp mặc chồng" của phụ đề.
    ...lookOf('Áo khoác denim'),
    icon: 'bi-person',
  },
  {
    title: 'Bước chân mùa mới',
    sub: 'Da bê thật, đóng thủ công tại Bình Dương, form ôm chân người Việt',
    cat: 'Giày dép',
    // Mule da bê thật — có trong danh mục Giày dép, không nhãn hiệu ngoài.
    ...lookOf('Giày mule da thật'),
    icon: 'bi-bag',
  },
];

/* ------------------------------------------------------------------ */
/* Trang                                                               */
/* ------------------------------------------------------------------ */

export default function NewArrivalsPage() {
  const { navigate } = useApp();
  const { showToast } = useCart();
  const { products, empty: catalogEmpty } = useCatalog();
  const arrivals = useMemo(() => arrivalsFrom(products), [products]);
  const featured = arrivals[0] || null;
  const newCats = useMemo(() => Array.from(new Set(arrivals.map((p) => p.cat))), [arrivals]);

  const [activeCat, setActiveCat] = useState('all');
  const [email, setEmail] = useState('');
  const [notifyError, setNotifyError] = useState('');
  const [notifyDone, setNotifyDone] = useState(false);

  const filtered = useMemo(
    () => (activeCat === 'all' ? arrivals : arrivals.filter((p) => p.cat === activeCat)),
    [activeCat, arrivals],
  );

  /** Nhóm sản phẩm đã lọc theo mốc thời gian, bỏ nhóm rỗng. */
  const groups = useMemo(
    () =>
      GROUP_DEFS.map((g) => ({
        ...g,
        products: filtered.filter((p) => g.test(daysAgo(p.createdAt))),
      })).filter((g) => g.products.length > 0),
    [filtered],
  );

  const go = (e, page, params = {}) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate(page, params);
  };

  const submitNotify = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setNotifyDone(false);
      setNotifyError('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (!isEmail(value)) {
      setNotifyDone(false);
      setNotifyError('Địa chỉ email chưa hợp lệ. Ví dụ: ten@lyra.vn');
      return;
    }
    setNotifyError('');
    setNotifyDone(true);
    setEmail('');
    showToast?.('Đã đăng ký nhận thông báo hàng mới.', 'bi-bell');
  };

  const featuredHref = featured
    ? buildUrl('detail', { product: featured.slug || featured.id })
    : '#';

  return (
    <div className="new-page">
      {/* ══════════ HERO ══════════ */}
      <section className="new-hero section">
        <div className="wrap">
          <div className="new-hero-grid">
            <Reveal className="new-hero-copy">
              <p className="eyebrow">Cập nhật {formatDate(featured?.createdAt)}</p>
              <h1 className="t-h1">
                Mới về
                <br />
                <em>kho hàng</em>
              </h1>
              <p className="new-hero-lead">
                Những thiết kế vừa rời xưởng may Hà Nội của LYRA cho mùa Thu – Đông 2026. Số lượng
                mỗi mẫu có hạn, chúng tôi bổ sung kho hằng tuần.
              </p>

              <dl className="new-stats">
                <div className="new-stat">
                  <dt className="new-stat-label">Thiết kế mới về</dt>
                  <dd className="new-stat-value">{arrivals.length}</dd>
                </div>
                <div className="new-stat">
                  <dt className="new-stat-label">Danh mục</dt>
                  <dd className="new-stat-value">{newCats.length}</dd>
                </div>
                <div className="new-stat">
                  <dt className="new-stat-label">Lên kệ gần nhất</dt>
                  <dd className="new-stat-value">{formatDate(featured?.createdAt)}</dd>
                </div>
              </dl>

              <div className="new-hero-actions">
                <a
                  className="btn-lyra"
                  href="#hang-moi"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById('hang-moi')
                      ?.scrollIntoView({ block: 'start', behavior: 'auto' });
                  }}
                >
                  Xem tất cả hàng mới
                </a>
                <a
                  className="link-underline new-hero-link"
                  href={buildUrl('shop', {})}
                  onClick={(e) => go(e, 'shop')}
                >
                  Toàn bộ cửa hàng
                </a>
              </div>
            </Reveal>

            {featured && (
              <Reveal className="new-hero-feature" delay={1}>
                <a
                  className="new-feature-card"
                  href={featuredHref}
                  onClick={(e) => go(e, 'detail', { product: featured })}
                  aria-label={`Xem chi tiết ${featured.name}`}
                >
                  <Pic
                    as="span"
                    src={featured.images?.[0]}
                    alt={featured.name}
                    tint={featured.color}
                    icon={featured.icon}
                    ratio="3/4"
                    eager
                    sizes="(max-width: 900px) 100vw, 40vw"
                  />
                  <span className="new-feature-tag">Vừa lên kệ</span>
                  <span className="new-feature-info">
                    <span className="new-feature-name">{featured.name}</span>
                    <span className="new-feature-meta">
                      <span className="new-feature-cat">{featured.cat}</span>
                      <span className="new-feature-price price">{fmt(featured.price)}</span>
                    </span>
                  </span>
                </a>
              </Reveal>
            )}
          </div>
        </div>
      </section>

      {/* ══════════ LOOKBOOK ══════════ */}
      <section className="new-lookbook grain">
        <div className="wrap">
          <div className="new-lookbook-head">
            <p className="eyebrow on-ink">Phong cách tuần này</p>
            <h2 className="new-lookbook-title">
              Lookbook <em>2026</em>
            </h2>
            <p className="new-lookbook-sub">
              Ba hướng phối đồ cho mùa mới — bấm để xem những thiết kế thuộc từng nhóm.
            </p>
          </div>

          <div className="new-look-grid">
            {LOOKBOOK.map((look, i) => {
              const cat = slugify(look.cat);
              return (
                <Reveal key={look.title} delay={i} className="new-look-cell">
                  <a
                    className="new-look-card"
                    href={buildUrl('shop', { cat })}
                    onClick={(e) => go(e, 'shop', { cat })}
                    aria-label={`Lookbook ${look.title} — xem danh mục ${look.cat}`}
                  >
                    <Pic
                      as="span"
                      src={look.image}
                      alt={look.title}
                      tint={look.tint}
                      icon={look.icon}
                      ratio="4/5"
                      sizes="(max-width: 900px) 100vw, 33vw"
                      className="new-look-pic"
                    />
                    <span className="new-look-body">
                      <span className="new-look-title">{look.title}</span>
                      <span className="new-look-sub">{look.sub}</span>
                      <span className="new-look-cta">
                        Xem BST
                        <i className="bi bi-arrow-right" aria-hidden="true" />
                      </span>
                    </span>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════ DÒNG THỜI GIAN + BỘ LỌC ══════════ */}
      <section className="new-timeline section" id="hang-moi">
        <div className="wrap">
          <div className="new-timeline-head">
            <div className="new-timeline-heading">
              <p className="eyebrow">Theo thứ tự về kho</p>
              <h2 className="section-title">
                Theo <em>thời gian</em>
              </h2>
              <p className="new-timeline-sub">
                {filtered.length} thiết kế đang hiển thị
                {activeCat === 'all' ? '' : ` trong ${activeCat.toLowerCase()}`}.
              </p>
            </div>

            <div className="chip-row new-cat-filter" role="group" aria-label="Lọc theo danh mục">
              <button
                type="button"
                className={`chip${activeCat === 'all' ? ' active' : ''}`}
                aria-pressed={activeCat === 'all'}
                onClick={() => setActiveCat('all')}
              >
                Tất cả
                <span className="new-chip-count">{arrivals.length}</span>
              </button>
              {newCats.map((cat) => {
                const count = arrivals.filter((p) => p.cat === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`chip${activeCat === cat ? ' active' : ''}`}
                    aria-pressed={activeCat === cat}
                    onClick={() => setActiveCat(cat)}
                  >
                    {CAT_SHORT[cat] || cat}
                    <span className="new-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {catalogEmpty ? (
            <CatalogEmpty />
          ) : groups.length === 0 ? (
            <EmptyState
              icon="bi-calendar3"
              title="Chưa có hàng mới trong danh mục này"
              sub="Hãy xem toàn bộ những thiết kế vừa về kho của LYRA."
              action={{ label: 'Xem tất cả hàng mới', onClick: () => setActiveCat('all') }}
            />
          ) : (
            groups.map((group, gi) => (
              <div className="new-week" key={group.id}>
                <div className="new-week-head">
                  <span className={`new-week-tag${gi === 0 ? ' is-latest' : ''}`}>
                    {group.label}
                  </span>
                  <span className="new-week-note">{group.note}</span>
                  <span className="new-week-rule" aria-hidden="true" />
                  <span className="new-week-count">{group.products.length} sản phẩm</span>
                </div>

                <div className="products-grid">
                  {group.products.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ══════════ NHẬN THÔNG BÁO ══════════ */}
      <section className="new-notify-section">
        <div className="wrap">
          <Reveal className="new-notify">
            <div className="new-notify-copy">
              <p className="eyebrow">Không bỏ lỡ</p>
              <h2 className="new-notify-title">
                Nhận thông báo khi có <em>hàng mới</em>
              </h2>
              <p className="new-notify-sub">
                Đăng ký để biết trước ngày lên kệ của bộ sưu tập kế tiếp. Thành viên LYRA được ưu
                tiên đặt mua sớm 24 giờ.
              </p>
            </div>

            <form className="new-notify-form" onSubmit={submitNotify} noValidate>
              <label className="sr-only" htmlFor="new-notify-email">
                Địa chỉ email nhận thông báo hàng mới
              </label>
              <input
                id="new-notify-email"
                className="new-notify-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Email của bạn..."
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (notifyError) setNotifyError('');
                  if (notifyDone) setNotifyDone(false);
                }}
                aria-invalid={notifyError ? 'true' : undefined}
                aria-describedby="new-notify-msg"
              />
              <button type="submit" className="btn-lyra new-notify-btn">
                Đăng ký
              </button>

              <p className="new-notify-msg" id="new-notify-msg" role="status">
                {notifyError && (
                  <span className="field-error">
                    <i className="bi bi-exclamation-circle" aria-hidden="true" /> {notifyError}
                  </span>
                )}
                {!notifyError && notifyDone && (
                  <span className="new-notify-ok">
                    <i className="bi bi-check2" aria-hidden="true" /> Đã ghi nhận. Hẹn gặp bạn ở bộ
                    sưu tập kế tiếp.
                  </span>
                )}
                {!notifyError && !notifyDone && (
                  <span className="new-notify-hint">
                    Không spam. Có thể huỷ đăng ký bất kỳ lúc nào.
                  </span>
                )}
              </p>
            </form>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

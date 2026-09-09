// src/pages/ShopPage.jsx — Cửa hàng LYRA.
// Toàn bộ trạng thái lọc/sắp xếp/phân trang nằm trong URL (?cat=&sort=&color=…)
// nên khi mở một sản phẩm rồi quay lại, bộ lọc và trang vẫn còn nguyên.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PRODUCTS, CATEGORIES, fmt } from '../data/products';
import {
  EmptyState,
  Footer,
  ProductCard,
  Reveal,
  useBodyScrollLock,
  useDialogA11y,
} from '../components/index.jsx';
import { useApp } from '../context/AppContext';
import '../styles/shop.css';

/* ══════════════════════════════════════════════════════════════
   Hằng số dẫn xuất TỪ DỮ LIỆU THẬT (không có con số bịa)
   ══════════════════════════════════════════════════════════════ */

const ITEMS_PER_PAGE = 9;

const SORTS = [
  { id: 'newest', label: 'Mới nhất' },
  { id: 'popular', label: 'Bán chạy nhất' },
  { id: 'price-asc', label: 'Giá: thấp đến cao' },
  { id: 'price-desc', label: 'Giá: cao đến thấp' },
  { id: 'rating', label: 'Đánh giá cao nhất' },
];
const SORT_IDS = SORTS.map((s) => s.id);

const PRICE_RANGES = [
  { id: 'p1', label: 'Dưới 500K', min: '', max: '500000' },
  { id: 'p2', label: '500K – 1 triệu', min: '500000', max: '1000000' },
  { id: 'p3', label: '1 – 2 triệu', min: '1000000', max: '2000000' },
  { id: 'p4', label: 'Trên 2 triệu', min: '2000000', max: '' },
];

const RATING_STEPS = [4.5, 4, 3];

/** Bảng màu dựng từ chính `product.colors` — lọc màu là lọc THẬT. */
const COLOR_FACETS = (() => {
  const map = new Map();
  PRODUCTS.forEach((p) => {
    (Array.isArray(p.colors) ? p.colors : []).forEach((c) => {
      if (!c || !c.name) return;
      const found = map.get(c.name);
      if (found) found.count += 1;
      else map.set(c.name, { name: c.name, hex: c.hex, count: 1 });
    });
  });
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'),
  );
})();
const COLORS_COLLAPSED = 12;

const SALE_COUNT = PRODUCTS.filter((p) => p.discount > 0).length;
const STOCK_COUNT = PRODUCTS.filter((p) => p.stock > 0).length;
const MAX_DISCOUNT = PRODUCTS.reduce((m, p) => Math.max(m, p.discount || 0), 0);

/* ══════════════════════════════════════════════════════════════
   Tiện ích thuần
   ══════════════════════════════════════════════════════════════ */

const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');
/** 1000000 → "1.000.000" */
const groupThousands = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const catBySlug = (slug) => CATEGORIES.find((c) => c.slug === slug) || null;

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Dãy số trang có rút gọn khi nhiều trang. */
function pageList(total, current) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(total - 1, current + 1);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i += 1) out.push(i);
  if (to < total - 1) out.push('…');
  out.push(total);
  return out;
}

/* ══════════════════════════════════════════════════════════════
   Bộ lọc — dùng chung cho sidebar desktop và drawer mobile
   ══════════════════════════════════════════════════════════════ */

function Filters({ id, state, actions }) {
  const {
    catSlug, minPrice, maxPrice, color, minRating, onlySale, inStock,
  } = state;
  const { setParams } = actions;
  const [showAllColors, setShowAllColors] = useState(false);

  const colors = showAllColors ? COLOR_FACETS : COLOR_FACETS.slice(0, COLORS_COLLAPSED);
  const hiddenColors = COLOR_FACETS.length - COLORS_COLLAPSED;

  const activeRange = PRICE_RANGES.find((r) => r.min === minPrice && r.max === maxPrice);

  return (
    <div className="shop-filters">
      {/* ── Danh mục ─────────────────────────────────────────── */}
      <fieldset className="filter-group shop-fieldset">
        <legend className="filter-group-title">Danh mục</legend>
        <div className="filter-check-item">
          <input
            type="radio"
            id={`${id}-cat-all`}
            name={`${id}-category`}
            checked={catSlug === ''}
            onChange={() => setParams({ cat: undefined, page: undefined })}
          />
          <label htmlFor={`${id}-cat-all`}>Tất cả</label>
          <span className="filter-count">{PRODUCTS.length}</span>
        </div>
        {CATEGORIES.map((c, i) => (
          <div key={c.slug} className="filter-check-item">
            <input
              type="radio"
              id={`${id}-cat-${i}`}
              name={`${id}-category`}
              checked={catSlug === c.slug}
              onChange={() => setParams({ cat: c.slug, page: undefined })}
            />
            <label htmlFor={`${id}-cat-${i}`}>{c.name}</label>
            <span className="filter-count">{c.count}</span>
          </div>
        ))}
      </fieldset>

      {/* ── Khoảng giá ───────────────────────────────────────── */}
      <div className="filter-group">
        <div className="filter-group-title">Khoảng giá</div>
        <div className="chip-row shop-price-chips">
          {PRICE_RANGES.map((r) => {
            const active = activeRange?.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                className={`chip${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() =>
                  setParams(
                    active
                      ? { min: undefined, max: undefined, page: undefined }
                      : { min: r.min || undefined, max: r.max || undefined, page: undefined },
                  )
                }
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="price-inputs shop-price-inputs">
          <label className="sr-only" htmlFor={`${id}-min`}>Giá thấp nhất</label>
          <input
            id={`${id}-min`}
            className="price-input-field"
            inputMode="numeric"
            placeholder="Từ"
            value={minPrice ? groupThousands(minPrice) : ''}
            onChange={(e) =>
              setParams({ min: onlyDigits(e.target.value) || undefined, page: undefined })
            }
          />
          <span className="shop-price-dash" aria-hidden="true">–</span>
          <label className="sr-only" htmlFor={`${id}-max`}>Giá cao nhất</label>
          <input
            id={`${id}-max`}
            className="price-input-field"
            inputMode="numeric"
            placeholder="Đến"
            value={maxPrice ? groupThousands(maxPrice) : ''}
            onChange={(e) =>
              setParams({ max: onlyDigits(e.target.value) || undefined, page: undefined })
            }
          />
        </div>
      </div>

      {/* ── Màu sắc ──────────────────────────────────────────── */}
      <div className="filter-group">
        <div className="filter-group-title" id={`${id}-color-title`}>Màu sắc</div>
        <div className="color-swatches" role="group" aria-labelledby={`${id}-color-title`}>
          {colors.map((c) => {
            const active = color === c.name;
            return (
              <button
                key={c.name}
                type="button"
                className={`color-swatch${active ? ' active' : ''}`}
                style={{ background: c.hex }}
                aria-pressed={active}
                aria-label={`${c.name} — ${c.count} sản phẩm`}
                title={`${c.name} (${c.count})`}
                onClick={() =>
                  setParams({ color: active ? undefined : c.name, page: undefined })
                }
              />
            );
          })}
        </div>
        {hiddenColors > 0 && (
          <button
            type="button"
            className="shop-more-btn"
            onClick={() => setShowAllColors((v) => !v)}
          >
            {showAllColors ? 'Thu gọn bảng màu' : `Xem thêm ${hiddenColors} màu`}
          </button>
        )}
        {color && (
          <p className="shop-color-current">
            Đang lọc màu <strong>{color}</strong>
          </p>
        )}
      </div>

      {/* ── Đánh giá ─────────────────────────────────────────── */}
      <fieldset className="filter-group shop-fieldset">
        <legend className="filter-group-title">Đánh giá tối thiểu</legend>
        {RATING_STEPS.map((r, i) => {
          const text = `Từ ${String(r).replace('.', ',')} sao trở lên`;
          return (
            <div key={r} className="filter-check-item">
              <input
                type="radio"
                id={`${id}-rating-${i}`}
                name={`${id}-rating`}
                checked={minRating === r}
                onChange={() => setParams({ rating: String(r), page: undefined })}
                aria-label={text}
              />
              <label htmlFor={`${id}-rating-${i}`}>
                <span className="shop-rating-stars" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <i
                      key={s}
                      className={`bi ${s <= Math.floor(r) ? 'bi-star-fill' : s - 0.5 <= r ? 'bi-star-half' : 'bi-star'}`}
                    />
                  ))}
                </span>
                <span className="sr-only">{text}</span>
                <span className="shop-rating-text" aria-hidden="true">trở lên</span>
              </label>
            </div>
          );
        })}
        <div className="filter-check-item">
          <input
            type="radio"
            id={`${id}-rating-all`}
            name={`${id}-rating`}
            checked={minRating === 0}
            onChange={() => setParams({ rating: undefined, page: undefined })}
            aria-label="Tất cả mức đánh giá"
          />
          <label htmlFor={`${id}-rating-all`}>Tất cả</label>
        </div>
      </fieldset>

      {/* ── Khác ─────────────────────────────────────────────── */}
      <div className="filter-group">
        <div className="filter-group-title">Lọc nhanh</div>
        <div className="filter-check-item">
          <input
            type="checkbox"
            id={`${id}-sale`}
            checked={onlySale}
            onChange={(e) => setParams({ sale: e.target.checked ? '1' : undefined, page: undefined })}
          />
          <label htmlFor={`${id}-sale`}>Chỉ hàng đang giảm giá</label>
          <span className="filter-count">{SALE_COUNT}</span>
        </div>
        <div className="filter-check-item">
          <input
            type="checkbox"
            id={`${id}-stock`}
            checked={inStock}
            onChange={(e) => setParams({ stock: e.target.checked ? '1' : undefined, page: undefined })}
          />
          <label htmlFor={`${id}-stock`}>Còn hàng</label>
          <span className="filter-count">{STOCK_COUNT}</span>
        </div>
      </div>

      <p className="shop-filter-note">
        Mức giảm cao nhất tại LYRA mùa này là {MAX_DISCOUNT}%.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Trang Shop
   ══════════════════════════════════════════════════════════════ */

export default function ShopPage() {
  const { params, navigate } = useApp();

  /* ── Trạng thái đọc từ URL (nguồn duy nhất) ─────────────────── */
  const catSlug = catBySlug(params.cat) ? params.cat : '';
  const sort = SORT_IDS.includes(params.sort) ? params.sort : 'newest';
  const color = COLOR_FACETS.some((c) => c.name === params.color) ? params.color : '';
  const minPrice = onlyDigits(params.min);
  const maxPrice = onlyDigits(params.max);
  const ratingParam = Number(params.rating);
  const minRating = RATING_STEPS.includes(ratingParam) ? ratingParam : 0;
  const onlySale = params.sale === '1';
  const inStock = params.stock === '1';
  const listView = params.view === 'list';
  const pageParam = Math.max(1, Math.floor(Number(params.page)) || 1);

  /** Ghi trạng thái ngược lại URL — replace + keepScroll để không nhảy trang. */
  const setParams = useCallback(
    (patch) => {
      const next = { ...params, ...patch };
      Object.keys(next).forEach((k) => {
        if (next[k] === undefined || next[k] === null || next[k] === '') delete next[k];
      });
      navigate('shop', { ...next, replace: true, keepScroll: true });
    },
    [params, navigate],
  );

  const resetFilters = useCallback(() => {
    navigate('shop', { sort: sort === 'newest' ? undefined : sort, view: listView ? 'list' : undefined, replace: true, keepScroll: true });
  }, [navigate, sort, listView]);

  /* ── Lọc + sắp xếp ─────────────────────────────────────────── */
  const filtered = useMemo(() => {
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;

    let list = PRODUCTS.filter((p) => {
      if (catSlug && catBySlug(catSlug)?.name !== p.cat) return false;
      if (color && !(p.colors || []).some((c) => c.name === color)) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      if (minRating > 0 && p.rating < minRating) return false;
      if (onlySale && !(p.discount > 0)) return false;
      if (inStock && !(p.stock > 0)) return false;
      return true;
    });

    list = [...list];
    switch (sort) {
      case 'popular':
        list.sort((a, b) => b.sold - a.sold);
        break;
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
        break;
      default:
        // 'newest' — theo createdAt giảm dần, đúng với nhãn "Mới nhất".
        list.sort(
          (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id - a.id,
        );
    }
    return list;
  }, [catSlug, color, minPrice, maxPrice, minRating, onlySale, inStock, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const page = Math.min(pageParam, totalPages);
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  /* ── Chip "đang lọc" ───────────────────────────────────────── */
  const activeChips = useMemo(() => {
    const chips = [];
    const cat = catBySlug(catSlug);
    if (cat) chips.push({ key: 'cat', label: cat.name, clear: { cat: undefined } });
    if (color) chips.push({ key: 'color', label: `Màu ${color}`, clear: { color: undefined } });
    if (minPrice || maxPrice) {
      const label = minPrice && maxPrice
        ? `${fmt(Number(minPrice))} – ${fmt(Number(maxPrice))}`
        : minPrice
          ? `Từ ${fmt(Number(minPrice))}`
          : `Đến ${fmt(Number(maxPrice))}`;
      chips.push({ key: 'price', label, clear: { min: undefined, max: undefined } });
    }
    if (minRating) {
      chips.push({
        key: 'rating',
        label: `Từ ${String(minRating).replace('.', ',')} sao`,
        clear: { rating: undefined },
      });
    }
    if (onlySale) chips.push({ key: 'sale', label: 'Đang giảm giá', clear: { sale: undefined } });
    if (inStock) chips.push({ key: 'stock', label: 'Còn hàng', clear: { stock: undefined } });
    return chips;
  }, [catSlug, color, minPrice, maxPrice, minRating, onlySale, inStock]);

  const filterCount = activeChips.length;

  /* ── Drawer lọc trên mobile ────────────────────────────────── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerShown, setDrawerShown] = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
      const raf = requestAnimationFrame(() => setDrawerShown(true));
      return () => cancelAnimationFrame(raf);
    }
    setDrawerShown(false);
    const t = setTimeout(() => setDrawerMounted(false), 380);
    return () => clearTimeout(t);
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useBodyScrollLock(drawerOpen);
  useDialogA11y(drawerOpen, drawerRef, closeDrawer);

  // Về desktop thì đóng drawer để không khoá cuộn oan.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(min-width: 1025px)');
    const onChange = (e) => { if (e.matches) setDrawerOpen(false); };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  /* ── Đổi trang → cuộn lên đầu lưới ─────────────────────────── */
  const gridTopRef = useRef(null);
  const goToPage = useCallback(
    (n) => {
      const next = Math.min(Math.max(1, n), totalPages);
      setParams({ page: next > 1 ? String(next) : undefined });
      const el = gridTopRef.current;
      if (!el || typeof window === 'undefined') return;
      const top = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    },
    [setParams, totalPages],
  );

  /* ── Tiêu đề trang ─────────────────────────────────────────── */
  const cat = catBySlug(catSlug);
  const heading = cat ? cat.name : 'Tất cả sản phẩm';
  const blurb = cat
    ? cat.blurb
    : 'Toàn bộ thiết kế Thu – Đông 2026 của LYRA: lụa, len pha, denim và đồ da thuộc thảo mộc — làm thủ công tại Hà Nội.';

  // Tiêu đề kiểu editorial: từ cuối in nghiêng màu camel.
  const headWords = heading.split(' ');
  const headLead = cat ? headWords.slice(0, -1).join(' ') : 'Tất cả';
  const headEm = cat ? headWords[headWords.length - 1] : 'sản phẩm';

  const filtersState = { catSlug, minPrice, maxPrice, color, minRating, onlySale, inStock };
  const filtersActions = { setParams };

  return (
    <div className="shop-page">
      {/* ══ Tiêu đề ══════════════════════════════════════════ */}
      <header className="shop-header-bar shop-hero">
        <div className="wrap">
          <Reveal className="shop-hero-inner">
            <div className="eyebrow">Bộ sưu tập Thu – Đông 2026</div>
            <h1 className="t-h1 shop-title">
              {headLead ? `${headLead} ` : ''}
              <em>{headEm}</em>
            </h1>
            <p className="shop-blurb">{blurb}</p>
          </Reveal>
        </div>
      </header>

      <div className="shop-layout">
        {/* ══ Sidebar desktop ═══════════════════════════════ */}
        <aside className="shop-sidebar" aria-label="Bộ lọc sản phẩm">
          <div className="shop-sidebar-head">
            <span className="eyebrow bare">Bộ lọc</span>
            {filterCount > 0 && (
              <button type="button" className="shop-clear-link" onClick={resetFilters}>
                Xoá tất cả
              </button>
            )}
          </div>
          <Filters id="sb" state={filtersState} actions={filtersActions} />
        </aside>

        {/* ══ Khu vực chính ═════════════════════════════════ */}
        <section className="shop-main-area" ref={gridTopRef}>
          <div className="shop-toolbar">
            <div className="shop-toolbar-left">
              <button
                type="button"
                className="filter-toggle-btn"
                onClick={() => setDrawerOpen(true)}
                aria-expanded={drawerOpen}
              >
                <i className="bi bi-sliders" aria-hidden="true" />
                Bộ lọc{filterCount > 0 ? ` (${filterCount})` : ''}
              </button>
              <p className="shop-meta-text" role="status" aria-live="polite">
                Hiển thị {paged.length} / {filtered.length} sản phẩm
                {totalPages > 1 ? ` · trang ${page}/${totalPages}` : ''}
              </p>
            </div>

            <div className="shop-toolbar-right">
              <label className="sr-only" htmlFor="shop-sort">Sắp xếp sản phẩm</label>
              <select
                id="shop-sort"
                className="sort-select"
                aria-label="Sắp xếp sản phẩm"
                value={sort}
                onChange={(e) =>
                  setParams({
                    sort: e.target.value === 'newest' ? undefined : e.target.value,
                    page: undefined,
                  })
                }
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>

              <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
                <button
                  type="button"
                  className={`view-btn${!listView ? ' active' : ''}`}
                  aria-label="Dạng lưới"
                  aria-pressed={!listView}
                  onClick={() => setParams({ view: undefined })}
                >
                  <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={`view-btn${listView ? ' active' : ''}`}
                  aria-label="Dạng danh sách"
                  aria-pressed={listView}
                  onClick={() => setParams({ view: 'list' })}
                >
                  <i className="bi bi-list-ul" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {activeChips.length > 0 && (
            <div className="chip-row shop-active-chips">
              {activeChips.map((c) => (
                <span key={c.key} className="chip active shop-active-chip">
                  {c.label}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={`Bỏ lọc ${c.label}`}
                    onClick={() => setParams({ ...c.clear, page: undefined })}
                  >
                    <i className="bi bi-x-lg" aria-hidden="true" />
                  </button>
                </span>
              ))}
              <button type="button" className="shop-clear-link" onClick={resetFilters}>
                Xoá tất cả
              </button>
            </div>
          )}

          {paged.length === 0 ? (
            <EmptyState
              icon="bi-search"
              title="Không có thiết kế nào khớp bộ lọc"
              sub="Thử nới khoảng giá hoặc bỏ bớt một vài tiêu chí để xem thêm sản phẩm."
              action={{ label: 'Xoá bộ lọc', onClick: resetFilters }}
            />
          ) : (
            <div className={`products-grid${listView ? ' list-view' : ''}`}>
              {paged.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="lyra-pagination" aria-label="Phân trang">
              <button
                type="button"
                className="page-num-btn"
                aria-label="Trang trước"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>
              {pageList(totalPages, page).map((n, i) =>
                n === '…' ? (
                  <span key={`gap-${i}`} className="pagination-ellipsis" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`page-num-btn${page === n ? ' active' : ''}`}
                    aria-label={`Trang ${n}`}
                    aria-current={page === n ? 'page' : undefined}
                    onClick={() => goToPage(n)}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                className="page-num-btn"
                aria-label="Trang sau"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
              >
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>
      </div>

      {/* ══ Drawer lọc trên mobile (≤1024px) ═══════════════════ */}
      {drawerMounted && (
        <>
          <div
            className={`shop-filter-backdrop${drawerShown ? ' open' : ''}`}
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            className={`shop-filter-drawer${drawerShown ? ' open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Bộ lọc sản phẩm"
            tabIndex={-1}
          >
            <div className="filters-sheet-head">
              <h2 className="filters-sheet-title">Bộ lọc</h2>
              <button
                type="button"
                className="btn-icon"
                aria-label="Đóng bộ lọc"
                onClick={closeDrawer}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>

            <Filters id="dw" state={filtersState} actions={filtersActions} />

            <div className="filters-sheet-foot">
              <button type="button" className="btn-outline-lyra" onClick={resetFilters}>
                Xoá tất cả
              </button>
              <button type="button" className="btn-lyra" onClick={closeDrawer}>
                Xem {filtered.length} sản phẩm
              </button>
            </div>
          </div>
        </>
      )}

      <Footer />
    </div>
  );
}

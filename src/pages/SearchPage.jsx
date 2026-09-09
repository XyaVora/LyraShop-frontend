// src/pages/SearchPage.jsx — trang Tìm kiếm của LYRA.
// Khớp bỏ dấu (deburr) theo từng từ khoá trên name/cat/brand/tags/desc,
// xếp hạng theo độ liên quan, tab danh mục + sắp xếp, gợi ý dựng từ dữ liệu thật.
import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PRODUCTS, deburr } from '../data/products';
import { ProductCard, Footer, EmptyState, Reveal, SectionHeader } from '../components/index.jsx';
import '../styles/search.css';

/* ── Tiện ích ─────────────────────────────────────────────────────── */

/** Bỏ dấu + gom khoảng trắng để so khớp. */
const norm = (s) => deburr(String(s ?? '')).replace(/\s+/g, ' ').trim();

/** Viết hoa chữ cái đầu (dùng cho chip gợi ý lấy từ tags). */
const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const RECENT_KEY = 'lyra_recent_searches';
const MAX_RECENT = 6;

const readRecent = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string' && s.trim()).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

const writeRecent = (list) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* localStorage bị chặn → bỏ qua */
  }
};

/** Chỉ mục tìm kiếm dựng MỘT LẦN từ PRODUCTS (không mutate mảng gốc). */
const SEARCH_INDEX = PRODUCTS.map((p) => {
  const name = norm(p.name);
  const cat = norm(p.cat);
  const brand = norm(p.brand);
  const tags = (p.tags || []).map(norm);
  const desc = norm(p.desc);
  return { p, name, cat, brand, tags, tagText: tags.join(' '), desc, all: `${name} ${cat} ${brand} ${tags.join(' ')} ${desc}` };
});

/** Điểm liên quan của một từ khoá với một bản ghi. */
function tokenScore(rec, token) {
  let s = 0;
  if (rec.name.startsWith(token)) s += 6;
  else if (rec.name.includes(token)) s += 4;
  if (rec.tags.some((t) => t === token)) s += 3.5;
  else if (rec.tagText.includes(token)) s += 2.5;
  if (rec.cat.includes(token)) s += 2;
  if (rec.brand.includes(token)) s += 1.5;
  if (rec.desc.includes(token)) s += 1;
  return s;
}

/** Chip gợi ý: chỉ lấy tag xuất hiện ở ≥ 2 sản phẩm → không bao giờ ra "không kết quả". */
const SUGGESTED_TAGS = (() => {
  const freq = new Map();
  PRODUCTS.forEach((p) => (p.tags || []).forEach((t) => freq.set(t, (freq.get(t) || 0) + 1)));
  return [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
    .slice(0, 8)
    .map(([t]) => t);
})();

/** 4 sản phẩm bán chạy nhất — dùng làm gợi ý khi không có kết quả. */
const BEST_SELLERS = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 4);

const SORTS = [
  { id: 'relevant', label: 'Liên quan nhất' },
  { id: 'newest', label: 'Mới nhất' },
  { id: 'popular', label: 'Bán chạy nhất' },
  { id: 'price-asc', label: 'Giá tăng dần' },
  { id: 'price-desc', label: 'Giá giảm dần' },
  { id: 'rating', label: 'Đánh giá cao nhất' },
];

/* ── Trang ────────────────────────────────────────────────────────── */

export default function SearchPage() {
  const { navigate, searchQuery } = useApp();

  const [term, setTerm] = useState(searchQuery);
  const [sortBy, setSortBy] = useState('relevant');
  const [activeCat, setActiveCat] = useState('all');
  const [recent, setRecent] = useState(readRecent);

  /* Từ khoá đổi (chip gợi ý, ô tìm kiếm trên navbar, nút back) → đồng bộ ô nhập
     và bỏ lọc danh mục cũ. App.jsx không remount trang vì pathname vẫn là /search. */
  useEffect(() => {
    setTerm(searchQuery);
    setActiveCat('all');
  }, [searchQuery]);

  /* Ghi nhớ các từ khoá đã tìm (state thuần, ghi localStorage ở effect riêng). */
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) return;
    setRecent((prev) => {
      if (prev[0] === q) return prev; // đã đứng đầu → không tạo render thừa
      return [q, ...prev.filter((s) => norm(s) !== norm(q))].slice(0, MAX_RECENT);
    });
  }, [searchQuery]);

  useEffect(() => {
    writeRecent(recent);
  }, [recent]);

  /* Kết quả khớp — bỏ dấu, khớp TỪNG từ (AND), có điểm liên quan. */
  const results = useMemo(() => {
    const q = norm(searchQuery);
    if (!q) return PRODUCTS.map((p) => ({ p, score: 0 }));
    const tokens = q.split(' ').filter(Boolean);
    const phrase = q;
    const out = [];
    SEARCH_INDEX.forEach((rec) => {
      if (!tokens.every((t) => rec.all.includes(t))) return;
      let score = tokens.reduce((sum, t) => sum + tokenScore(rec, t), 0);
      if (tokens.length > 1 && rec.name.includes(phrase)) score += 8;
      out.push({ p: rec.p, score });
    });
    return out;
  }, [searchQuery]);

  const products = useMemo(() => results.map((r) => r.p), [results]);

  /* Tab danh mục dựng từ chính kết quả (kèm số lượng thật). */
  const cats = useMemo(() => {
    const counts = new Map();
    products.forEach((p) => counts.set(p.cat, (counts.get(p.cat) || 0) + 1));
    return [
      { id: 'all', label: 'Tất cả', count: products.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi'))
        .map(([name, count]) => ({ id: name, label: name, count })),
    ];
  }, [products]);

  // Phòng vệ: nếu tab đang chọn không còn trong danh sách thì coi như "Tất cả".
  const currentCat = cats.some((c) => c.id === activeCat) ? activeCat : 'all';

  const filtered = useMemo(() => {
    const base = currentCat === 'all' ? results : results.filter((r) => r.p.cat === currentCat);
    const list = [...base];
    switch (sortBy) {
      case 'price-asc': list.sort((a, b) => a.p.price - b.p.price); break;
      case 'price-desc': list.sort((a, b) => b.p.price - a.p.price); break;
      case 'rating': list.sort((a, b) => b.p.rating - a.p.rating || b.p.reviews - a.p.reviews); break;
      case 'popular': list.sort((a, b) => b.p.sold - a.p.sold); break;
      case 'newest': list.sort((a, b) => String(b.p.createdAt).localeCompare(String(a.p.createdAt))); break;
      default: list.sort((a, b) => b.score - a.score || b.p.sold - a.p.sold); break;
    }
    return list.map((r) => r.p);
  }, [results, currentCat, sortBy]);

  /* ── Hành động ─────────────────────────────────────────────────── */

  const submit = (e) => {
    e.preventDefault();
    const q = term.trim();
    if (norm(q) === norm(searchQuery)) return;
    navigate('search', { q, replace: true });
  };

  const runSearch = (q) => navigate('search', { q, replace: true });

  const clearTerm = () => {
    setTerm('');
    if (searchQuery) navigate('search', { replace: true });
  };

  const clearRecent = () => setRecent([]);

  const hasQuery = Boolean(searchQuery.trim());
  const noResult = products.length === 0;

  return (
    <div className="search-page">
      {/* ── Đầu trang: tiêu đề + ô tìm kiếm ngay trên trang ─────────── */}
      <section className="search-hero">
        <div className="wrap">
          <div className="eyebrow">Tìm kiếm</div>
          <h1 className="t-h1 search-title">
            {hasQuery ? (
              <>Kết quả cho <em>“{searchQuery}”</em></>
            ) : (
              <>Tìm trong <em>bộ sưu tập</em></>
            )}
          </h1>

          <form className="search-form" role="search" onSubmit={submit}>
            <div className="search-field">
              <i className="bi bi-search search-field-icon" aria-hidden="true" />
              <label className="sr-only" htmlFor="search-page-input">Từ khoá tìm kiếm</label>
              <input
                id="search-page-input"
                className="search-input"
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Áo lụa, blazer, giày da…"
                autoComplete="off"
                enterKeyHint="search"
              />
              {term && (
                <button type="button" className="search-clear" onClick={clearTerm} aria-label="Xoá từ khoá">
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              )}
            </div>
            <button type="submit" className="btn-lyra search-submit">Tìm kiếm</button>
          </form>

          <p className="search-meta">
            {hasQuery ? (
              <>
                Tìm thấy <strong>{products.length}</strong> sản phẩm cho “{searchQuery}”
                {currentCat !== 'all' && <> · đang xem <strong>{filtered.length}</strong> trong {currentCat}</>}
              </>
            ) : (
              <>Đang hiển thị toàn bộ <strong>{products.length}</strong> thiết kế của bộ sưu tập Thu – Đông 2026.</>
            )}
          </p>

          {recent.length > 0 && (
            <div className="search-recent">
              <span className="search-recent-label">Đã tìm gần đây</span>
              <div className="chip-row">
                {recent.map((s) => (
                  <button key={s} type="button" className="chip search-chip" onClick={() => runSearch(s)}>
                    <i className="bi bi-clock-history" aria-hidden="true" />
                    {s}
                  </button>
                ))}
              </div>
              <button type="button" className="search-recent-clear" onClick={clearRecent}>Xoá lịch sử</button>
            </div>
          )}
        </div>
      </section>

      {/* ── Thân trang ───────────────────────────────────────────────── */}
      <section className="search-body">
        <div className="wrap">
          {!noResult && (
            <div className="search-toolbar">
              <div className="search-tabs tab-pills-row">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`tab-pill${currentCat === c.id ? ' active' : ''}`}
                    aria-pressed={currentCat === c.id}
                    onClick={() => setActiveCat(c.id)}
                  >
                    {c.label}
                    <span className="search-tab-count">{c.count}</span>
                  </button>
                ))}
              </div>

              <div className="search-sort">
                <label className="search-sort-label" htmlFor="search-sort">Sắp xếp</label>
                <select
                  id="search-sort"
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {noResult ? (
            <>
              <EmptyState
                icon="bi-search"
                title="Không tìm thấy kết quả"
                sub={`Không có thiết kế nào khớp với “${searchQuery}”. Bạn thử một từ khoá ngắn hơn, hoặc xem những gợi ý bên dưới.`}
                action={{ label: 'Xem tất cả sản phẩm', onClick: () => navigate('shop') }}
              >
                <button type="button" className="btn-outline-lyra" onClick={() => navigate('home')}>
                  Về trang chủ
                </button>
              </EmptyState>

              <Reveal className="search-suggest">
                <SectionHeader
                  eyebrow="Được yêu thích nhất"
                  title={<>Có thể bạn <em>quan tâm</em></>}
                  link={{ label: 'Xem tất cả', page: 'shop' }}
                />
                <div className="products-grid">
                  {BEST_SELLERS.map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              </Reveal>
            </>
          ) : (
            <div className="products-grid">
              {filtered.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          )}

          {/* ── Gợi ý từ khoá: dựng từ tags có thật nên luôn ra kết quả ── */}
          <Reveal className="search-related">
            <div className="eyebrow">Có thể bạn cũng tìm</div>
            <div className="chip-row search-related-chips">
              {SUGGESTED_TAGS.map((t) => (
                <button key={t} type="button" className="chip search-chip" onClick={() => runSearch(t)}>
                  {capitalize(t)}
                </button>
              ))}
              <button
                type="button"
                className="chip search-chip is-accent"
                onClick={() => navigate('sale')}
              >
                <i className="bi bi-tag" aria-hidden="true" />
                Đang giảm giá
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

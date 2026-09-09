// src/pages/BrandsPage.jsx — Trang "Thương hiệu" của LYRA.
// Số liệu thương hiệu ĐẾM THẬT từ PRODUCTS (so khớp brand không phân biệt hoa thường).
// Thương hiệu đang chọn lấy từ URL: /brands?brand=<id>.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { fmt, img } from '../data/products';
import { useCatalog } from '../context/CatalogContext';
import { BRAND } from '../data/brand';
import {
  EmptyState,
  Footer,
  Pic,
  ProductCard,
  Reveal,
  SectionHeader,
} from '../components/index.jsx';
import Modal from '../components/Modal.jsx';
import { isEmail } from '../utils/validate.js';
import '../styles/brands.css';

/* ------------------------------------------------------------------ */
/* Dữ liệu thương hiệu                                                 */
/* ------------------------------------------------------------------ */

const FOLLOW_KEY = 'lyra_followed_brands';

/** So khớp tên thương hiệu: bỏ khoảng trắng thừa, KHÔNG phân biệt hoa thường. */
const norm = (s) => String(s || '').trim().toLowerCase();

/** Sản phẩm của một thương hiệu — luôn trả mảng mới. */
const productsOfBrand = (products, name) =>
  (products || []).filter((p) => norm(p.brand) === norm(name));

/** Điểm đánh giá trung bình có trọng số theo số lượt đánh giá. */
function ratingOf(items) {
  const votes = items.reduce((a, p) => a + (p.reviews || 0), 0);
  if (!votes) return null;
  return items.reduce((a, p) => a + p.rating * (p.reviews || 0), 0) / votes;
}

const BRAND_META = [
  {
    id: 'lyra',
    name: 'LYRA',
    tagline: 'Phong cách định nghĩa bạn',
    desc: 'Thương hiệu thời trang Việt thành lập năm 2018 tại Hà Nội. LYRA theo đuổi thiết kế tối giản, chất liệu tự nhiên và những đường may hoàn thiện thủ công tại xưởng riêng.',
    story:
      'Bắt đầu từ một xưởng may nhỏ trên phố Huế, LYRA vẫn giữ cách làm cũ: chọn tơ Bảo Lộc, da bò thuộc thảo mộc, cắt và may từng chiếc tại xưởng của mình. Bộ sưu tập Thu – Đông 2026 gồm những thiết kế trải trên bốn dòng sản phẩm, mỗi mẫu được thử phom trên người thật trước khi lên kệ. Chúng tôi làm ít mẫu, làm kỹ, và bảo hành đường may trọn đời sản phẩm.',
    color: '#C8A97E',
    icon: 'bi-bag-heart',
    founded: '2018',
    country: 'Việt Nam',
    isLocal: true,
    imageId: '1539533018447-63fcce2678e3',
    tags: ['Lụa tơ tằm', 'Da thuộc thảo mộc', 'Tối giản', 'Xưởng may riêng'],
  },
  {
    id: 'zara',
    name: 'ZARA',
    tagline: 'Live in Style',
    desc: 'Thương hiệu thời trang Tây Ban Nha nổi tiếng với tốc độ đưa thiết kế mới ra cửa hàng nhanh bậc nhất thế giới, ở mức giá phải chăng.',
    story:
      'Zara ra đời năm 1975 tại La Coruña, Tây Ban Nha. Mô hình sản xuất ngắn hạn cho phép thương hiệu này đưa một mẫu từ bản vẽ tới kệ hàng trong khoảng hai tuần — điều đã định hình lại toàn bộ ngành bán lẻ thời trang đương đại.',
    color: '#1A1A1A',
    icon: 'bi-bag',
    founded: '1975',
    country: 'Tây Ban Nha',
    isLocal: false,
    imageId: '1445205170230-053b83016050',
    tags: ['Xu hướng nhanh', 'Đa dạng', 'Toàn cầu'],
  },
  {
    id: 'hm',
    name: 'H&M',
    tagline: 'Fashion & Quality at the best price',
    desc: 'Thương hiệu Thuỵ Điển theo đuổi triết lý mang thời trang chất lượng tốt tới mức giá hợp lý cho tất cả mọi người.',
    story:
      'Thành lập năm 1947 bởi Erling Persson, H&M hiện là một trong những nhà bán lẻ thời trang lớn nhất thế giới. Những năm gần đây thương hiệu đẩy mạnh dòng sản phẩm dùng vật liệu tái chế và chương trình thu hồi quần áo cũ.',
    color: '#C0392B',
    icon: 'bi-person',
    founded: '1947',
    country: 'Thuỵ Điển',
    isLocal: false,
    imageId: '1578932750294-f5075e85f44a',
    tags: ['Cơ bản', 'Vật liệu tái chế', 'Toàn cầu'],
  },
  {
    id: 'local',
    name: 'Local Brand VN',
    tagline: 'Tự hào hàng Việt',
    desc: 'Nhóm các thương hiệu độc lập trong nước, từ streetwear tới thiết kế thủ công — mỗi cái tên mang một câu chuyện Việt riêng.',
    story:
      'Làn sóng local brand Việt Nam lớn dần từ giữa thập niên 2010 với những nhà thiết kế trẻ tự dựng xưởng, tự kể chuyện. LYRA dành một khu vực riêng để giới thiệu các thương hiệu cùng quan điểm về chất liệu và cách làm nghề.',
    color: '#C0653F',
    icon: 'bi-star',
    founded: '2015',
    country: 'Việt Nam',
    isLocal: true,
    imageId: '1601924994987-69e26d50dc26',
    tags: ['Thủ công', 'Độc bản', 'Câu chuyện Việt'],
  },
];

function brandsFrom(products) {
  return BRAND_META.map((b) => {
    const items = productsOfBrand(products, b.name);
    const prices = items.map((p) => p.price);
    return {
      ...b,
      image: img(b.imageId, 1600),
      items,
      count: items.length,
      reviews: items.reduce((a, p) => a + (p.reviews || 0), 0),
      rating: ratingOf(items),
      minPrice: prices.length ? Math.min(...prices) : null,
    };
  });
}

/* ── localStorage an toàn ────────────────────────────────────────────── */
function readFollowed() {
  try {
    const raw = localStorage.getItem(FOLLOW_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Trang                                                               */
/* ------------------------------------------------------------------ */

export default function BrandsPage() {
  const { navigate, params } = useApp();
  const { showToast } = useCart();
  const { products } = useCatalog();
  const brands = useMemo(() => brandsFrom(products), [products]);

  // Thương hiệu đang chọn suy ra từ URL — không lưu trùng vào state.
  const brand = useMemo(
    () => brands.find((b) => b.id === params.brand) || brands[0],
    [params.brand, brands],
  );

  const detailRef = useRef(null);
  const storyId = useId();

  // Câu chuyện mở theo từng thương hiệu → đổi thương hiệu là tự đóng lại.
  const [storyFor, setStoryFor] = useState(null);
  const showStory = storyFor === brand.id;

  // Theo dõi thương hiệu (lưu localStorage, có thể bỏ theo dõi).
  const [followed, setFollowed] = useState(readFollowed);
  useEffect(() => {
    try {
      localStorage.setItem(FOLLOW_KEY, JSON.stringify(followed));
    } catch {
      /* trình duyệt chặn localStorage → bỏ qua, chỉ mất trạng thái sau khi tải lại */
    }
  }, [followed]);

  const isFollowed = followed.includes(brand.id);

  const toggleFollow = useCallback(() => {
    setFollowed((prev) =>
      prev.includes(brand.id) ? prev.filter((id) => id !== brand.id) : [...prev, brand.id],
    );
    showToast(
      isFollowed ? `Đã bỏ theo dõi ${brand.name}` : `Đang theo dõi ${brand.name}`,
      isFollowed ? 'bi-heart' : 'bi-heart-fill',
    );
  }, [brand.id, brand.name, isFollowed, showToast]);

  /** Chọn thương hiệu: đổi URL (?brand=) và giữ nguyên vị trí cuộn. */
  const selectBrand = useCallback(
    (id, { scrollToDetail = false } = {}) => {
      navigate('brands', { brand: id, replace: true, keepScroll: true });
      if (scrollToDetail && detailRef.current) {
        detailRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    },
    [navigate],
  );

  /* ── Hộp thoại: nhận thông báo & hợp tác ──────────────────────────── */
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyError, setNotifyError] = useState('');

  // Mở lại hộp thoại → dọn lỗi của lần mở trước, không để trạng thái rò rỉ.
  // (Reset khi MỞ chứ không khi đóng, để dòng lỗi không nháy lúc overlay tan;
  //  cùng quy ước với AddressModal của trang Tài khoản.)
  useEffect(() => {
    if (notifyOpen) {
      setNotifyError('');
      setNotifyEmail('');
    }
  }, [notifyOpen]);

  const submitNotify = (e) => {
    e.preventDefault();
    const value = notifyEmail.trim();
    if (!isEmail(value)) {
      setNotifyError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setNotifyOpen(false);
    setNotifyEmail('');
    setNotifyError('');
    showToast(`Đã ghi nhận email. LYRA sẽ báo khi ${brand.name} lên kệ.`, 'bi-bell');
  };

  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partner, setPartner] = useState({ name: '', email: '', message: '' });
  const [partnerErrors, setPartnerErrors] = useState({});

  // Cùng lý do như trên. Cố ý KHÔNG xoá nội dung `partner` đã gõ: đóng nhầm
  // hộp thoại không nên làm mất bản nháp của người dùng.
  useEffect(() => {
    if (partnerOpen) setPartnerErrors({});
  }, [partnerOpen]);

  const setPartnerField = (field, value) => {
    setPartner((prev) => ({ ...prev, [field]: value }));
    setPartnerErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  const submitPartner = (e) => {
    e.preventDefault();
    const next = {};
    if (!partner.name.trim()) next.name = 'Vui lòng nhập tên thương hiệu của bạn.';
    if (!isEmail(partner.email)) next.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    if (partner.message.trim().length < 10) next.message = 'Hãy mô tả ngắn gọn (từ 10 ký tự).';
    setPartnerErrors(next);
    if (Object.keys(next).length) return;

    setPartnerOpen(false);
    setPartner({ name: '', email: '', message: '' });
    showToast('Đã gửi thông tin. LYRA sẽ phản hồi trong 2 ngày làm việc.', 'bi-send-check');
  };

  /* ── Số liệu hiển thị của thương hiệu đang chọn ───────────────────── */
  const stats = [
    { label: 'Năm thành lập', value: brand.founded },
    { label: 'Xuất xứ', value: brand.country },
    { label: 'Thiết kế đang bán', value: brand.count > 0 ? String(brand.count) : 'Chưa có' },
    {
      label: 'Đánh giá trung bình',
      value: brand.rating ? `${brand.rating.toFixed(1).replace('.', ',')}/5` : 'Chưa có',
    },
  ];

  return (
    <div className="brands-page">
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="brands-hero grain on-ink">
        <div className="wrap">
          <Reveal className="brands-hero-inner">
            <span className="eyebrow on-ink">Nhà LYRA · {BRAND.season}</span>
            <h1 className="t-h1 brands-hero-title">
              Thương hiệu
              <br />
              <em>tuyển chọn</em>
            </h1>
            <p className="brands-hero-lead">
              Chúng tôi bắt đầu từ chính mình: một xưởng may ở Hà Nội, một cách làm chậm. Bên cạnh
              LYRA là những cái tên đang trong quá trình hợp tác.
            </p>
            <dl className="brands-hero-stats">
              <div className="brands-hero-stat">
                <dt>Thương hiệu giới thiệu</dt>
                <dd>{brands.length}</dd>
              </div>
              <div className="brands-hero-stat">
                <dt>Thiết kế đang bán</dt>
                <dd>{products.length}</dd>
              </div>
              <div className="brands-hero-stat">
                <dt>Xưởng riêng từ</dt>
                <dd>{BRAND.founded}</dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ── CHỌN THƯƠNG HIỆU ─────────────────────────────────────────── */}
      <section className="brands-picker-section">
        <div className="wrap">
          <div className="brand-picker" role="group" aria-label="Chọn thương hiệu để xem chi tiết">
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                className="brand-pick"
                aria-pressed={b.id === brand.id}
                onClick={() => selectBrand(b.id)}
              >
                <span className="brand-pick-swatch" style={{ background: b.color }} aria-hidden="true" />
                <span className="brand-pick-name">{b.name}</span>
                <span className="brand-pick-meta">{b.country}</span>
                <span className="brand-pick-count">
                  {b.count > 0 ? `${b.count} thiết kế` : 'Sắp có hàng'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHI TIẾT THƯƠNG HIỆU ─────────────────────────────────────── */}
      <section className="section brands-detail-section" ref={detailRef}>
        <div className="wrap">
          <div className="brand-detail">
            <Reveal className="brand-visual-col">
              <div className="brand-visual">
                <Pic
                  src={brand.image}
                  alt={`Hình ảnh thương hiệu ${brand.name}`}
                  ratio="4/5"
                  tint={brand.color}
                  icon={brand.icon}
                  eager
                  sizes="(max-width: 900px) 100vw, 42vw"
                />
                <span className="brand-visual-tag">Est. {brand.founded}</span>
              </div>

              <dl className="brand-stats">
                {stats.map((s) => (
                  <div key={s.label} className="brand-stat">
                    <dt className="brand-stat-label">{s.label}</dt>
                    <dd className="brand-stat-val">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal className="brand-info-col" delay={1}>
              <span className="eyebrow">
                {brand.isLocal ? 'Thương hiệu Việt' : 'Thương hiệu quốc tế'}
              </span>
              <h2 className="brand-title">{brand.name}</h2>
              <p className="brand-tagline">“{brand.tagline}”</p>
              <p className="brand-desc">{brand.desc}</p>

              <ul className="brand-tags">
                {brand.tags.map((tag) => (
                  <li key={tag} className="brand-tag">
                    {tag}
                  </li>
                ))}
              </ul>

              <div className="brand-story">
                <button
                  type="button"
                  className="brand-story-toggle"
                  onClick={() => setStoryFor(showStory ? null : brand.id)}
                  aria-expanded={showStory}
                  aria-controls={storyId}
                >
                  <i className={`bi bi-chevron-${showStory ? 'up' : 'down'}`} aria-hidden="true" />
                  {showStory ? 'Ẩn câu chuyện' : 'Đọc câu chuyện thương hiệu'}
                </button>
                <p className="brand-story-text" id={storyId} hidden={!showStory}>
                  {brand.story}
                </p>
              </div>

              <div className="brand-actions">
                {brand.count > 0 ? (
                  <button type="button" className="btn-lyra" onClick={() => navigate('shop')}>
                    <i className="bi bi-bag" aria-hidden="true" /> Xem {brand.count} thiết kế
                  </button>
                ) : (
                  <button type="button" className="btn-lyra" onClick={() => setNotifyOpen(true)}>
                    <i className="bi bi-bell" aria-hidden="true" /> Nhận thông báo
                  </button>
                )}
                <button
                  type="button"
                  className="btn-outline-lyra"
                  aria-pressed={isFollowed}
                  onClick={toggleFollow}
                >
                  <i className={`bi bi-heart${isFollowed ? '-fill' : ''}`} aria-hidden="true" />
                  {isFollowed ? ' Đang theo dõi' : ' Theo dõi'}
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SẢN PHẨM CỦA THƯƠNG HIỆU ─────────────────────────────────── */}
      <section className="section brands-products-section">
        <div className="wrap">
          {brand.count > 0 ? (
            <>
              <SectionHeader
                eyebrow="Bộ sưu tập"
                title={
                  <>
                    Sản phẩm của
                    <br />
                    <em>{brand.name}</em>
                  </>
                }
                sub={
                  brand.minPrice
                    ? `${brand.count} thiết kế đang bán, giá từ ${fmt(brand.minPrice)} — ${brand.reviews} lượt đánh giá từ khách hàng.`
                    : undefined
                }
                link={{ label: 'Xem tất cả', page: 'shop' }}
              />
              <div className="products-grid">
                {brand.items.slice(0, 8).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </>
          ) : (
            <>
              <SectionHeader
                eyebrow="Sắp ra mắt"
                title={
                  <>
                    Sản phẩm của <em>{brand.name}</em>
                  </>
                }
              />
              <div className="brand-soon">
                <EmptyState
                  icon="bi-hourglass-split"
                  title="Sắp có hàng"
                  sub={`LYRA đang trong quá trình hợp tác với ${brand.name}. Để lại email để nhận thông báo ngay khi những thiết kế đầu tiên lên kệ.`}
                  action={{ label: 'Nhận thông báo', onClick: () => setNotifyOpen(true) }}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── TẤT CẢ THƯƠNG HIỆU ───────────────────────────────────────── */}
      <section className="section brands-list-section">
        <div className="wrap">
          <SectionHeader
            eyebrow="Danh sách"
            title={
              <>
                Tất cả <em>thương hiệu</em>
              </>
            }
            sub="Bấm để xem chi tiết từng thương hiệu."
          />
          <ul className="brand-list">
            {brands.map((b, i) => (
              <li key={b.id}>
                <button
                  type="button"
                  className="brand-list-item"
                  aria-pressed={b.id === brand.id}
                  onClick={() => selectBrand(b.id, { scrollToDetail: true })}
                  data-reveal
                  style={{ '--i': i % 4 }}
                >
                  <Pic
                    as="span"
                    className="brand-list-thumb"
                    src={b.image}
                    alt=""
                    ratio="1/1"
                    tint={b.color}
                    icon={b.icon}
                  />
                  <span className="brand-list-body">
                    <span className="brand-list-name">
                      {b.name}
                      {b.isLocal && <span className="brand-list-flag">VN</span>}
                    </span>
                    <span className="brand-list-tagline">{b.tagline}</span>
                    <span className="brand-list-meta">
                      {b.country} · Est. {b.founded} ·{' '}
                      {b.count > 0 ? `${b.count} thiết kế` : 'Sắp có hàng'}
                    </span>
                  </span>
                  <i className="bi bi-arrow-right brand-list-arrow" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CAM KẾT ──────────────────────────────────────────────────── */}
      <section className="section-sm brands-promise-section">
        <div className="wrap">
          <div className="promise-row">
            {BRAND.promises.map((p) => (
              <div key={p.title} className="promise-item">
                <i className={`bi ${p.icon}`} aria-hidden="true" />
                <div>
                  <div className="promise-title">{p.title}</div>
                  <p className="promise-sub">{p.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HỢP TÁC ──────────────────────────────────────────────────── */}
      <section className="brands-partner-section">
        <div className="wrap">
          <div className="partner-panel grain on-ink">
            <div className="partner-copy">
              <span className="eyebrow on-ink">Dành cho thương hiệu</span>
              <h2 className="partner-title">
                Hợp tác với <em>LYRA</em>
              </h2>
              <p className="partner-lead">
                Bạn làm thời trang và muốn giới thiệu sản phẩm tới khách hàng của LYRA? Gửi cho
                chúng tôi vài dòng về thương hiệu của bạn — đội ngũ tuyển chọn sẽ đọc từng hồ sơ.
              </p>
            </div>
            <div className="partner-actions">
              <button type="button" className="btn-warm" onClick={() => setPartnerOpen(true)}>
                Liên hệ hợp tác <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
              <p className="partner-contact">
                Hoặc gửi thư tới <span>{BRAND.email}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer navigate={navigate} />

      {/* ── MODAL: nhận thông báo ────────────────────────────────────── */}
      <Modal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        title={`Nhận thông báo về ${brand.name}`}
        size="sm"
      >
        <form className="brand-form" onSubmit={submitNotify} noValidate>
          <p className="brand-form-lead">
            Chúng tôi sẽ gửi một email duy nhất khi những thiết kế đầu tiên của {brand.name} lên kệ.
          </p>
          <div className="field-block">
            <label className="form-field-label" htmlFor="brand-notify-email">
              Địa chỉ email
            </label>
            <input
              id="brand-notify-email"
              className={`form-field-input${notifyError ? ' invalid' : ''}`}
              type="email"
              value={notifyEmail}
              onChange={(e) => {
                setNotifyEmail(e.target.value);
                if (notifyError) setNotifyError('');
              }}
              placeholder="ban@email.com"
              aria-invalid={notifyError ? 'true' : undefined}
              aria-describedby={notifyError ? 'brand-notify-error' : undefined}
            />
            {notifyError && (
              <p className="field-error" id="brand-notify-error" role="alert">
                {notifyError}
              </p>
            )}
          </div>
          <button type="submit" className="btn-lyra btn-block">
            Đăng ký nhận tin
          </button>
        </form>
      </Modal>

      {/* ── MODAL: hợp tác ───────────────────────────────────────────── */}
      <Modal
        open={partnerOpen}
        onClose={() => setPartnerOpen(false)}
        title="Liên hệ hợp tác"
        size="sm"
      >
        <form className="brand-form" onSubmit={submitPartner} noValidate>
          <div className="field-block">
            <label className="form-field-label" htmlFor="partner-name">
              Tên thương hiệu
            </label>
            <input
              id="partner-name"
              className={`form-field-input${partnerErrors.name ? ' invalid' : ''}`}
              type="text"
              value={partner.name}
              onChange={(e) => setPartnerField('name', e.target.value)}
              placeholder="Ví dụ: Atelier Hà Nội"
              aria-invalid={partnerErrors.name ? 'true' : undefined}
              aria-describedby={partnerErrors.name ? 'partner-name-error' : undefined}
            />
            {partnerErrors.name && (
              <p className="field-error" id="partner-name-error" role="alert">
                {partnerErrors.name}
              </p>
            )}
          </div>

          <div className="field-block">
            <label className="form-field-label" htmlFor="partner-email">
              Email liên hệ
            </label>
            <input
              id="partner-email"
              className={`form-field-input${partnerErrors.email ? ' invalid' : ''}`}
              type="email"
              value={partner.email}
              onChange={(e) => setPartnerField('email', e.target.value)}
              placeholder="ban@email.com"
              aria-invalid={partnerErrors.email ? 'true' : undefined}
              aria-describedby={partnerErrors.email ? 'partner-email-error' : undefined}
            />
            {partnerErrors.email && (
              <p className="field-error" id="partner-email-error" role="alert">
                {partnerErrors.email}
              </p>
            )}
          </div>

          <div className="field-block">
            <label className="form-field-label" htmlFor="partner-message">
              Giới thiệu ngắn
            </label>
            <textarea
              id="partner-message"
              className={`form-field-textarea${partnerErrors.message ? ' invalid' : ''}`}
              rows={4}
              value={partner.message}
              onChange={(e) => setPartnerField('message', e.target.value)}
              placeholder="Bạn làm dòng sản phẩm nào, chất liệu ra sao, quy mô xưởng…"
              aria-invalid={partnerErrors.message ? 'true' : undefined}
              aria-describedby={partnerErrors.message ? 'partner-message-error' : undefined}
            />
            {partnerErrors.message && (
              <p className="field-error" id="partner-message-error" role="alert">
                {partnerErrors.message}
              </p>
            )}
          </div>

          <button type="submit" className="btn-lyra btn-block">
            Gửi thông tin
          </button>
        </form>
      </Modal>
    </div>
  );
}

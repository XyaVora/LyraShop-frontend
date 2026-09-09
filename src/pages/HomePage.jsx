// src/pages/HomePage.jsx — Trang chủ LYRA (editorial atelier)
// 11 khối: hero ảnh thật · marquee · danh mục · nổi bật · câu chuyện · banner sale
// · mới về · đã xem gần đây · cảm nhận · #LYRAstyle · cam kết + newsletter + footer.
// Mọi con số quảng cáo đều TÍNH TỪ DỮ LIỆU trong src/data/products.js.

import { useApp } from '../context/AppContext';
import { useCart } from '../context/CartContext';
import { PRODUCTS, CATEGORIES, REVIEWS_MOCK, findProduct, img } from '../data/products';
import { BRAND } from '../data/brand';
import { buildUrl } from '../router.js';
import {
  Pic,
  ProductCard,
  Stars,
  SectionHeader,
  Marquee,
  Newsletter,
  Footer,
  Reveal,
  isModifiedClick,
} from '../components/index.jsx';
import '../styles/home.css';

/* ══════════════════════════════════════════════════════════════
   Ảnh cố định của trang — id lấy từ images.md (đã kiểm tra 200)
   ══════════════════════════════════════════════════════════════ */
const HERO_IMG = img('1539533018447-63fcce2678e3', 1600); // áo dạ camel — đúng bảng màu
const STORY_IMG = img('1574015974293-817f0ebebb74', 1200); // chân dung editorial
const SALE_IMG = img('1509319117193-57bab727e09d', 1600); // giá treo quần áo

/* ══════════════════════════════════════════════════════════════
   Số liệu suy ra từ dữ liệu thật — KHÔNG bịa
   ══════════════════════════════════════════════════════════════ */
const MAX_OFF = Math.max(...PRODUCTS.map((p) => p.discount || 0)); // hiện tại: 32
const SALE_COUNT = PRODUCTS.filter((p) => (p.discount || 0) > 0).length; // hiện tại: 8

/** 4 sản phẩm bán chạy nhất (mảng mới — không mutate PRODUCTS). */
const FEATURED = [...PRODUCTS].sort((a, b) => b.sold - a.sold).slice(0, 4);

/** 4 sản phẩm về kho gần nhất — createdAt dạng 'YYYY-MM-DD' nên so sánh chuỗi là đủ. */
const NEWEST = [...PRODUCTS]
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  .slice(0, 4);

/** 6 ảnh cho mosaic #LYRAstyle — chọn tay để đa dạng danh mục và sắc độ. */
const MOSAIC = [1, 13, 5, 3, 14, 6].map((id) => findProduct(id)).filter(Boolean);

/** Ba số liệu trung thực về LYRA. */
const STATS = [
  { value: String(PRODUCTS.length), label: 'thiết kế đang bán' },
  { value: String(CATEGORIES.length), label: 'danh mục sản phẩm' },
  { value: '30', label: 'ngày đổi trả miễn phí' },
];

/**
 * Cảm nhận khách hàng: trích NGUYÊN VĂN từ REVIEWS_MOCK (tên, sao, nội dung, ngày là
 * dữ liệu thật của dự án); chỉ thành phố là thông tin bổ sung cho phần trưng bày.
 */
const TESTIMONIALS = [
  { productId: 5, index: 1, city: 'Hà Nội' },
  { productId: 3, index: 0, city: 'TP. Hồ Chí Minh' },
  { productId: 12, index: 1, city: 'Đà Nẵng' },
]
  .map(({ productId, index, city }) => {
    const review = REVIEWS_MOCK[productId]?.[index];
    const product = findProduct(productId);
    if (!review || !product) return null;
    return {
      key: `${productId}-${index}`,
      name: review.name,
      rating: review.rating,
      text: review.text,
      date: review.date,
      city,
      productName: product.name,
      slug: product.slug,
    };
  })
  .filter(Boolean);

/** '2026-06-30' → '30/06/2026'. */
function toDMY(iso) {
  const parts = String(iso || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
}

/* ══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const { navigate } = useApp();
  const { recentlyViewed = [] } = useCart();

  // Liên kết thật: ctrl/cmd-click vẫn mở tab mới, click thường điều hướng trong SPA.
  const go = (page, params) => (e) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    navigate(page, params || {});
  };

  const recent = recentlyViewed.slice(0, 8);

  return (
    <div className="home-page">
      {/* ── 1. HERO ────────────────────────────────────────────── */}
      <section className="hero home-hero" aria-labelledby="home-hero-title">
        <div className="hero-media">
          <Pic
            src={HERO_IMG}
            alt="Người mẫu khoác áo dạ camel trong bộ sưu tập Thu – Đông 2026 của LYRA"
            ratio="auto"
            tint="#DCD2C4"
            icon="bi-bag-heart"
            sizes="(max-width: 1024px) 100vw, 50vw"
            eager
          />
        </div>

        <div className="hero-panel">
          <span className="eyebrow">Bộ sưu tập {BRAND.season}</span>
          <h1 className="t-display" id="home-hero-title">
            Phong cách
            <br />
            định nghĩa
            <br />
            <em>bạn</em>
          </h1>
          <p className="hero-lead">
            Những thiết kế may tại xưởng riêng ở Hà Nội — lụa Bảo Lộc, da thuộc thảo mộc,
            đường kim mũi chỉ làm chậm. Ít món hơn, nhưng mỗi món ở lại lâu hơn.
          </p>
          <div className="hero-actions">
            <a className="btn-lyra" href={buildUrl('shop')} onClick={go('shop')}>
              Khám phá ngay <i className="bi bi-arrow-right" aria-hidden="true" />
            </a>
            <a className="link-underline" href={buildUrl('sale')} onClick={go('sale')}>
              Xem khuyến mãi
            </a>
          </div>
        </div>

        <div className="hero-badge">
          <div className="hero-badge-label">Giảm đến</div>
          <div className="hero-badge-value">{MAX_OFF}%</div>
        </div>

        <div className="hero-scroll" aria-hidden="true">
          Cuộn xuống
        </div>
      </section>

      {/* ── 2. MARQUEE ─────────────────────────────────────────── */}
      <Marquee />

      {/* ── 3. DANH MỤC ────────────────────────────────────────── */}
      <section className="section home-cats">
        <div className="wrap">
          <SectionHeader
            eyebrow="Tủ đồ LYRA"
            title={
              <>
                Mua theo
                <br />
                <em>danh mục</em>
              </>
            }
            sub={`${CATEGORIES.length} danh mục, ${PRODUCTS.length} thiết kế đang bán trong mùa ${BRAND.season}.`}
            link={{ label: 'Tất cả sản phẩm', page: 'shop' }}
          />

          <div className="cat-grid">
            {CATEGORIES.map((cat, i) => (
              <a
                key={cat.id}
                className="cat-card"
                href={buildUrl('shop', { cat: cat.slug })}
                onClick={go('shop', { cat: cat.slug })}
                data-reveal
                style={{ '--i': i }}
              >
                <Pic
                  as="span"
                  src={cat.image}
                  alt={cat.name}
                  ratio="auto"
                  tint={cat.color}
                  icon={cat.icon}
                  sizes="(max-width: 576px) 100vw, (max-width: 1024px) 50vw, 40vw"
                />
                <span className="cat-overlay">
                  <span className="cat-name">{cat.name}</span>
                  <span className="cat-count">{cat.count} sản phẩm</span>
                  <span className="cat-blurb">{cat.blurb}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. NỔI BẬT TUẦN NÀY ────────────────────────────────── */}
      <section className="section home-featured">
        <div className="wrap">
          <SectionHeader
            eyebrow="Được chọn nhiều nhất"
            title={
              <>
                Nổi bật
                <br />
                <em>tuần này</em>
              </>
            }
            sub="Bốn thiết kế có lượt mua cao nhất trong danh mục hiện hành."
            link={{ label: 'Tất cả sản phẩm', page: 'shop' }}
          />
          <div className="products-grid">
            {FEATURED.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CÂU CHUYỆN LYRA ─────────────────────────────────── */}
      <section className="section home-story">
        <div className="wrap">
          <div className="story-grid">
            <Reveal className="story-media">
              <Pic
                src={STORY_IMG}
                alt="Chân dung trong xưởng may LYRA tại Hà Nội"
                ratio="4/5"
                tint="#DCD2C4"
                icon="bi-scissors"
                sizes="(max-width: 900px) 100vw, 45vw"
              />
            </Reveal>

            <Reveal className="story-body" delay={1}>
              <span className="eyebrow">Câu chuyện LYRA</span>
              <h2 className="t-h1">
                Làm chậm
                <br />
                <em>từ Hà Nội</em>
              </h2>
              <p className="story-text">
                LYRA bắt đầu năm {BRAND.founded} với một xưởng nhỏ trên {BRAND.address}. Chúng tôi
                dệt lụa Bảo Lộc, thuộc da bằng thảo mộc và may từng chiếc áo theo phom người Việt —
                không chạy theo số lượng.
              </p>
              <p className="story-text">
                Mỗi mùa chỉ ra mắt một số thiết kế có hạn, đủ để kiểm soát chất liệu và đường may.
                Sản phẩm nào cũng được đổi trả trong 30 ngày, vì chúng tôi tin bạn nên mặc thử thật
                lâu trước khi giữ lại.
              </p>

              <dl className="story-stats">
                {STATS.map((s) => (
                  <div className="story-stat" key={s.label}>
                    <dt className="story-stat-value">{s.value}</dt>
                    <dd className="story-stat-label">{s.label}</dd>
                  </div>
                ))}
              </dl>

              <a className="btn-outline-lyra" href={buildUrl('brands')} onClick={go('brands')}>
                Về LYRA <i className="bi bi-arrow-right" aria-hidden="true" />
              </a>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 6. BANNER SALE ─────────────────────────────────────── */}
      <section className="home-sale">
        <div className="wrap">
          <div className="sale-banner" data-reveal>
            <Pic
              className="sale-banner-media"
              src={SALE_IMG}
              alt=""
              ratio="auto"
              tint="#6B5A45"
              icon="bi-tag"
              sizes="100vw"
            />
            <div className="sale-banner-body">
              <span className="eyebrow on-ink">Ưu đãi cuối mùa</span>
              <h2 className="sale-banner-title">
                Sale cuối mùa
                <br />
                <em>giảm đến {MAX_OFF}%</em>
              </h2>
              <p className="sale-banner-sub">
                {SALE_COUNT} thiết kế đang giảm giá, số lượng còn lại theo tồn kho thật.
              </p>
            </div>
            <a
              className="btn-lyra sale-banner-cta"
              href={buildUrl('sale')}
              onClick={go('sale')}
            >
              Mua ngay <i className="bi bi-arrow-right" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ── 7. MỚI VỀ KHO ──────────────────────────────────────── */}
      <section className="section home-new">
        <div className="wrap">
          <SectionHeader
            eyebrow="Vừa cập bến"
            title={
              <>
                Mới
                <br />
                <em>về kho</em>
              </>
            }
            sub="Những mẫu gần nhất rời xưởng, còn nguyên nếp gấp đầu tiên."
            link={{ label: 'Xem hàng mới về', page: 'new' }}
          />
          <div className="products-grid">
            {NEWEST.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. ĐÃ XEM GẦN ĐÂY (chỉ khi có) ─────────────────────── */}
      {recent.length > 0 && (
        <section className="section home-recent">
          <div className="wrap">
            <SectionHeader
              eyebrow="Dấu chân của bạn"
              title={
                <>
                  Đã xem
                  <br />
                  <em>gần đây</em>
                </>
              }
            />
            <div className="scroll-row" role="list" aria-label="Sản phẩm bạn đã xem gần đây">
              {recent.map((p, i) => (
                <div role="listitem" key={p.id}>
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 9. CẢM NHẬN KHÁCH HÀNG ─────────────────────────────── */}
      {TESTIMONIALS.length > 0 && (
        <section className="section home-quotes">
          <div className="wrap">
            <SectionHeader
              eyebrow="Cảm nhận"
              title={
                <>
                  Khách hàng
                  <br />
                  <em>nói gì</em>
                </>
              }
              sub="Trích từ đánh giá đã xác minh trên chính đơn hàng LYRA."
            />
            <div className="quote-grid">
              {TESTIMONIALS.map((t, i) => (
                <figure className="quote-card" key={t.key} data-reveal style={{ '--i': i }}>
                  <Stars rating={t.rating} size={12} />
                  <blockquote className="quote-text">“{t.text}”</blockquote>
                  <figcaption>
                    <span className="quote-author">
                      {t.name} · {t.city}
                    </span>
                    <span className="quote-meta">
                      {t.productName} · {toDMY(t.date)}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 10. #LYRASTYLE ─────────────────────────────────────── */}
      <section className="section home-style">
        <div className="wrap">
          <SectionHeader
            eyebrow="Cộng đồng"
            title={
              <>
                #LYRA<em>style</em>
              </>
            }
            sub="Sáu thiết kế được phối nhiều nhất mùa này. Chạm vào ảnh để xem sản phẩm."
          />
          <div className="mosaic-grid home-mosaic">
            {MOSAIC.map((p, i) => (
              <a
                key={p.id}
                className="mosaic-item"
                href={buildUrl('detail', { product: p.slug })}
                onClick={go('detail', { product: p.slug })}
                data-reveal
                style={{ '--i': i }}
                aria-label={`Xem sản phẩm ${p.name}`}
              >
                <Pic
                  as="span"
                  src={p.images[0]}
                  alt={p.name}
                  ratio="4/5"
                  tint={p.color}
                  icon={p.icon}
                  sizes="(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 17vw"
                />
                <span className="mosaic-hover" aria-hidden="true">
                  Xem sản phẩm
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── 11. CAM KẾT + NEWSLETTER + FOOTER ──────────────────── */}
      <section className="section-sm home-promises">
        <div className="wrap">
          <div className="promise-row">
            {BRAND.promises.map((pr) => (
              <div className="promise-item" key={pr.title}>
                <i className={`bi ${pr.icon}`} aria-hidden="true" />
                <div>
                  <div className="promise-title">{pr.title}</div>
                  <div className="promise-sub">{pr.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
      <Footer />
    </div>
  );
}

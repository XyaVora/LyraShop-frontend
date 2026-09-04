// src/data/products.js — tầng dữ liệu mock của LYRA.
// Nguồn duy nhất cho: sản phẩm, danh mục, mã giảm giá, đơn mock, đánh giá mock.
// Quy ước: KHÔNG hàm nào được mutate mảng gốc — mọi hàm sort/filter đều trả mảng mới.

import { slugify, deburr } from '../router.js';

/* ------------------------------------------------------------------ */
/* Helper dùng chung                                                   */
/* ------------------------------------------------------------------ */

/** Dựng URL ảnh Unsplash từ id ảnh (danh sách đã kiểm tra HTTP 200). */
export const img = (id, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Tái xuất để các trang khác không phải import trực tiếp từ router. */
export { slugify, deburr };

/** Định dạng tiền Việt: 890000 → "890.000đ". */
export const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

/** Ngưỡng miễn phí vận chuyển và phí ship mặc định. */
export const FREE_SHIPPING_THRESHOLD = 500000;
export const SHIPPING_FEE = 30000;

/** Bộ size theo nhóm danh mục. */
export const SIZE_SETS = {
  clothing: ['XS', 'S', 'M', 'L', 'XL'],
  shoes: ['36', '37', '38', '39', '40', '41'],
  accessories: ['Free size'],
};

/** Danh mục → bộ size tương ứng. */
const sizesFor = (cat) => {
  if (cat === 'Giày dép') return SIZE_SETS.shoes;
  if (cat === 'Phụ kiện') return SIZE_SETS.accessories;
  return SIZE_SETS.clothing;
};

/** % giảm giá làm tròn, luôn khớp cặp price/oldPrice. */
const discountOf = (price, oldPrice) =>
  oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;

/* ------------------------------------------------------------------ */
/* Dữ liệu sản phẩm thô                                                */
/* slug/discount/sizes được suy ra ở bước dựng bên dưới.               */
/* ------------------------------------------------------------------ */

const RAW_PRODUCTS = [
  {
    id: 1,
    name: 'Áo lụa cổ V premium',
    cat: 'Thời trang nữ',
    price: 890000,
    oldPrice: 1290000,
    rating: 4.3,
    reviews: 128,
    sold: 299,
    badge: 'Sale',
    icon: 'bi-bag-heart',
    color: '#E4DAD0',
    stock: 24,
    images: [img('1571513722275-4b41940f54b8'), img('1574015974293-817f0ebebb74')],
    desc: 'Áo lụa tơ tằm dệt satin, cổ chữ V mềm mại ôm nhẹ xương quai xanh. Bề mặt vải đổ sáng tự nhiên, rủ theo dáng người mà không bám sát. Một chiếc áo nền thanh lịch, mặc với quần âu đi làm hay chân váy dạ tiệc đều hợp.',
    material: 'Lụa tơ tằm 92%, spandex 8%',
    origin: 'Tơ Bảo Lộc, Lâm Đồng — may tại xưởng LYRA Hà Nội',
    fit: 'Dáng suông nhẹ, tay bồng ngắn, dài ngang hông',
    care: 'Giặt tay nước lạnh, không vắt xoắn, phơi trong bóng râm, ủi mặt trái ở nhiệt độ thấp',
    colors: [
      { name: 'Kem sữa', hex: '#EDE4D8' },
      { name: 'Đen mực', hex: '#1A1A1A' },
      { name: 'Xanh rêu', hex: '#6B7358' },
    ],
    tags: ['lụa', 'áo kiểu', 'công sở', 'thanh lịch', 'cổ V'],
    createdAt: '2026-06-12',
  },
  {
    id: 2,
    name: 'Quần culotte high-waist',
    cat: 'Thời trang nữ',
    price: 650000,
    oldPrice: null,
    rating: 4.7,
    reviews: 84,
    sold: 185,
    badge: 'New',
    icon: 'bi-bag',
    color: '#D8D0C6',
    stock: 12,
    images: [img('1552902865-b72c031ac5ea'), img('1594633312681-425c7b97ccd1')],
    desc: 'Quần culotte ống rộng cạp cao, chiết ly sâu tạo nếp đứng dáng suốt ngày dài. Chất tuytsi pha viscose mát tay, ít nhăn và giữ phom rất tốt. Cạp cao 32cm giúp kéo dài chân, phối cùng áo croptop hoặc sơ mi sơ vin đều tôn dáng.',
    material: 'Viscose 70%, polyester 26%, spandex 4%',
    origin: 'Dệt tại Nam Định — may tại xưởng LYRA Hà Nội',
    fit: 'Cạp cao, ống rộng, dài chấm mắt cá',
    care: 'Giặt máy chế độ nhẹ dưới 30°C, không dùng chất tẩy, ủi hơi nước ở nhiệt độ trung bình',
    colors: [
      { name: 'Hồng phấn', hex: '#E7C7C4' },
      { name: 'Kem cát', hex: '#E3D9C8' },
      { name: 'Đen', hex: '#171717' },
    ],
    tags: ['quần', 'culotte', 'cạp cao', 'ống rộng', 'mới về'],
    createdAt: '2026-08-30',
  },
  {
    id: 3,
    name: 'Giày mule da thật',
    cat: 'Giày dép',
    price: 1290000,
    oldPrice: 1890000,
    rating: 4.5,
    reviews: 201,
    sold: 457,
    badge: 'Sale',
    icon: 'bi-star',
    color: '#CCC0B0',
    stock: 8,
    images: [img('1560343090-f0409e92791a'), img('1533867617858-e7b97e060509')],
    desc: 'Giày da mũi vuông cắt từ da bê thật, gót trụ thấp 3cm đi cả ngày vẫn nhẹ chân. Lót trong bọc da mềm, đệm êm ở lòng bàn chân và đế cao su chống trượt. Dáng bít mũi gọn gàng, hợp cả váy công sở lẫn quần âu.',
    material: 'Da bê thật, lót da mềm, đế cao su chống trượt',
    origin: 'Xưởng giày thủ công Bình Dương',
    fit: 'Ôm vừa chân, mũi vuông, gót trụ 3cm',
    care: 'Lau bằng khăn ẩm rồi để khô tự nhiên, đánh xi dưỡng da định kỳ, tránh ngâm nước',
    colors: [
      { name: 'Xanh ngọc', hex: '#2E8B84' },
      { name: 'Nâu hạt dẻ', hex: '#7B4B2A' },
      { name: 'Đen', hex: '#141414' },
    ],
    tags: ['giày', 'mule', 'da thật', 'gót trụ', 'sale'],
    createdAt: '2026-05-20',
  },
  {
    id: 4,
    name: 'Túi mini bucket da bò',
    cat: 'Phụ kiện',
    price: 1850000,
    oldPrice: null,
    rating: 4.8,
    reviews: 56,
    sold: 133,
    badge: 'Hot',
    icon: 'bi-heart',
    color: '#C9B99A',
    stock: 6,
    images: [img('1594633313593-bab3825d0caf'), img('1590874103328-eac38a683ce7')],
    desc: 'Túi bucket cỡ nhỏ may từ da bò thuộc thảo mộc, càng dùng màu càng lên đẹp. Dây rút miệng túi và quai đeo chéo điều chỉnh được, đủ chứa điện thoại, ví và son. Đường chỉ khâu tay chắc chắn, khoá kim loại mạ vàng không xỉn.',
    material: 'Da bò thuộc thảo mộc, khoá kim loại mạ vàng, lót vải canvas',
    origin: 'Xưởng đồ da thủ công LYRA, Hà Nội',
    fit: 'Kích thước 18 × 20 × 12cm, quai chéo điều chỉnh 90–125cm',
    care: 'Tránh mưa và nắng gắt, lau bụi bằng khăn khô, thoa dưỡng da 3 tháng một lần',
    colors: [
      { name: 'Nâu bò', hex: '#8A5A34' },
      { name: 'Cam đất', hex: '#C1662F' },
      { name: 'Đen', hex: '#151515' },
    ],
    tags: ['túi', 'da bò', 'bucket', 'đeo chéo', 'thủ công'],
    createdAt: '2026-07-18',
  },
  {
    id: 5,
    name: 'Blazer unstructured',
    cat: 'Thời trang nữ',
    price: 1490000,
    oldPrice: 1990000,
    rating: 4.6,
    reviews: 93,
    sold: 215,
    badge: 'Sale',
    icon: 'bi-bag-heart',
    color: '#BEB0A0',
    stock: 15,
    images: [img('1573496359142-b8d87734a5a2'), img('1539533018447-63fcce2678e3')],
    desc: 'Blazer phom mềm không độn vai, ve áo bản vừa và một hàng khuy. Chất len pha dày dặn nhưng vẫn rủ, mặc ngoài áo lụa mùa thu rất vừa vặn. Hai túi cơi chìm giữ dáng áo phẳng, tay áo dài qua cổ tay một chút theo kiểu editorial.',
    material: 'Len 62%, polyester 34%, spandex 4%',
    origin: 'Vải nhập Hàn Quốc — may tại xưởng LYRA Hà Nội',
    fit: 'Dáng suông vừa, không độn vai, dài ngang hông',
    care: 'Giặt khô là tốt nhất, treo móc gỗ để giữ phom, ủi hơi nước qua khăn lót',
    colors: [
      { name: 'Camel', hex: '#C8A97E' },
      { name: 'Ghi khói', hex: '#8A8681' },
      { name: 'Đen', hex: '#131313' },
    ],
    tags: ['blazer', 'áo khoác', 'công sở', 'len', 'thu đông'],
    createdAt: '2026-04-09',
  },
  {
    id: 6,
    name: 'Váy midi floral lụa',
    cat: 'Thời trang nữ',
    price: 780000,
    oldPrice: null,
    rating: 4.4,
    reviews: 147,
    sold: 325,
    badge: 'New',
    icon: 'bi-bag',
    color: '#D8D0C4',
    stock: 20,
    images: [img('1496747611176-843222e1e57c'), img('1515372039744-b8f02a3ae446')],
    desc: 'Váy midi dáng chữ A với hoạ tiết hoa nhỏ in trên nền lụa satin. Thân váy có chun sau lưng nên vừa vặn nhiều dáng người, chân váy xoè nhẹ đến bắp chân. Đi kèm lót lụa mỏng bên trong, không lộ và không bám da.',
    material: 'Lụa satin in hoa 100%, lót lụa mỏng',
    origin: 'In và may tại xưởng LYRA Hà Nội',
    fit: 'Dáng chữ A, chun sau lưng, dài 112cm',
    care: 'Giặt tay nước lạnh với xà phòng trung tính, không ngâm, ủi mặt trái nhiệt độ thấp',
    colors: [
      { name: 'Hoa nền kem', hex: '#E8DCC8' },
      { name: 'Hoa nền xanh', hex: '#6F8394' },
      { name: 'Hoa nền đen', hex: '#20201E' },
    ],
    tags: ['váy', 'midi', 'hoa nhí', 'lụa', 'mới về'],
    createdAt: '2026-08-23',
  },
  {
    id: 7,
    name: 'Sneaker leather trắng',
    cat: 'Giày dép',
    price: 1150000,
    oldPrice: 1450000,
    rating: 4.2,
    reviews: 312,
    sold: 711,
    badge: 'Sale',
    icon: 'bi-star',
    color: '#E8E0D5',
    stock: 30,
    images: [img('1544441893-675973e31985')],
    desc: 'Sneaker trắng trơn làm từ da nappa mịn, ít nếp gấp và dễ lau sạch. Đế cao su lưu hoá dày 3cm, êm chân khi đi bộ nhiều và bám tốt trên mặt sàn trơn. Kiểu dáng tối giản không logo, hợp cả quần jean lẫn váy midi.',
    material: 'Da bò nappa, lót vải cotton, đế cao su lưu hoá',
    origin: 'Xưởng giày Bình Dương',
    fit: 'Form chuẩn, chân bè nên lấy tăng nửa size',
    care: 'Lau vết bẩn bằng khăn ẩm và xà phòng nhẹ, không giặt máy, nhét giấy giữ phom khi cất',
    colors: [
      { name: 'Trắng ngà', hex: '#F2EDE4' },
      { name: 'Trắng viền camel', hex: '#D8C4A4' },
      { name: 'Xám nhạt', hex: '#B9B7B2' },
    ],
    tags: ['giày', 'sneaker', 'da thật', 'trắng', 'tối giản'],
    createdAt: '2026-07-02',
  },
  {
    id: 8,
    name: 'Áo sơ mi cotton oversize',
    cat: 'Thời trang nam',
    price: 590000,
    oldPrice: null,
    rating: 4.5,
    reviews: 178,
    sold: 405,
    badge: 'New',
    icon: 'bi-person',
    color: '#D4CCB8',
    stock: 18,
    images: [img('1596755094514-f87e34085b2c'), img('1602810318383-e386cc2a3ccf')],
    desc: 'Sơ mi dáng oversize may từ cotton chambray dệt thoi, càng giặt càng mềm. Vai xuôi thả rộng, thân áo dài nên mặc buông ngoài quần vẫn gọn. Túi ngực đắp và cúc trai thật là hai chi tiết nhỏ làm nên chất mộc của chiếc áo.',
    material: 'Cotton chambray 100%, cúc trai thật',
    origin: 'Vải dệt tại Thái Bình — may tại xưởng LYRA Hà Nội',
    fit: 'Oversize, vai xuôi, thân dài — người thích ôm nên lấy nhỏ một size',
    care: 'Giặt máy dưới 40°C, lộn trái khi giặt, ủi ẩm ở nhiệt độ trung bình',
    colors: [
      { name: 'Xanh chambray', hex: '#6E86A0' },
      { name: 'Trắng ngà', hex: '#F0EBE0' },
      { name: 'Be cát', hex: '#D6C6AC' },
    ],
    tags: ['sơ mi', 'nam', 'cotton', 'oversize', 'mới về'],
    createdAt: '2026-08-25',
  },
  {
    id: 9,
    name: 'Quần jean slim fit',
    cat: 'Thời trang nam',
    price: 820000,
    oldPrice: 1100000,
    rating: 4.3,
    reviews: 265,
    sold: 603,
    badge: 'Sale',
    icon: 'bi-bag',
    color: '#B8C4CC',
    stock: 22,
    images: [img('1604176354204-9268737828e4'), img('1638247025967-b4e38f787b76')],
    desc: 'Quần jean slim fit dệt từ denim cotton có pha chút spandex nên co giãn nhẹ theo bước chân. Ống thuôn vừa, không bó gối, giữ phom sau nhiều lần giặt. Wash xanh trung tính dễ phối áo thun trắng hay sơ mi đều được.',
    material: 'Cotton 98%, spandex 2% — denim 12oz',
    origin: 'Denim nhập Nhật Bản — may tại xưởng LYRA Hà Nội',
    fit: 'Slim fit, cạp vừa, ống 16cm',
    care: 'Lộn trái khi giặt, giặt riêng vài lần đầu để tránh phai, phơi ngược trong bóng râm',
    colors: [
      { name: 'Xanh indigo', hex: '#3B4E66' },
      { name: 'Xanh wash nhạt', hex: '#8FA3B8' },
      { name: 'Đen than', hex: '#232326' },
    ],
    tags: ['quần', 'jean', 'nam', 'slim fit', 'denim'],
    createdAt: '2026-03-15',
  },
  {
    id: 10,
    name: 'Sandal gót thấp da lộn',
    cat: 'Giày dép',
    price: 680000,
    oldPrice: null,
    rating: 4.6,
    reviews: 89,
    sold: 201,
    badge: 'New',
    icon: 'bi-star',
    color: '#C8BEB0',
    stock: 10,
    images: [img('1562273138-f46be4ebdf33'), img('1519415943484-9fa1873496d4')],
    desc: 'Sandal quai ngang bản to bọc da lộn, gót vuông 3cm đi cả ngày không mỏi. Quai hậu có khoá cài điều chỉnh, ôm cổ chân chắc mà không hằn. Chất da lộn mềm nên gần như không cần thời gian làm quen chân.',
    material: 'Da lộn thật, lót da mềm, đế cao su',
    origin: 'Xưởng giày thủ công Bình Dương',
    fit: 'Form chuẩn, gót vuông 3cm, quai hậu điều chỉnh',
    care: 'Chải bằng bàn chải lông mềm theo một chiều, xịt chống thấm trước khi dùng, tránh nước',
    colors: [
      { name: 'Nâu cà phê', hex: '#7A5236' },
      { name: 'Be cát', hex: '#CDB89A' },
      { name: 'Đen', hex: '#171717' },
    ],
    tags: ['sandal', 'da lộn', 'gót thấp', 'mới về'],
    createdAt: '2026-08-28',
  },
  {
    id: 11,
    name: 'Áo khoác denim',
    cat: 'Thời trang nam',
    price: 950000,
    oldPrice: 1350000,
    rating: 4.4,
    reviews: 134,
    sold: 303,
    badge: 'Sale',
    icon: 'bi-bag-heart',
    color: '#A8B8C0',
    stock: 7,
    images: [img('1611312449408-fcece27cdbb7'), img('1516257984-b1b4d707412e')],
    desc: 'Áo khoác denim cotton nguyên chất, wash nhẹ để giữ màu xanh sâu. Phom trucker cổ điển với hai túi ngực có nắp và cúc đồng dập chìm. Dày vừa đủ cho tiết trời chuyển mùa, mặc chồng lên áo thun hoặc hoodie đều thoải mái.',
    material: 'Denim cotton 100%, cúc đồng thau',
    origin: 'Denim dệt tại Nam Định — may tại xưởng LYRA Hà Nội',
    fit: 'Phom trucker vừa vặn, dài ngang hông',
    care: 'Giặt máy nước lạnh, lộn trái, không dùng chất tẩy, phơi trong bóng râm',
    colors: [
      { name: 'Xanh denim', hex: '#4A6382' },
      { name: 'Xanh nhạt wash', hex: '#93A9BC' },
      { name: 'Đen wash', hex: '#2A2C2F' },
    ],
    tags: ['áo khoác', 'denim', 'nam', 'trucker', 'sale'],
    createdAt: '2026-02-21',
  },
  {
    id: 12,
    name: 'Ví da nhỏ card holder',
    cat: 'Phụ kiện',
    price: 420000,
    oldPrice: null,
    rating: 4.7,
    reviews: 207,
    sold: 475,
    badge: 'Hot',
    icon: 'bi-heart',
    color: '#C0B4A4',
    stock: 35,
    images: [img('1627123424574-724758594e93')],
    desc: 'Ví đựng thẻ gập đôi làm từ da bò saffiano vân chống xước. Sáu ngăn thẻ và một ngăn giữa cho tiền mặt, mỏng vừa đủ để bỏ túi quần sau. Cạnh ví được mài và sơn tay từng lớp nên không bị bong sau thời gian dùng.',
    material: 'Da bò saffiano, chỉ khâu sáp, cạnh sơn thủ công',
    origin: 'Xưởng đồ da thủ công LYRA, Hà Nội',
    fit: 'Kích thước 10,5 × 7,5cm — 6 ngăn thẻ, 1 ngăn tiền',
    care: 'Lau bằng khăn khô, tránh để cạnh vật sắc nhọn, không nhét quá 12 thẻ',
    colors: [
      { name: 'Nâu hạt dẻ', hex: '#7A4A2C' },
      { name: 'Đen', hex: '#151515' },
      { name: 'Xanh navy', hex: '#2B3A55' },
    ],
    tags: ['ví', 'da bò', 'card holder', 'quà tặng', 'nhỏ gọn'],
    createdAt: '2026-08-01',
  },
  {
    id: 13,
    name: 'Đầm wrap dress chiffon',
    cat: 'Thời trang nữ',
    price: 1120000,
    oldPrice: 1580000,
    rating: 4.5,
    reviews: 76,
    sold: 171,
    badge: 'Sale',
    icon: 'bi-bag-heart',
    color: '#D4C8B8',
    stock: 9,
    images: [img('1595777457583-95e059d581b8'), img('1572804013309-59a88b7e92f1')],
    desc: 'Đầm quấn cổ chữ V với dây thắt eo, tôn vòng hai mà vẫn thoải mái khi ngồi lâu. Chiffon cao cấp bay nhẹ theo bước đi, tay lỡ có bo nhẹ ở cổ tay. Lót lụa bên trong nên không cần mặc thêm váy chống lộ.',
    material: 'Chiffon polyester cao cấp, lót lụa',
    origin: 'Vải nhập Hàn Quốc — may tại xưởng LYRA Hà Nội',
    fit: 'Dáng quấn, thắt eo, dài qua gối 8cm',
    care: 'Giặt tay hoặc túi lưới ở chế độ nhẹ, không vắt, ủi hơi nước ở nhiệt độ thấp nhất',
    colors: [
      { name: 'Đỏ rượu vang', hex: '#8E2436' },
      { name: 'Kem sữa', hex: '#EBE0CE' },
      { name: 'Xanh rêu', hex: '#5E6A52' },
    ],
    tags: ['đầm', 'wrap dress', 'chiffon', 'dự tiệc', 'sale'],
    createdAt: '2026-06-27',
  },
  {
    id: 14,
    name: 'Boot ankle da thật',
    cat: 'Giày dép',
    price: 1680000,
    oldPrice: null,
    rating: 4.9,
    reviews: 42,
    sold: 97,
    badge: 'New',
    icon: 'bi-star',
    color: '#B4A898',
    stock: 5,
    images: [img('1608256246200-53e635b5b65f'), img('1520639888713-7851133b1ed0')],
    desc: 'Ankle boot cổ ngắn cắt từ da bò full-grain một mảnh, ít đường nối nên form rất gọn. Khoá kéo bên trong giúp xỏ chân nhanh, gót 4cm và đế TPR chống trơn cho ngày mưa. Da dày dặn, dùng lâu sẽ lên patina đặc trưng.',
    material: 'Da bò full-grain, lót da lộn, đế TPR chống trượt',
    origin: 'Xưởng giày thủ công Bình Dương',
    fit: 'Cổ boot cao 12cm, gót 4cm, ôm vừa cổ chân',
    care: 'Đánh xi dưỡng mỗi tháng, dùng cây giữ phom khi cất, lau khô ngay nếu dính nước mưa',
    colors: [
      { name: 'Nâu hạt dẻ', hex: '#6F452A' },
      { name: 'Đen', hex: '#141414' },
    ],
    tags: ['boot', 'da thật', 'thu đông', 'mới về'],
    createdAt: '2026-09-01',
  },
  {
    id: 15,
    name: 'Áo polo cotton pima',
    cat: 'Thời trang nam',
    price: 490000,
    oldPrice: 690000,
    rating: 4.3,
    reviews: 156,
    sold: 353,
    badge: 'Sale',
    icon: 'bi-person',
    color: '#C4D0C8',
    stock: 28,
    images: [img('1586363104862-3a5e2ab60d99')],
    desc: 'Áo polo dệt từ cotton Pima sợi dài, bề mặt mịn và gần như không xù sau nhiều lần giặt. Cổ bo dệt riêng nên giữ phom đứng, không cong vênh. Dáng regular vừa người, mặc đi làm hay đi chơi cuối tuần đều ổn.',
    material: 'Cotton Pima 100%, cổ bo dệt kim',
    origin: 'Sợi Pima nhập Peru — dệt và may tại Việt Nam',
    fit: 'Regular fit, dài tay ngắn ngang bắp tay',
    care: 'Giặt máy dưới 30°C, không sấy nóng, ủi nhiệt độ trung bình tránh phần cổ bo',
    colors: [
      { name: 'Xanh bạc hà', hex: '#A8C6B4' },
      { name: 'Cam san hô', hex: '#E0765C' },
      { name: 'Trắng ngà', hex: '#F1ECE2' },
      { name: 'Xanh navy', hex: '#2C3A52' },
    ],
    tags: ['polo', 'nam', 'cotton pima', 'basic', 'sale'],
    createdAt: '2026-05-05',
  },
  {
    id: 16,
    name: 'Belt da bò handmade',
    cat: 'Phụ kiện',
    price: 320000,
    oldPrice: null,
    rating: 4.6,
    reviews: 98,
    sold: 223,
    badge: 'Hot',
    icon: 'bi-heart',
    color: '#C8B89A',
    stock: 40,
    images: [img('1624222247344-550fb60583dc')],
    desc: 'Thắt lưng cắt tay từ một dải da bò thuộc thảo mộc dày 3,5mm, không ghép lớp. Khoá đồng thau nguyên khối, càng dùng càng lên nước bóng ấm. Bản 3,5cm hợp cả quần jean lẫn quần âu, năm lỗ để chỉnh theo vòng eo.',
    material: 'Da bò thuộc thảo mộc dày 3,5mm, khoá đồng thau',
    origin: 'Xưởng đồ da thủ công LYRA, Hà Nội',
    fit: 'Bản rộng 3,5cm, dài 115cm, 5 lỗ cách nhau 2,5cm',
    care: 'Tránh nước và nhiệt cao, lau bụi bằng khăn khô, thoa sáp dưỡng da 3 tháng một lần',
    colors: [
      { name: 'Nâu bò', hex: '#8B5A2B' },
      { name: 'Nâu đậm', hex: '#4E3222' },
      { name: 'Đen', hex: '#171717' },
    ],
    tags: ['thắt lưng', 'da bò', 'thủ công', 'phụ kiện nam'],
    createdAt: '2026-01-28',
  },
];

/**
 * PRODUCTS — mảng sản phẩm đã chuẩn hoá.
 * slug/discount/sizes/brand được suy ra để luôn nhất quán với dữ liệu gốc.
 */
export const PRODUCTS = RAW_PRODUCTS.map((p) => ({
  ...p,
  brand: 'LYRA',
  slug: slugify(p.name),
  discount: discountOf(p.price, p.oldPrice),
  sizes: sizesFor(p.cat),
}));

/* ------------------------------------------------------------------ */
/* Danh mục — count ĐẾM THẬT từ PRODUCTS                               */
/* ------------------------------------------------------------------ */

const CATEGORY_META = [
  {
    id: 1,
    name: 'Thời trang nữ',
    icon: 'bi-bag-heart',
    color: '#C9B99A',
    imageId: '1512436991641-6745cdb1723f',
    blurb: 'Áo lụa, blazer phom mềm và những chiếc váy midi cho mùa thu Hà Nội.',
  },
  {
    id: 2,
    name: 'Thời trang nam',
    icon: 'bi-person',
    color: '#A8B8C0',
    imageId: '1507679799987-c73779587ccf',
    blurb: 'Sơ mi cotton, denim và polo Pima — những món cơ bản làm nền cho cả tủ đồ.',
  },
  {
    id: 3,
    name: 'Giày dép',
    icon: 'bi-star',
    color: '#8B7860',
    imageId: '1519415943484-9fa1873496d4',
    blurb: 'Da thật, đóng thủ công tại Bình Dương, form ôm chân người Việt.',
  },
  {
    id: 4,
    name: 'Phụ kiện',
    icon: 'bi-heart',
    color: '#B4A898',
    imageId: '1492707892479-7bc8d5a4ee93',
    blurb: 'Túi, ví và thắt lưng da bò thuộc thảo mộc — càng dùng càng đẹp.',
  },
];

export const CATEGORIES = CATEGORY_META.map((c) => ({
  id: c.id,
  name: c.name,
  slug: slugify(c.name),
  count: PRODUCTS.filter((p) => p.cat === c.name).length,
  icon: c.icon,
  color: c.color,
  image: img(c.imageId, 1600),
  blurb: c.blurb,
}));

/* ------------------------------------------------------------------ */
/* Mã giảm giá                                                         */
/* ------------------------------------------------------------------ */

export const COUPONS = {
  LYRA10: { type: 'percent', value: 10, label: 'Giảm 10% toàn bộ đơn hàng', min: 0 },
  LYRA20: { type: 'percent', value: 20, label: 'Giảm 20% cho đơn từ 1.000.000đ', min: 1000000 },
  FREESHIP: { type: 'shipping', value: 0, label: 'Miễn phí vận chuyển', min: 0 },
  SAVE100K: { type: 'fixed', value: 100000, label: 'Giảm 100.000đ cho đơn từ 800.000đ', min: 800000 },
};

/* ------------------------------------------------------------------ */
/* Đơn hàng mock — cùng shape với đơn do placeOrder() sinh ra           */
/* ------------------------------------------------------------------ */

/** Dựng timeline 5 bước; `doneCount` bước đầu được đánh dấu hoàn thành. */
const timeline = (steps, doneCount) =>
  steps.map((s, i) => ({ label: s.label, note: s.note, date: s.date, done: i < doneCount }));

const TIMELINE_LABELS = [
  'Đặt hàng thành công',
  'Đã xác nhận',
  'Đang đóng gói',
  'Đang giao hàng',
  'Đã giao hàng',
];

export const ORDERS_MOCK = [
  {
    id: '#LY260001',
    createdAt: '2026-07-12T09:24:00+07:00',
    status: 'delivered',
    items: [
      { productId: 1, qty: 1, size: 'M', variantColor: 'Kem sữa' },
      { productId: 3, qty: 1, size: '38', variantColor: 'Nâu hạt dẻ' },
    ],
    address: {
      fullName: 'Nguyễn Thu Hà',
      phone: '0912345678',
      email: 'thuha.nguyen@gmail.com',
      street: '45 Ngõ 12 Nguyễn Chí Thanh',
      district: 'Đống Đa',
      city: 'Hà Nội',
    },
    payment: 'cod',
    note: 'Giao giờ hành chính, gọi trước khi tới.',
    couponCode: null,
    subtotal: 2180000, // 890.000 + 1.290.000
    shipping: 0, // vượt ngưỡng miễn phí 500.000đ
    discount: 0,
    total: 2180000,
    timeline: timeline(
      [
        { label: TIMELINE_LABELS[0], note: 'Đơn hàng được tạo trên website LYRA', date: '2026-07-12T09:24:00+07:00' },
        { label: TIMELINE_LABELS[1], note: 'LYRA đã xác nhận đơn qua điện thoại', date: '2026-07-12T14:05:00+07:00' },
        { label: TIMELINE_LABELS[2], note: 'Kho Hà Nội đóng gói và dán tem niêm phong', date: '2026-07-13T08:40:00+07:00' },
        { label: TIMELINE_LABELS[3], note: 'Bàn giao đơn vị vận chuyển', date: '2026-07-13T16:20:00+07:00' },
        { label: TIMELINE_LABELS[4], note: 'Giao thành công, người nhận ký nhận', date: '2026-07-15T10:12:00+07:00' },
      ],
      5,
    ),
  },
  {
    id: '#LY260002',
    createdAt: '2026-08-06T20:47:00+07:00',
    status: 'shipping',
    items: [
      { productId: 5, qty: 1, size: 'L', variantColor: 'Camel' },
      { productId: 8, qty: 2, size: 'M', variantColor: 'Trắng ngà' },
    ],
    address: {
      fullName: 'Trần Minh Quân',
      phone: '0938112233',
      email: 'quantran.mn@gmail.com',
      street: '210 Điện Biên Phủ, Phường 15',
      district: 'Bình Thạnh',
      city: 'TP. Hồ Chí Minh',
    },
    payment: 'banking',
    note: '',
    couponCode: 'LYRA10',
    subtotal: 2670000, // 1.490.000 + 2 × 590.000
    shipping: 0,
    discount: 267000, // LYRA10 = 10%
    total: 2403000,
    timeline: timeline(
      [
        { label: TIMELINE_LABELS[0], note: 'Đơn hàng được tạo trên website LYRA', date: '2026-08-06T20:47:00+07:00' },
        { label: TIMELINE_LABELS[1], note: 'Đã nhận thanh toán chuyển khoản', date: '2026-08-07T08:15:00+07:00' },
        { label: TIMELINE_LABELS[2], note: 'Kho Hà Nội đóng gói', date: '2026-08-07T15:30:00+07:00' },
        { label: TIMELINE_LABELS[3], note: 'Đang trên đường tới TP. Hồ Chí Minh', date: '2026-08-08T09:00:00+07:00' },
        { label: TIMELINE_LABELS[4], note: 'Dự kiến giao trong 1–2 ngày tới', date: null },
      ],
      4,
    ),
  },
  {
    id: '#LY260003',
    createdAt: '2026-08-28T11:03:00+07:00',
    status: 'processing',
    items: [{ productId: 12, qty: 1, size: 'Free size', variantColor: 'Nâu hạt dẻ' }],
    address: {
      fullName: 'Lê Bảo Ngọc',
      phone: '0905667788',
      email: 'baongoc.le@gmail.com',
      street: '88 Nguyễn Văn Linh',
      district: 'Hải Châu',
      city: 'Đà Nẵng',
    },
    payment: 'cod',
    note: 'Gói quà tặng giúp mình nhé.',
    couponCode: null,
    subtotal: 420000,
    shipping: 30000, // dưới ngưỡng 500.000đ
    discount: 0,
    total: 450000,
    timeline: timeline(
      [
        { label: TIMELINE_LABELS[0], note: 'Đơn hàng được tạo trên website LYRA', date: '2026-08-28T11:03:00+07:00' },
        { label: TIMELINE_LABELS[1], note: 'Đang chờ LYRA xác nhận', date: null },
        { label: TIMELINE_LABELS[2], note: 'Chuẩn bị hàng tại kho Hà Nội', date: null },
        { label: TIMELINE_LABELS[3], note: 'Bàn giao đơn vị vận chuyển', date: null },
        { label: TIMELINE_LABELS[4], note: 'Giao tới địa chỉ nhận', date: null },
      ],
      1,
    ),
  },
];

/* ------------------------------------------------------------------ */
/* Đánh giá mock — ít nhất 3 đánh giá tiếng Việt cho mỗi sản phẩm       */
/* ------------------------------------------------------------------ */

export const REVIEWS_MOCK = {
  1: [
    { name: 'Nguyễn Thu Hà', date: '2026-07-18', rating: 5, text: 'Lụa mát và rủ đúng như mô tả, mặc đi làm cả ngày không thấy bí. Cổ V vừa phải, không hở quá.' },
    { name: 'Phạm Khánh Linh', date: '2026-07-02', rating: 4, text: 'Màu kem sữa lên da rất sáng. Trừ nửa sao vì lụa dễ nhăn, phải ủi lại mỗi lần giặt.' },
    { name: 'Đỗ Minh Châu', date: '2026-06-24', rating: 4, text: 'Mình cao 1m60 nặng 50kg lấy size S vừa đẹp. Phối với quần âu đi họp rất chỉn chu.' },
    { name: 'Vũ Hoài An', date: '2026-08-11', rating: 5, text: 'Đặt thêm chiếc thứ hai màu đen mực. Đường may sạch, không có chỉ thừa.' },
  ],
  2: [
    { name: 'Trịnh Bảo Trâm', date: '2026-09-01', rating: 5, text: 'Cạp cao đúng chuẩn, che được bụng mà vẫn thoải mái khi ngồi lâu. Nếp ly giữ rất đứng.' },
    { name: 'Lê Ngọc Ánh', date: '2026-08-31', rating: 5, text: 'Vải mát tay, mặc trời Hà Nội cuối hè vẫn ổn. Màu hồng phấn nhã hơn trong ảnh.' },
    { name: 'Nguyễn Phương Thảo', date: '2026-09-02', rating: 4, text: 'Ống hơi dài với người 1m55, mình phải lên gấu 3cm. Ngoài ra thì rất ưng.' },
  ],
  3: [
    { name: 'Hoàng Diệu Linh', date: '2026-06-08', rating: 5, text: 'Da bê mềm, đi hai hôm là ôm chân luôn, không bị cấn gót. Gót 5cm đứng vững.' },
    { name: 'Bùi Thanh Vân', date: '2026-07-21', rating: 4, text: 'Màu xanh ngọc đẹp và lạ. Vì là mule không quai hậu nên đi nhanh hơi tuột, cần quen chân.' },
    { name: 'Đặng Mỹ Hạnh', date: '2026-08-03', rating: 5, text: 'Mua đúng đợt sale, giá này cho da thật là quá hợp lý. Đế cao su bám tốt trên sàn gạch.' },
    { name: 'Trần Kim Ngân', date: '2026-05-29', rating: 4, text: 'Chân mình 24cm lấy size 38 vừa khít. Hộp và túi bụi đóng gói cẩn thận.' },
  ],
  4: [
    { name: 'Nguyễn Hà My', date: '2026-08-02', rating: 5, text: 'Da bò thật, ngửi có mùi da mộc chứ không hắc mùi keo. Dùng một tháng đã bắt đầu lên màu đẹp.' },
    { name: 'Lý Thu Trang', date: '2026-07-29', rating: 5, text: 'Nhỏ mà đựng đủ điện thoại, ví, son và chìa khoá. Dây rút chắc chắn, khoá không bị xỉn.' },
    { name: 'Phan Quỳnh Như', date: '2026-08-20', rating: 4, text: 'Túi đẹp nhưng quai chéo hơi cứng lúc mới, dùng vài hôm mới mềm ra.' },
  ],
  5: [
    { name: 'Nguyễn Khánh Chi', date: '2026-05-14', rating: 5, text: 'Blazer không độn vai nên mặc rất nhẹ nhàng, không bị cứng như blazer công sở thường thấy.' },
    { name: 'Trần Hải Yến', date: '2026-06-30', rating: 5, text: 'Màu camel chuẩn ảnh, khoác ngoài áo lụa mùa thu là hết bài. Túi cơi chìm giữ dáng áo phẳng.' },
    { name: 'Mai Thuỳ Dương', date: '2026-07-25', rating: 4, text: 'Chất len dày dặn, hơi nóng nếu mặc giữa trưa. Nên để dành cho tháng 10 trở đi.' },
    { name: 'Lâm Ngọc Bích', date: '2026-08-15', rating: 5, text: 'Tay áo dài qua cổ tay chút xíu nhìn rất editorial, mình thích chi tiết này.' },
  ],
  6: [
    { name: 'Đỗ Lan Anh', date: '2026-08-27', rating: 5, text: 'Hoa nhí in sắc nét, nền lụa satin bóng nhẹ chứ không bóng loáng. Có lót sẵn nên rất tiện.' },
    { name: 'Nguyễn Thanh Tâm', date: '2026-08-29', rating: 4, text: 'Chun sau lưng nên mình mặc thoải mái cả lúc no bụng. Váy hơi dài với người thấp.' },
    { name: 'Vương Hồng Nhung', date: '2026-09-01', rating: 5, text: 'Đi ăn cưới mặc chiếc này được khen suốt. Chân váy xoè vừa đủ, không phồng.' },
  ],
  7: [
    { name: 'Trần Quốc Bảo', date: '2026-07-19', rating: 4, text: 'Da nappa mịn, lau vết bẩn bằng khăn ẩm là sạch. Đế êm, mình đi bộ 10km vẫn ổn.' },
    { name: 'Nguyễn Việt Anh', date: '2026-08-05', rating: 4, text: 'Chân bè nên mình lấy tăng nửa size như tư vấn, vừa đẹp. Không logo nên dễ phối đồ.' },
    { name: 'Hồ Gia Huy', date: '2026-08-22', rating: 5, text: 'Đôi trắng trơn hiếm khi tìm được form gọn thế này. Đế lưu hoá nhìn chắc chắn.' },
    { name: 'Lê Anh Tuấn', date: '2026-07-30', rating: 4, text: 'Giày tốt, chỉ tiếc phần lót cotton hơi mỏng, mình thay thêm miếng lót êm hơn.' },
  ],
  8: [
    { name: 'Phạm Đức Duy', date: '2026-08-28', rating: 5, text: 'Chambray dày dặn mà vẫn thoáng, giặt hai lần là mềm hẳn. Cúc trai thật nhìn rất sang.' },
    { name: 'Nguyễn Trung Kiên', date: '2026-08-30', rating: 4, text: 'Form oversize khá rộng, mình 1m72 65kg lấy size M là vừa đủ buông ngoài quần.' },
    { name: 'Đinh Hoàng Long', date: '2026-09-02', rating: 5, text: 'Màu xanh chambray dễ phối, mặc đi làm hay đi cà phê đều hợp. Túi ngực đắp chắc chỉ.' },
  ],
  9: [
    { name: 'Vũ Thành Nam', date: '2026-04-12', rating: 4, text: 'Denim 12oz dày vừa, có spandex nên ngồi lâu không bị gò. Ống thuôn chuẩn slim.' },
    { name: 'Nguyễn Hữu Thắng', date: '2026-06-18', rating: 4, text: 'Wash xanh indigo đẹp, hai lần giặt đầu ra màu nhẹ như hướng dẫn nên nhớ giặt riêng.' },
    { name: 'Trần Đăng Khoa', date: '2026-07-27', rating: 5, text: 'Mặc gần nửa năm chưa bị giãn gối. Đường may kép ở đũng rất chắc.' },
    { name: 'Bùi Xuân Hưng', date: '2026-08-14', rating: 3, text: 'Quần ổn nhưng cạp hơi thấp so với mình. Nên có thêm bản cạp cao.' },
  ],
  10: [
    { name: 'Nguyễn Ngọc Mai', date: '2026-08-31', rating: 5, text: 'Da lộn mềm nên đi lần đầu đã không cấn chân. Gót vuông 3cm đi cả ngày không mỏi.' },
    { name: 'Trương Bích Ngọc', date: '2026-09-01', rating: 5, text: 'Quai hậu có khoá điều chỉnh nên ôm cổ chân vừa vặn, không bị tuột như sandal khác.' },
    { name: 'Lê Thảo Nguyên', date: '2026-09-02', rating: 4, text: 'Da lộn đẹp nhưng phải xịt chống thấm trước, dính nước một chút là loang.' },
  ],
  11: [
    { name: 'Nguyễn Minh Đức', date: '2026-03-19', rating: 4, text: 'Phom trucker cổ điển, dày vừa đủ cho mùa chuyển. Cúc đồng dập chìm nhìn tinh tế.' },
    { name: 'Phạm Tuấn Vũ', date: '2026-05-23', rating: 5, text: 'Denim cotton 100% nên lúc mới hơi cứng, mặc một tuần là mềm và ôm dáng.' },
    { name: 'Ngô Hải Đăng', date: '2026-07-08', rating: 4, text: 'Mặc chồng lên hoodie vẫn thoải mái. Giá sale này rất đáng.' },
  ],
  12: [
    { name: 'Nguyễn Đức Anh', date: '2026-08-09', rating: 5, text: 'Saffiano chống xước tốt, để chung túi quần với chìa khoá cả tháng vẫn như mới.' },
    { name: 'Trần Thị Hồng', date: '2026-08-18', rating: 5, text: 'Mua tặng chồng, cạnh ví sơn tay rất mịn. Sáu ngăn thẻ đủ dùng, ví mỏng không cộm túi.' },
    { name: 'Lê Quang Vinh', date: '2026-08-26', rating: 4, text: 'Ngăn tiền hơi khít nếu gập tờ 500k, nhưng bù lại ví rất gọn.' },
    { name: 'Hoàng Thu Hường', date: '2026-09-01', rating: 5, text: 'Đóng hộp đẹp, tặng sinh nhật rất hợp. Màu nâu hạt dẻ lên ảnh đúng thật.' },
  ],
  13: [
    { name: 'Nguyễn Diệu Thuý', date: '2026-07-14', rating: 5, text: 'Dáng quấn thắt eo tôn vòng hai thật sự. Có lót lụa nên không cần mặc thêm váy chống lộ.' },
    { name: 'Cao Ngọc Huyền', date: '2026-08-01', rating: 4, text: 'Chiffon bay đẹp khi đi lại. Dây thắt cần buộc kỹ không sẽ lỏng dần trong ngày.' },
    { name: 'Phùng Mai Chi', date: '2026-08-19', rating: 5, text: 'Màu đỏ rượu vang sang, chụp ảnh cưới bạn mặc rất hợp. Tay lỡ bo nhẹ rất duyên.' },
  ],
  14: [
    { name: 'Nguyễn Hoài Thu', date: '2026-09-02', rating: 5, text: 'Da full-grain một mảnh nên form cực gọn, gần như không thấy đường nối. Đáng tiền.' },
    { name: 'Đào Thanh Bình', date: '2026-09-03', rating: 5, text: 'Có khoá kéo bên trong nên xỏ chân nhanh. Đế TPR bám tốt, hôm mưa đi vẫn yên tâm.' },
    { name: 'Lưu Khánh Hoà', date: '2026-09-03', rating: 5, text: 'Cổ boot 12cm vừa đẹp với quần jean ống đứng. Chỉ còn ít hàng nên mình đặt luôn.' },
  ],
  15: [
    { name: 'Trần Anh Quân', date: '2026-05-28', rating: 4, text: 'Cotton Pima mịn thật, mặc mát và không xù sau nhiều lần giặt. Cổ bo vẫn đứng.' },
    { name: 'Nguyễn Bá Lộc', date: '2026-07-06', rating: 4, text: 'Dáng regular vừa người, không rộng thùng thình. Màu xanh bạc hà nhẹ nhàng.' },
    { name: 'Phạm Gia Bảo', date: '2026-08-12', rating: 5, text: 'Mua hai chiếc màu trắng ngà và navy để đi làm. Giá sale rất tốt cho chất vải này.' },
    { name: 'Vũ Đình Nghĩa', date: '2026-08-24', rating: 3, text: 'Áo ổn nhưng tay hơi ngắn với người tay dài. Chất vải thì không chê được.' },
  ],
  16: [
    { name: 'Nguyễn Văn Toàn', date: '2026-02-16', rating: 5, text: 'Da dày 3,5mm nguyên miếng, không ghép lớp nên cầm rất đầm tay. Khoá đồng nặng, chắc chắn.' },
    { name: 'Trần Bảo Sơn', date: '2026-05-11', rating: 4, text: 'Bản 3,5cm hợp cả quần jean lẫn quần âu. Năm lỗ chỉnh thoải mái cho vòng eo của mình.' },
    { name: 'Lê Hoàng Nam', date: '2026-07-23', rating: 5, text: 'Dùng nửa năm da đã lên nước bóng ấm rất đẹp, không bong tróc như thắt lưng da ép.' },
  ],
};

/* ------------------------------------------------------------------ */
/* Hàm truy vấn — luôn trả mảng/giá trị mới, không mutate dữ liệu gốc   */
/* ------------------------------------------------------------------ */

/** Tìm sản phẩm theo id (số hoặc chuỗi) hoặc slug. Trả `null` nếu không có. */
export function findProduct(idOrSlug) {
  if (idOrSlug === undefined || idOrSlug === null || idOrSlug === '') return null;
  // Cho phép truyền thẳng cả object sản phẩm.
  if (typeof idOrSlug === 'object') return findProduct(idOrSlug.slug ?? idOrSlug.id);

  const key = String(idOrSlug);
  const byId = PRODUCTS.find((p) => String(p.id) === key);
  if (byId) return byId;
  const slug = slugify(key);
  return PRODUCTS.find((p) => p.slug === slug) || null;
}

/** Lọc sản phẩm theo tên danh mục hoặc slug danh mục. Không có → trả toàn bộ. */
export function productsByCat(catOrSlug) {
  if (!catOrSlug || catOrSlug === 'all' || catOrSlug === 'Tất cả') return [...PRODUCTS];
  const key = slugify(catOrSlug);
  return PRODUCTS.filter((p) => p.cat === catOrSlug || slugify(p.cat) === key);
}

/**
 * Sản phẩm gợi ý: ưu tiên cùng danh mục, sau đó tới sản phẩm bán chạy khác.
 * Luôn trả mảng mới, không chứa chính sản phẩm đang xem.
 */
export function relatedProducts(product, n = 4) {
  const target = findProduct(product);
  if (!target) return [...PRODUCTS].slice(0, n);

  const sameCat = PRODUCTS.filter((p) => p.id !== target.id && p.cat === target.cat).sort(
    (a, b) => b.sold - a.sold,
  );
  if (sameCat.length >= n) return sameCat.slice(0, n);

  const chosen = new Set(sameCat.map((p) => p.id));
  const fillers = [...PRODUCTS]
    .filter((p) => p.id !== target.id && !chosen.has(p.id))
    .sort((a, b) => b.sold - a.sold);

  return [...sameCat, ...fillers].slice(0, n);
}

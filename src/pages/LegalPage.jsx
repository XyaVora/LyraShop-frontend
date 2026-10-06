import { Footer } from '../components/index.jsx';
import { useApp } from '../context/AppContext.jsx';
import '../styles/legal.css';

const TERMS = [
  {
    title: '1. Phạm vi áp dụng',
    body: 'Điều khoản này áp dụng cho việc tạo tài khoản, đặt hàng và sử dụng các tiện ích trên website LYRA trong môi trường thử nghiệm. Thông tin sản phẩm, giá bán và tồn kho được hiển thị theo dữ liệu tại thời điểm truy cập.',
  },
  {
    title: '2. Tài khoản khách hàng',
    body: 'Khách hàng chịu trách nhiệm cung cấp thông tin chính xác và bảo mật mật khẩu. LYRA có thể tạm khóa tài khoản khi phát hiện dấu hiệu sử dụng trái phép hoặc vi phạm quy trình đặt hàng.',
  },
  {
    title: '3. Đặt hàng và thanh toán',
    body: 'Đơn hàng chỉ được xác nhận khi hệ thống ghi nhận thành công. Trong giai đoạn thử nghiệm, thanh toán khi nhận hàng là phương thức mặc định; thanh toán VNPay chỉ xuất hiện khi cổng thanh toán đã được cấu hình.',
  },
  {
    title: '4. Giao hàng và trả hàng',
    body: 'Phí giao hàng được tính tại bước thanh toán theo chính sách đang hiển thị. Khách hàng có thể gửi yêu cầu trả hàng trong thời hạn được ghi trên đơn, kèm lý do và tối đa năm ảnh hoặc liên kết bằng chứng. Yêu cầu sẽ được quản trị viên xem xét trước khi tiếp nhận hàng.',
  },
  {
    title: '5. Hoàn tiền',
    body: 'Hoàn tiền được xử lý sau khi đơn hủy hoặc hàng trả đã được tiếp nhận và kiểm tra. Trong môi trường thử nghiệm, quản trị viên ghi nhận giao dịch sau khi đã hoàn tiền qua kênh thực tế; website không tự thực hiện chuyển tiền.',
  },
  {
    title: '6. Liên hệ',
    body: 'Nếu cần hỗ trợ về đơn hàng hoặc tài khoản, khách hàng sử dụng hotline và email được công bố ở cuối trang. Nội dung điều khoản sẽ được cập nhật trước khi website vận hành thương mại chính thức.',
  },
];

const PRIVACY = [
  {
    title: '1. Dữ liệu được thu thập',
    body: 'LYRA lưu email, họ tên, số điện thoại, địa chỉ giao hàng, lịch sử đơn hàng, wishlist, đánh giá và dữ liệu cần thiết để duy trì phiên đăng nhập. Website không lưu số thẻ đầy đủ hoặc mã bảo mật thẻ.',
  },
  {
    title: '2. Mục đích sử dụng',
    body: 'Dữ liệu được dùng để xác thực tài khoản, xử lý đơn hàng, giao hàng, hỗ trợ đổi trả, tích lũy quyền lợi thành viên và gửi bản tin khi khách hàng chủ động đăng ký.',
  },
  {
    title: '3. Cookie và phiên đăng nhập',
    body: 'Website sử dụng cookie bảo mật để duy trì phiên đăng nhập và chống giả mạo yêu cầu. Cookie xác thực không được dùng cho quảng cáo của bên thứ ba.',
  },
  {
    title: '4. Chia sẻ dữ liệu',
    body: 'Trong môi trường thử nghiệm, dữ liệu không được bán hoặc chia sẻ cho mục đích quảng cáo. Khi vận hành chính thức, chỉ những đối tác cần thiết như thanh toán, vận chuyển hoặc email mới nhận dữ liệu tối thiểu để cung cấp dịch vụ.',
  },
  {
    title: '5. Thời gian lưu và bảo vệ dữ liệu',
    body: 'Mật khẩu được lưu dưới dạng băm; token phiên đăng nhập được xoay vòng và có thời hạn. Thời gian lưu dữ liệu nghiệp vụ sẽ được công bố đầy đủ trước khi website hoạt động chính thức.',
  },
  {
    title: '6. Quyền của khách hàng',
    body: 'Khách hàng có thể cập nhật hồ sơ, địa chỉ và mật khẩu trong trang tài khoản. Chức năng yêu cầu xuất hoặc xóa toàn bộ dữ liệu sẽ được bổ sung trước giai đoạn vận hành thương mại.',
  },
];

export default function LegalPage({ type }) {
  const { navigate } = useApp();
  const privacy = type === 'privacy';
  const sections = privacy ? PRIVACY : TERMS;

  return (
    <div className="legal-page">
      <header className="legal-hero">
        <p className="legal-eyebrow">LYRA · THÔNG TIN PHÁP LÝ</p>
        <h1>{privacy ? 'Chính sách bảo mật' : 'Điều khoản dịch vụ'}</h1>
        <p>
          Phiên bản dành cho môi trường thử nghiệm nội bộ, cập nhật ngày 07/10/2026.
          Nội dung sẽ được rà soát lại trước khi website vận hành chính thức.
        </p>
      </header>

      <div className="legal-layout container">
        <nav className="legal-nav" aria-label="Tài liệu pháp lý">
          <button type="button" className={!privacy ? 'active' : ''} onClick={() => navigate('terms')}>
            Điều khoản dịch vụ
          </button>
          <button type="button" className={privacy ? 'active' : ''} onClick={() => navigate('privacy')}>
            Chính sách bảo mật
          </button>
        </nav>

        <article className="legal-content">
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
          <div className="legal-note" role="note">
            Website hiện đang ở giai đoạn thử nghiệm và chưa tiếp nhận giao dịch thương mại chính thức.
          </div>
        </article>
      </div>

      <Footer navigate={navigate} />
    </div>
  );
}

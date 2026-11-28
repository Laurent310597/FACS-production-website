// Thông tin công ty dùng cho thẻ danh thiếp số (trang /card/:slug, tệp danh bạ .vcf, ảnh QR).
// Thuần dữ liệu (không import ảnh) để vite.config.js cũng đọc được khi tạo trang chia sẻ lúc build.
export const COMPANY = {
  name: "FACS",
  url: "https://facs.vn",
  domain: "facs.vn",
  sloganVi: "Tăng trưởng của bạn bắt đầu từ đây",
  slogan: "Your Growth Starts With Us",
  descriptionVi: "Nền tảng tư vấn chiến lược về tài chính, pháp lý và vận hành dành cho doanh nghiệp hiện đại tại Việt Nam.",
  description: "Strategic financial, legal and operational consulting infrastructure for modern enterprises in Vietnam.",
  hotline: "(+84) 972 798 424",
  email: "contact@facs.vn",
  // Zalo: chat với số hotline. Khi có Zalo OA, thay bằng đường dẫn OA (ví dụ https://zalo.me/<id-OA>).
  zalo: "https://zalo.me/0972798424",
  facebook: "https://www.facebook.com/profile.php?id=61550646023438",
  linkedin: "https://www.linkedin.com/in/facs-vietnam/",
  instagram: "https://www.instagram.com/facs.company/",
  offices: [
    {
      labelVi: "Văn phòng chính",
      label: "Head Office",
      addressVi: "31/3A Nguyễn Văn Lạc, Phường 21, Quận Bình Thạnh, Thành phố Hồ Chí Minh",
      address: "31/3A Nguyen Van Lac Street, Ward 21, Binh Thanh District, Ho Chi Minh City, Vietnam",
      streetVi: "31/3A Nguyễn Văn Lạc",
      street: "31/3A Nguyen Van Lac Street",
      localityVi: "Phường 21, Quận Bình Thạnh",
      locality: "Ward 21, Binh Thanh District",
    },
    {
      labelVi: "Văn phòng chi nhánh",
      label: "Branch Office",
      addressVi: "309 Bạch Đằng, Phường 2, Quận Bình Thạnh, Thành phố Hồ Chí Minh",
      address: "309 Bach Dang Street, Ward 2, Binh Thanh District, Ho Chi Minh City, Vietnam",
      streetVi: "309 Bạch Đằng",
      street: "309 Bach Dang Street",
      localityVi: "Phường 2, Quận Bình Thạnh",
      locality: "Ward 2, Binh Thanh District",
    },
  ],
};

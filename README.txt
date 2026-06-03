VNPT THU CƯỚC PRO - WEB APP + SUPABASE DATABASE

I. BẢN NÀY CÓ GÌ?

- Đăng nhập nhân viên bằng Supabase Auth.
- Lưu khách hàng lên Supabase Database.
- Nhập trực tiếp file Excel .xlsx/.xls hoặc CSV theo mẫu VNPT.
- Đọc đúng các cột:
  Ô địa bàn
  Tên đơn vị
  Địa bàn c3
  MA_NVTC
  TENNGUOIGACH
  MA_KH
  THANHTOAN_ID
  SDT_GBC
  DIACHI_TT
  TEN_TT
  DONVIQL_ID
  TONGNO
  CHUKYNO

- Tìm kiếm khách hàng.
- Lọc theo Ô địa bàn.
- Lọc theo trạng thái thu.
- Cập nhật nhanh: Đã thu / Hẹn lại.
- Gọi điện, mở Zalo, mở Google Maps, gửi SMS.
- Xuất báo cáo CSV.
- Dữ liệu đồng bộ qua nhiều máy/điện thoại khi đăng nhập cùng tài khoản.

II. CÁCH CÀI SUPABASE

1. Vào https://supabase.com
2. Tạo New Project.
3. Vào SQL Editor.
4. Mở file supabase-schema.sql trong gói này.
5. Copy toàn bộ nội dung và bấm Run.

III. LẤY KEY CẤU HÌNH

1. Vào Project Settings > API.
2. Copy Project URL.
3. Copy anon public key.
4. Mở file config.js.
5. Dán vào:

window.SUPABASE_URL = "Project URL";
window.SUPABASE_ANON_KEY = "anon public key";

Lưu ý:
- Tuyệt đối không đưa service_role key vào config.js.
- Chỉ dùng anon public key.

IV. TẠO TÀI KHOẢN NHÂN VIÊN

Cách 1:
- Vào web app bấm Tạo tài khoản.

Cách 2 khuyên dùng:
- Vào Supabase > Authentication > Users.
- Tạo user cho từng nhân viên.
- Nếu muốn nội bộ, tắt đăng ký công khai trong Supabase Auth settings.

V. CHẠY THỬ TRÊN MÁY

1. Giải nén file zip.
2. Mở index.html bằng trình duyệt.
3. Nếu trình duyệt chặn một số chức năng, upload lên Vercel để chạy bằng HTTPS.

VI. ĐƯA LÊN VERCEL

1. Tạo repository GitHub.
2. Upload toàn bộ file trong thư mục này.
3. Vào Vercel > Add New Project.
4. Import repository.
5. Deploy.

VII. QUAN TRỌNG VỀ BẢO MẬT

- Bản này đã bật Row Level Security.
- Mỗi tài khoản chỉ thấy dữ liệu do chính tài khoản đó nhập.
- Nếu muốn cả tổ cùng dùng chung dữ liệu, cách nhanh nhất là dùng chung một tài khoản nội bộ.
- Cách chuyên nghiệp hơn là nâng cấp thêm bảng team/role để phân quyền theo tổ, địa bàn, quản lý.

VIII. FILE CHÍNH

- index.html: giao diện
- style.css: giao diện màu sắc
- app.js: xử lý đăng nhập, nhập file, lưu Supabase
- config.js: cấu hình Supabase URL/key
- supabase-schema.sql: tạo database
- manifest.json + icon.svg: hỗ trợ cài như app

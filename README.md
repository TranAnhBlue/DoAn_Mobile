# 🌾 EAPLS Mobile App - Ứng Dụng Quản Lý Nhật Ký & Kế Hoạch Canh Tác Nông Nghiệp

Ứng dụng di động **EAPLS Mobile** được phát triển bằng **React Native (Expo)** thuộc hệ thống Nông nghiệp Thông minh EAPLS. Ứng dụng hỗ trợ các vai trò chính trong trang trại bao gồm **Farm Leader (Trưởng nhóm)** và **Farm Supervisor (Giám sát viên)** thực hiện công tác quản lý kế hoạch canh tác, phân công nhân sự, ghi chép nhật ký sản xuất hàng ngày, chốt nhật ký giai đoạn và truy xuất nguồn gốc.

---

## 🚀 Tính Năng Chính

### 👨‍🌾 1. Vai trò Farm Leader (Trưởng Nhóm Sản Xuất)
* **Quản Lý Công Việc (My Tasks):**
  * Xem danh sách công việc được phân công theo từng giai đoạn và vùng trồng.
  * Lọc công việc theo trạng thái (*Tất cả, Chưa thực hiện, Đang thực hiện, Hoàn thành*).
  * Kích hoạt bắt đầu công việc.
* **Ghi Nhật Ký Hàng Ngày (Daily Log):**
  * Ghi lại chi tiết hoạt động sản xuất, mô tả công việc, vật tư sử dụng (phân bón, nông dược có tính diện tích $m^2$ và số lượng).
  * Chụp và tải ảnh minh chứng thực địa từ camera / thư viện.
  * Hỗ trợ lưu trữ và đồng bộ nhật ký ngoại tuyến (Offline Sync Queue) khi không có kết nối mạng.
  * Sắp xếp lịch sử ghi nhật ký theo thứ tự thời gian mới nhất lên đầu.

### 🕵️‍♂️ 2. Vai trò Farm Supervisor (Giám Sát Viên)
* **Quản Lý Kế Hoạch & Sổ Nhật Ký (Cultivation Logbooks):**
  * Xem danh sách kế hoạch canh tác theo từng quy trình sản xuất (Ví dụ: *Quy trình trồng Hồng Nam Đồng*, *Quy trình trồng Lúa*...).
  * Phân loại kế hoạch theo trạng thái: *Tất cả, Đang thực hiện (Xanh dương), Chờ duyệt đóng (Cam), Hoàn thành (Xanh lá)*.
  * Phân công Farm Leader và nông dân tham gia vào từng công việc.
  * Tự động ẩn nút phân công đối với các công việc đã hoàn thành hoặc đã hủy.
* **Theo Dõi Lịch Sử & Chốt Sổ Nhật Ký Giai Đoạn:**
  * Xem toàn bộ lịch sử ghi log theo từng công việc/giai đoạn (người ghi, ngày ghi, vật tư, ảnh minh chứng có hỗ trợ xem phóng to toàn màn hình).
  * **Biên soạn & Chốt sổ:** Tổng hợp bảng vật tư, ảnh thực địa, nhập mô tả văn phong chuẩn để lưu thành nhật ký chính thức của giai đoạn.
  * Phê duyệt hoặc từ chối đóng kế hoạch canh tác khi hoàn tất thu hoạch.
* **Quản Lý Vùng Trồng (Land Plots):**
  * Xem chi tiết vùng trồng: Tên vùng, Diện tích ($m^2$), Địa chỉ, Trạng thái canh tác.
  * Tích hợp theo dõi thời tiết thực thời (Nhiệt độ, độ ẩm, tốc độ gió) tại vùng trồng.
* **Quản Lý Nhân Sự / Nông Dân (Farmers Management):**
  * Danh sách Farm Leader & Nông dân trong trang trại.
  * Tính toán và hiển thị chính xác số lượng công việc đang được giao cho từng nhân sự.
  * Chi tiết thông tin nhân sự và danh sách công việc được phân công kèm trạng thái hiển thị chuẩn tiếng Việt (*Hoàn thành, Đang thực hiện, Chờ kích hoạt...*).

### 🔔 3. Tiện Ích Đã Tích Hợp
* **Hệ Thống Thông Báo (Notifications):** Theo dõi thông báo công việc, lịch trình và cập nhật từ hệ thống.
* **Truy Xuất Nguồn Gốc (Traceability):** Quét mã QR truy xuất thông tin sản phẩm và thửa đất canh tác.
* **Đồng Bộ Dữ Liệu:** Tự động đồng bộ và lưu trữ offline mượt mà.

---

## 🛠️ Công Nghệ Sử Dụng

* **Core Framework:** React Native, Expo SDK
* **Navigation:** React Navigation (Stack Navigator, Bottom Tab Navigator)
* **State Management & Data Fetching:** `@tanstack/react-query`, `Zustand`
* **Icons & Styling:** `@expo/vector-icons` (Feather), StyleSheet thuần UI/UX hiện đại
* **HTTP Client:** Axios với cấu hình Interceptors tự động đính kèm Token và xử lý lỗi chuẩn API
* **Local Storage:** `@react-native-async-storage/async-storage`

---

## 📁 Cấu Trúc Thư Mục Project

```text
DoAn_Mobile/
├── App.js                         # File khởi tạo ứng dụng
├── app.json                       # Cấu hình Expo App
├── package.json                   # Danh sách thư viện & dependency
└── src/
    ├── features/                  # Các module tính năng dùng chung
    │   ├── auth/                  # Đăng nhập, phân quyền & lưu trạng thái tài khoản
    │   ├── daily-log/             # Modal & camera ghi nhật ký hàng ngày
    │   ├── land-plots/            # Danh sách & chi tiết vùng trồng
    │   ├── notifications/         # Màn hình thông báo & chi tiết thông báo
    │   ├── profile/               # Thông tin tài khoản & cài đặt
    │   └── traceability/          # Quét QR & truy xuất nguồn gốc
    ├── navigation/                # Điều hướng ứng dụng (Authenticated & Tab Navigators)
    ├── roles/                     # Màn hình & API phân theo vai trò
    │   ├── farm-leader/           # Giao diện & xử lý dành cho Farm Leader
    │   └── farm-supervisor/       # Giao diện & API dành cho Farm Supervisor
    └── shared/                    # Các tiện ích dùng chung
        ├── api/                   # Axios client & xử lý response chuẩn
        ├── services/              # Dịch vụ đồng bộ offline queue
        └── utils/                 # Utilities làm tròn số, định dạng ngày tháng vi-VN, URL ảnh
```

---

## ⚙️ Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Yêu cầu hệ thống
* Node.js ($\ge 18.x$)
* npm hoặc yarn
* Ứng dụng **Expo Go** trên thiết bị di động (Android / iOS) hoặc Emulator (Android Studio / Xcode)

### 2. Cài đặt các thư viện (Dependencies)
Mở terminal tại thư mục dự án và chạy lệnh:
```bash
npm install
```

### 3. Khởi chạy ứng dụng Expo Dev Server
Chạy lệnh khởi động Expo server với tùy chọn xóa cache:
```bash
npx expo start -c
```

* Quét mã **QR Code** hiển thị trên terminal bằng ứng dụng **Expo Go** trên điện thoại để trải nghiệm trực tiếp.
* Nhấn `a` để mở trên Android Emulator, hoặc `w` để chạy thử trên Web browser.

---

## 🔒 Thông Tin Tài Khoản Mẫu Trải Nghiệm (Staging/Production API)

* **API Swagger Endpoint:** `https://api.eapls.io.vn/swagger/index.html`
* **Tài khoản Farm Supervisor:** `farmsupervisor_account1@eapls.com`
* **Mật khẩu:** `Abc@1234`

---

## 📜 Giấy Phép (License)
Dự án được bảo hộ thuộc Đồ án Hệ thống Quản lý Nông nghiệp Điện tử **EAPLS**.

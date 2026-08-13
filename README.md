# 🌾 EAPLS Mobile — Ứng Dụng Quản Lý Canh Tác Nông Nghiệp Thông Minh

> **EAPLS** *(Electronic Agriculture Planning & Logging System)* là hệ thống quản lý nông nghiệp điện tử tích hợp, hỗ trợ toàn bộ quy trình từ lập kế hoạch canh tác, phân công nhân sự, tạo và kích hoạt công việc, ghi nhật ký sản xuất hàng ngày, cảnh báo cách ly nông dược đến hiển thị bản đồ ranh giới GIS và truy xuất nguồn gốc sản phẩm.

Ứng dụng di động được xây dựng bằng **React Native (Expo)**, kết nối hệ sinh thái EAPLS với 2 vai trò chính: **Tổ trưởng (Farm Leader)** và **Giám sát trang trại (Farm Supervisor)**.

---

## ✨ Tính Năng Nổi Bật

### 👨‍🌾 Tổ Trưởng (Farm Leader)

| Tính năng | Mô tả |
|---|---|
| **Quản lý công việc** | Xem, lọc công việc theo các tab: *Đang làm*, *Chờ duyệt*, *Hoàn thành*. Chuẩn hóa trạng thái tự động chuyển công việc sang tab *Chờ duyệt* khi đã nộp báo cáo. |
| **Ghi nhật ký hàng ngày** | Ghi chép chi tiết hoạt động, vật tư (phân bón, thuốc BVTV), diện tích áp dụng và chọn ảnh minh chứng. |
| **Nhập giọng nói (Voice Input)** | Nói nội dung công việc ➔ tự động chuyển đổi thành văn bản bằng Google Cloud Speech-to-Text (vi-VN). |
| **Báo cáo tổng hợp (Summary Report)** | Tổng hợp lượng phân bón, nông dược đã dùng, hiển thị khuyến nghị vật tư và ảnh thực địa. |
| **Cảnh báo cách ly nông dược** | Tự động phát hiện & hiển thị cảnh báo thời gian cách ly (`quarantineNotice`, `quarantineError`), cho phép xác nhận gửi báo cáo có cảnh báo tương tự bản Web. |
| **Xem lại báo cáo đã gửi** | Chế độ xem xem lại chi tiết báo cáo tổng hợp ở dạng chỉ xem (Read-only) tránh gửi trùng lặp. |
| **Chế độ Offline** | Tự động lưu trữ nhật ký offline và đồng bộ khi có kết nối mạng trở lại. |

### 🕵️ Giám Sát Trang Trại (Farm Supervisor)

| Tính năng | Mô tả |
|---|---|
| **Quản lý kế hoạch canh tác** | Theo dõi tiến độ Sổ nhật ký canh tác (Cultivation Logbook) theo từng giai đoạn (*Tiền gieo trồng, Trồng cây, Thu hoạch...*). |
| **Thêm công việc trực tiếp (Inline Task Creation)** | Tạo công việc hàng loạt trực tiếp ngay dưới từng giai đoạn (*Thêm công việc vào giai đoạn này*). |
| **Gợi ý & Tự động điền theo Cây trồng** | Lọc danh mục công việc (`/api/task-catalogs?CropId=...`) chuẩn theo loại cây trồng ➔ tự động điền Tên công việc & Mô tả chi tiết/liều lượng khi chọn. |
| **Phân công nhân sự** | Giao Tổ trưởng phụ trách và gán nhiều nông dân hỗ trợ cho từng công việc. |
| **Kích hoạt công việc** | Nút **Kích hoạt** (Play ▶) trực quan cho các công việc ở trạng thái *Đã phân công*, *Đã lên lịch*, *Chờ kích hoạt* ➔ chuyển sang *Đang thực hiện*. |
| **Bản đồ ranh giới GIS** | Tích hợp bản đồ Leaflet OpenStreetMap (`react-native-webview`) vẽ đa giác ranh giới thửa đất (`boundaryJson`), tự động căn góc nhìn (`fitBounds`), hiển thị diện tích ước tính. |
| **Chi tiết vùng trồng & Thời tiết** | Bảng thông tin vùng trồng, cảnh báo khóa vùng trồng khi đang sử dụng, thời tiết thực thời (nhiệt độ, độ ẩm, tốc độ gió, cảm giác nhiệt). |
| **Chốt nhật ký & Phê duyệt** | Biên soạn nhật ký chính thức giai đoạn, chốt nhật ký và phê duyệt/từ chối đóng kế hoạch sau thu hoạch. |
| **Quản lý nhân sự** | Danh sách Tổ trưởng & Nông dân, theo dõi số lượng công việc được giao của từng người. |

---

## 🏷️ Chuẩn Hóa Danh Xưng Vai Trò (Role Localization)

Ứng dụng đã chuẩn hóa hiển thị danh xưng vai trò tiếng Việt đồng bộ trên toàn bộ màn hình:

- `FARM_SUPERVISOR` ➔ **Giám sát trang trại**
- `FARM_LEADER` / `FARMER_LEADER` ➔ **Tổ trưởng**
- `FARMER` ➔ **Nông dân**

---

## 🛠️ Công Nghệ Sử Dụng

| Nhóm | Thư viện / Công nghệ |
|---|---|
| **Core Framework** | React Native 0.81, Expo SDK 54 |
| **Navigation** | React Navigation 7 (Stack & Bottom Tabs) |
| **State & Data Fetching** | `@tanstack/react-query` v5, `Zustand` v5 |
| **HTTP Client** | `Axios` tích hợp interceptors tự động gắn Bearer Token & xử lý lỗi |
| **Local Storage** | `@react-native-async-storage/async-storage` |
| **Bản đồ GIS** | `react-native-webview`, Leaflet.js 1.9.4, OpenStreetMap Tiles |
| **UI & Icons** | `@expo/vector-icons` (Feather Icons), StyleSheet Native |
| **Camera & Media** | `expo-camera`, `expo-image-picker`, `expo-image` |
| **Audio & Voice Input** | `expo-av` (ghi âm), Google Cloud Speech-to-Text REST API (vi-VN) |
| **Location & GPS** | `expo-location` (lấy vị trí địa lý đính kèm ảnh) |
| **File System** | `expo-file-system` |
| **Charts & Graphics** | `react-native-chart-kit`, `react-native-svg` |
| **Build & Deploy** | EAS Build (Expo Application Services) |

---

## 📁 Cấu Trúc Thư Mục

```
DoAn_Mobile/
├── App.js                          # Entry point ứng dụng
├── index.js                        # Root register
├── app.config.js                   # Cấu hình Expo (env, permissions, plugins)
├── eas.json                        # Cấu hình EAS Build profiles (preview, production)
├── package.json                    # Khai báo dependencies
├── .env                            # Biến môi trường (API URLs, API keys)
│
└── src/
    ├── features/                   # Modules tính năng dùng chung
    │   ├── ai/                     # Trợ lý AI & gợi ý canh tác
    │   ├── auth/                   # Đăng nhập, phân quyền, lưu JWT token
    │   ├── daily-log/              # Ghi nhật ký hàng ngày & chụp ảnh thực địa
    │   ├── dashboard/              # Màn hình tổng quan & thống kê tiến độ
    │   ├── inventory/              # Quản lý kho vật tư
    │   ├── journals/               # Sổ nhật ký sản xuất
    │   ├── land-plots/             # Vùng trồng & vị trí địa lý
    │   ├── notifications/          # Thông báo hệ thống & xử lý thời gian
    │   ├── profile/                # Thông tin tài khoản & cài đặt vai trò
    │   ├── summary-report/         # Báo cáo tổng hợp (SummaryReportModal)
    │   └── traceability/           # Quét mã QR & truy xuất nguồn gốc
    │
    ├── navigation/                 # Điều hướng (AuthStack, MainTabNavigator)
    │
    ├── roles/                      # Màn hình & logic phân theo vai trò
    │   ├── farm-leader/            # Màn hình dành cho Tổ trưởng (MyTasksScreen, ...)
    │   └── farm-supervisor/        # Màn hình dành cho Giám sát trang trại
    │       ├── api/                # supervisorApi (call API tạo/bulk/start task, logbook, landplot)
    │       ├── components/         # GisBoundaryMap, InlineStageTaskForm, CreateTaskModal, AssignmentModal
    │       └── screens/            # SupervisorPlanDetailScreen, LandPlotDetailScreen, FarmerDetailScreen, FarmersScreen...
    │
    └── shared/                     # Utilities & components dùng chung
        ├── api/                    # Axios client (`client.js`), helper `response.js`
        ├── components/             # Component tái sử dụng (VoiceInputButton, ...)
        ├── hooks/                  # Custom hooks (useNetworkStatus, ...)
        └── utils/                  # Format ngày vi-VN (`format.js`), normalizeStatus (`data.js`)
```

---

## ⚙️ Cài Đặt & Khởi Chạy

### Yêu cầu hệ thống
- **Node.js** >= 18.x
- **npm** >= 9.x
- Ứng dụng **Expo Go** trên thiết bị di động (Android / iOS)

### 1. Cài đặt Dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường (`.env`)

Tạo hoặc cập nhật file `.env` tại thư mục gốc:

```env
# Backend API Root
VITE_API_ROOT=https://api.eapls.io.vn/api
VITE_API_URL=https://api.eapls.io.vn/api

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Google Speech-to-Text API Key (lấy tại console.cloud.google.com miễn phí 60 phút/tháng)
GOOGLE_STT_API_KEY=your_google_stt_api_key
```

### 3. Khởi chạy Dev Server

```bash
npx expo start -c
```

Mở ứng dụng **Expo Go** trên điện thoại và quét **mã QR** hiển thị trên terminal để trải nghiệm.

---

## 📦 Hướng Dẫn Build File APK (Android)

Sử dụng **EAS Build** để đóng gói file `.apk` cài đặt trực tiếp trên Android:

```bash
# Cài đặt EAS CLI (nếu chưa cài)
npm install -g eas-cli

# Đăng nhập tài khoản Expo
eas login

# Build APK (profile preview)
eas build -p android --profile preview
```

Sau khi hoàn tất, hệ thống sẽ trả về đường dẫn tải trực tiếp file `.apk`.

---

## 🔑 Thông Tin API & Đăng Nhập Demo

| Thông tin | Giá trị |
|---|---|
| **Swagger API Docs** | https://api.eapls.io.vn/swagger/index.html |
| **Tài khoản Giám sát (Farm Supervisor)** | `farmsupervisor_account1@eapls.com` |
| **Mật khẩu** | `Abc@1234` |

---

## 📜 Giấy Phép

Dự án thuộc Đồ án Tốt nghiệp — Hệ thống Quản lý Nông nghiệp Điện tử **EAPLS**.  
Bảo lưu toàn bộ quyền sở hữu trí tuệ.

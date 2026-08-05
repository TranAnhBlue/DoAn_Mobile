# 🌾 EAPLS Mobile — Ứng Dụng Quản Lý Canh Tác Nông Nghiệp Thông Minh

> **EAPLS** *(Electronic Agriculture Planning & Logging System)* là hệ thống quản lý nông nghiệp điện tử tích hợp, hỗ trợ toàn bộ quy trình từ lập kế hoạch canh tác, phân công nhân sự, ghi nhật ký sản xuất hàng ngày đến truy xuất nguồn gốc sản phẩm.

Ứng dụng di động được xây dựng bằng **React Native (Expo)**, phục vụ 2 vai trò chính: **Farm Leader (Trưởng nhóm sản xuất)** và **Farm Supervisor (Giám sát viên)**.

---

## ✨ Tính Năng Nổi Bật

### 👨‍🌾 Farm Leader — Trưởng Nhóm Sản Xuất

| Tính năng | Mô tả |
|---|---|
| **Quản lý công việc** | Xem, lọc và kích hoạt công việc được phân công theo giai đoạn & vùng trồng |
| **Ghi nhật ký hàng ngày** | Ghi chi tiết hoạt động, vật tư (phân bón, thuốc BVTV), diện tích áp dụng |
| **Nhập giọng nói (Voice Input)** | Đọc nói → tự động điền vào ô mô tả công việc bằng Google Speech-to-Text |
| **Chụp ảnh minh chứng** | Camera tích hợp GPS + timestamp, tối đa 3 ảnh/ghi chép |
| **Offline Sync** | Lưu ghi chép offline khi mất mạng, tự đồng bộ khi có kết nối trở lại |
| **Dashboard** | Tổng quan tiến độ công việc, thống kê theo giai đoạn |

### 🕵️ Farm Supervisor — Giám Sát Viên

| Tính năng | Mô tả |
|---|---|
| **Quản lý kế hoạch canh tác** | Xem, tạo và theo dõi sổ nhật ký (Cultivation Logbooks) theo quy trình |
| **Phân công nhân sự** | Giao Farm Leader & nông dân vào từng công việc cụ thể |
| **Chốt nhật ký giai đoạn** | Tổng hợp vật tư, ảnh thực địa, biên soạn nhật ký chính thức |
| **Phê duyệt kế hoạch** | Duyệt hoặc từ chối đóng kế hoạch canh tác sau thu hoạch |
| **Quản lý vùng trồng** | Chi tiết diện tích, địa chỉ, thời tiết thực thời tại vùng trồng |
| **Quản lý nhân sự** | Danh sách Farm Leader & nông dân, số lượng công việc đang giao |

### 🔧 Tiện Ích Chung

- **🔔 Thông báo** — Theo dõi cập nhật công việc, lịch trình từ hệ thống
- **🔍 Truy xuất nguồn gốc** — Quét QR truy xuất thông tin sản phẩm & thửa đất
- **📴 Chế độ offline** — Toàn bộ tính năng ghi chép hoạt động không cần mạng

---

## 🛠️ Công Nghệ Sử Dụng

| Nhóm | Thư viện / Công nghệ |
|---|---|
| **Core** | React Native 0.81, Expo SDK 54 |
| **Navigation** | React Navigation 7 (Stack + Bottom Tab) |
| **State & Data** | `@tanstack/react-query` v5, `Zustand` v5 |
| **HTTP Client** | `Axios` với interceptors tự động gắn JWT token |
| **Local Storage** | `@react-native-async-storage/async-storage` |
| **UI & Icons** | `@expo/vector-icons` (Feather), StyleSheet native |
| **Camera & Media** | `expo-camera`, `expo-image-picker`, `expo-image` |
| **Audio / Voice** | `expo-av` — ghi âm microphone |
| **Speech-to-Text** | Google Cloud Speech-to-Text REST API (vi-VN) |
| **Location & GPS** | `expo-location` — tọa độ GPS tích hợp ảnh |
| **File System** | `expo-file-system` |
| **Charts** | `react-native-chart-kit`, `react-native-svg` |
| **Animations** | `react-native-reanimated`, Animated API |
| **Build** | EAS Build (Expo Application Services) |

---

## 📁 Cấu Trúc Thư Mục

```
DoAn_Mobile/
├── App.js                          # Entry point ứng dụng
├── index.js                        # Root register
├── app.config.js                   # Cấu hình Expo (env, plugins, permissions)
├── eas.json                        # Cấu hình EAS Build profiles
├── .env                            # Biến môi trường (không commit lên git)
│
└── src/
    ├── features/                   # Modules tính năng
    │   ├── ai/                     # Trợ lý AI & gợi ý canh tác
    │   ├── auth/                   # Đăng nhập, phân quyền, lưu token
    │   ├── daily-log/              # Ghi nhật ký hàng ngày & camera thực địa
    │   ├── dashboard/              # Màn hình tổng quan & thống kê
    │   ├── inventory/              # Quản lý kho vật tư
    │   ├── journals/               # Nhật ký sản xuất (xem lại)
    │   ├── land-plots/             # Danh sách & chi tiết vùng trồng
    │   ├── notifications/          # Thông báo hệ thống
    │   ├── production/             # Quản lý quy trình sản xuất
    │   ├── profile/                # Thông tin tài khoản & cài đặt
    │   ├── purchases/              # Quản lý đơn mua vật tư
    │   ├── reports/                # Báo cáo sản xuất
    │   ├── summary-report/         # Báo cáo tổng hợp
    │   └── traceability/           # Quét QR & truy xuất nguồn gốc
    │
    ├── navigation/                 # Điều hướng (Auth flow + Tab navigator)
    │
    ├── roles/                      # Màn hình phân theo vai trò
    │   ├── farm-leader/            # UI & logic dành cho Farm Leader
    │   └── farm-supervisor/        # UI & logic dành cho Farm Supervisor
    │
    └── shared/                     # Dùng chung toàn app
        ├── api/                    # Axios client & helpers xử lý response
        ├── components/             # Component dùng lại (VoiceInputButton, ...)
        ├── hooks/                  # Custom hooks (useNetworkStatus, ...)
        ├── screens/                # Màn hình chia sẻ
        ├── services/               # Offline queue, sync service
        └── utils/                  # Format ngày vi-VN, làm tròn số, URL ảnh
```

---

## ⚙️ Cài Đặt & Khởi Chạy

### Yêu cầu
- **Node.js** >= 18.x
- **npm** >= 9.x
- Ứng dụng **Expo Go** trên điện thoại (Android / iOS)

### 1. Cài dependencies

```bash
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc (hoặc chỉnh sửa file có sẵn):

```env
# Backend API
VITE_API_ROOT=https://api.eapls.io.vn/api
VITE_API_URL=https://api.eapls.io.vn/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Google Speech-to-Text (lấy tại console.cloud.google.com — miễn phí 60 phút/tháng)
GOOGLE_STT_API_KEY=your_google_stt_api_key
```

### 3. Khởi chạy dev server

```bash
npx expo start -c
```

Quét **QR Code** bằng Expo Go để chạy trên thiết bị thật.

---

## 📦 Build APK (Android)

Dự án dùng **EAS Build** — build trên cloud, không cần Android Studio:

```bash
# Cài EAS CLI (1 lần)
npm install -g eas-cli

# Đăng nhập tài khoản Expo
eas login

# Build APK (profile preview)
eas build -p android --profile preview
```

Build xong (~5–10 phút) nhận link tải APK trực tiếp từ Expo.

---

## 🎙️ Tính Năng Nhập Giọng Nói

Tính năng **Voice Input** trong màn hình *Ghi chép công việc* hoạt động trên **Expo Go** (không cần build native):

1. Nhấn nút 🎙️ cạnh label "Chi tiết công việc"
2. Nói nội dung công việc
3. Nhấn lại để dừng → transcript tự điền vào ô text

> **Yêu cầu:** `GOOGLE_STT_API_KEY` hợp lệ trong `.env` và API **Cloud Speech-to-Text** đã được kích hoạt tại [console.cloud.google.com](https://console.cloud.google.com).

---

## 🔑 Tài Khoản Demo

| Thông tin | Giá trị |
|---|---|
| **API & Swagger** | https://api.eapls.io.vn/swagger/index.html |
| **Farm Supervisor** | `farmsupervisor_account1@eapls.com` |
| **Mật khẩu** | `Abc@1234` |

---

## 📜 Giấy Phép

Dự án thuộc Đồ án Tốt nghiệp — Hệ thống Quản lý Nông nghiệp Điện tử **EAPLS**.  
Bảo lưu toàn bộ quyền sở hữu trí tuệ.

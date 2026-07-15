# 📱 HƯỚNG DẪN XÂY DỰNG UI/UX MOBILE APP & KIẾN TRÚC OFFLINE-FIRST (UI_GUIDE)

## 1. TỔNG QUAN & TRIẾT LÝ THIẾT KẾ
Ứng dụng Mobile phục vụ 2 vai trò: **Giám sát viên (FARM_SUPERVISOR)** và **Nông dân (FARMER)**. 
- **Triết lý UI/UX:** Nông dân dùng UI cực kỳ đơn giản (Nút khổng lồ, icon to). Giám sát viên dùng UI dạng Dashboard quản lý.
- **Triết lý Dữ liệu (Offline-First):** Do đặc thù làm việc ngoài đồng ruộng thường xuyên mất mạng (4G yếu/mất sóng), **toàn bộ tính năng ghi chép phải hoạt động Offline 100%**. Dữ liệu lưu xuống Local Database trước, sau đó tự động đồng bộ (Sync) lên Server khi có mạng.

---

## 2. KIẾN TRÚC OFFLINE-FIRST (AI CẦN ĐẶC BIỆT LƯU Ý KHI CODE)
Khi code bất kỳ hành động Nút bấm (Submit) hoặc Fetch dữ liệu nào, AI phải tuân thủ luồng sau:
1. **Fetch Data:** App luôn ưu tiên đọc dữ liệu từ Local Database (SQLite / WatermelonDB / AsyncStorage). App có một Background Task để fetch dữ liệu từ API BE về lưu vào Local khi có mạng.
2. **Submit Data (Ghi chép/Báo cáo):**
   - Khi user ấn "Gửi báo cáo" hoặc "Lưu nhật ký", lưu bản ghi đó vào Local Database với trạng thái `sync_status = 'pending'`.
   - Hiển thị ngay thông báo "Đã lưu (Offline)" cho người dùng (Không bắt user chờ loading gọi API).
3. **Auto-Sync:** Sử dụng thư viện `@react-native-community/netinfo`. Khi phát hiện có mạng Internet, một worker sẽ tự động lặp qua các bản ghi `pending` và gọi API POST/PUT lên Backend. Thành công thì đổi thành `sync_status = 'synced'`.

---

## 3. CẤU TRÚC DASHBOARD (MÀN HÌNH CHÍNH)

### 3.1. DASHBOARD CỦA GIÁM SÁT VIÊN (SUPERVISOR)
Giao diện Grid (2 hoặc 3 cột), gồm **8 Menu chính**:
1. 📋 **Quản lý mùa vụ (Season Management):** (LUỒNG CHÍNH) Xem Kế hoạch, phân công Nông dân, đóng/mở các Giai đoạn.
2. ✍️ **Nhật ký đồng ruộng (Field Diary):** (LUỒNG CHÍNH) Nơi ghi chép thực tế, thêm ảnh, vật tư vào các giai đoạn đang mở.
3. ✅ **Phê duyệt báo cáo (Report Management):** Xem và duyệt/từ chối các báo cáo hoàn thành từ Nông dân.
4. 👥 **Quản lý nông dân (Farmer Management):** Xem danh sách nông dân mình quản lý, năng suất làm việc.
5. 📊 **Thống kê (Analytics):** Thống kê vật tư đã dùng, tiến độ mùa vụ.
6. 🌤️ **Thời tiết (Weather):** Tích hợp API thời tiết, cảnh báo mưa bão.
7. 🔔 **Thông báo (Notifications):** Thông báo nông dân vừa báo cáo, hoặc có mùa vụ mới từ Farm Manager.
8. 👤 **Hồ sơ (Profile):** Cài đặt tài khoản, xem trạng thái đồng bộ (Sync Status).

### 3.2. DASHBOARD CỦA NÔNG DÂN (FARMER)
Giao diện Grid cực kỳ tối giản, Icon lớn (72x72px), gồm **6 Menu chính**:
1. 🚀 **Báo cáo hàng ngày (Daily Report):** (LUỒNG CHÍNH) Nút to nhất. Xem công việc hôm nay và bấm nút "ĐÃ LÀM XONG" khổng lồ.
2. 📅 **Kế hoạch công việc (Work Plan):** Xem chi tiết phải làm gì, dùng phân bón nào (Read-only).
3. 🗺️ **Vùng trồng (Assigned Land):** Xem thông tin lô đất mình được giao.
4. 🌤️ **Thời tiết (Weather):** Dự báo thời tiết cơ bản để đi làm đồng.
5. 🔔 **Thông báo (Notifications):** Nhắc nhở từ Giám sát viên (VD: "Đã mở giai đoạn Gieo mạ").
6. 👤 **Hồ sơ (Profile):** Thông tin cá nhân, nút bấm "Đồng bộ dữ liệu thủ công".

---

## 4. CHI TIẾT LUỒNG NGHIỆP VỤ CỐT LÕI (NHẬT KÝ GIAI ĐOẠN)

Luồng này nằm trong cụm menu: **Quản lý mùa vụ** (Supervisor) -> **Báo cáo hàng ngày** (Farmer) -> **Nhật ký đồng ruộng** (Supervisor).

**Bước 1: Quản lý Giai đoạn (Supervisor)**
- Supervisor vào "Quản lý mùa vụ" -> Chọn 1 Kế hoạch.
- Giao diện `Steps` hiển thị các Giai đoạn (Ví dụ: 1. Làm đất -> 2. Gieo mạ -> 3. Thu hoạch).
- Nút **"Bắt đầu giai đoạn"**: Mở màn hình chọn Ngày bắt đầu thực tế. Trạng thái Giai đoạn chuyển thành IN_PROGRESS.

**Bước 2: Báo cáo công việc (Farmer)**
- Farmer vào "Báo cáo hàng ngày" (Hoặc được đẩy Notification).
- Màn hình hiển thị: "Giai đoạn hiện tại: Làm đất".
- UI: Dưới cùng có một **Nút bấm khổng lồ màu xanh lá: "ĐÃ LÀM XONG - BÁO CÁO NGAY!"**.
- Farmer bấm nút -> Lưu Local `pending` -> Sync báo cho Supervisor.

**Bước 3: Ghi nhận thực tế (Supervisor)**
- Supervisor vào "Nhật ký đồng ruộng" (Hoặc click từ Thông báo).
- Form ghi chép: 
  - `DatePicker`: Ngày ghi nhận.
  - `TextArea`: Ghi chú thực trạng.
  - `ImagePicker`: Chụp ảnh Offline lưu vào máy, khi có mạng tự động upload S3/Server.
- Khi hoàn thành toàn bộ công việc, Supervisor quay lại màn Quản lý mùa vụ -> Ấn **"Kết thúc giai đoạn"** -> Hệ thống cho phép mở Giai đoạn tiếp theo.

---

## 5. YÊU CẦU DÀNH CHO AI ASSISTANT (CURSOR/V0)
Khi đọc file này và gen code, AI phải:
1. **Thiết lập Offline-First:** Xây dựng một file `SyncManager.js` hoặc cấu trúc Redux Toolkit + Redux Persist / Async Storage để quản lý Hàng đợi (Queue) các request chưa được gửi khi rớt mạng.
2. **UI Component:** Sử dụng Ant Design Mobile (nếu có) hoặc React Native Elements. Áp dụng SafeAreaView, ScrollView để tránh lỗi UI trên các màn hình nhỏ.
3. **State Management:** Xử lý tốt việc truyền Params giữa các màn hình (Dashboard -> Danh sách mùa vụ -> Chi tiết mùa vụ).
4. **Mock Data:** Cung cấp Mock JSON có đầy đủ `sync_status` để mô phỏng việc mất mạng/có mạng.
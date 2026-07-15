# 🚀 React Native CLI Setup Instructions

## 📦 Android Configuration

### 1. Link Native Modules

```bash
cd "D:\Ky 9\DoAn_Mobile"

# Link vector icons
npx react-native-asset
```

### 2. Update `android/app/build.gradle`

Add these lines after `apply plugin: 'com.facebook.react'`:

```gradle
// Apply native config
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

### 3. Update `android/app/src/main/AndroidManifest.xml`

Add permissions:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application
  android:usesCleartextTraffic="true"
  ...>
```

### 4. Proguard Rules (android/app/proguard-rules.pro)

Add:

```proguard
# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# SQLite
-keep class com.op.sqlite.** { *; }
```

---

## 🍎 iOS Configuration

### 1. Install Pods

```bash
cd ios
pod install
cd ..
```

### 2. Update `ios/DoAn_Mobile_RN/Info.plist`

Add permissions:

```xml
<key>NSCameraUsageDescription</key>
<string>Cần quyền truy cập camera để chụp ảnh báo cáo đồng ruộng</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Cần quyền truy cập thư viện ảnh để đính kèm hình ảnh</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Cần quyền lưu ảnh vào thư viện</string>
```

---

## 🔧 Development Commands

### Start Metro Bundler
```bash
npm start
```

### Run Android
```bash
npm run android
```

### Run iOS
```bash
npm run ios
```

### Clear Cache
```bash
npm start -- --reset-cache
```

---

## ✅ Testing Checklist

### Database & Offline
- [ ] App khởi động và tạo database thành công
- [ ] Login và lưu token vào AsyncStorage
- [ ] Bật Airplane Mode và tạo báo cáo → Lưu local
- [ ] Tắt Airplane Mode → Auto sync
- [ ] Kiểm tra sync status badge trên header

### UI Components
- [ ] Icon hiển thị đúng (Feather icons)
- [ ] MenuCard có kích thước lớn, dễ bấm
- [ ] StatCard hiển thị số liệu rõ ràng
- [ ] Chữ to, dễ đọc cho người lớn tuổi

### Navigation
- [ ] Farmer role → FarmerHomeScreen với 6 menu
- [ ] Supervisor role → SupervisorHomeScreen với 8 menu
- [ ] Bottom tabs hoạt động bình thường
- [ ] Stack navigation giữa các màn hình

### Permissions
- [ ] Camera permission khi chụp ảnh
- [ ] Gallery permission khi chọn ảnh
- [ ] Network state detection

---

## 🐛 Troubleshooting

### Issue: "Unable to resolve module react-native-vector-icons"
```bash
npm install
cd android && ./gradlew clean && cd ..
npm start -- --reset-cache
```

### Issue: "SQLite database error"
```bash
# Clear app data
adb shell pm clear vn.io.eapls.mobile
```

### Issue: "Metro bundler error"
```bash
watchman watch-del-all
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### Issue: iOS build failed
```bash
cd ios
rm -rf Pods Podfile.lock
pod deintegrate
pod install
cd ..
```

---

## 📱 Build for Production

### Android APK
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Android AAB (for Play Store)
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS Archive
```bash
# Open in Xcode
open ios/DoAn_Mobile_RN.xcworkspace

# Product → Archive → Distribute App
```

---

## 🌐 Environment Variables

Create `.env` file:

```env
API_URL=https://api.eapls.io.vn/api
APP_ENV=production
```

---

## 📖 Documentation

- [React Native CLI Docs](https://reactnative.dev/docs/environment-setup)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [OP SQLite](https://github.com/OP-Engineering/op-sqlite)
- [React Native Vector Icons](https://github.com/oblador/react-native-vector-icons)
- [NetInfo](https://github.com/react-native-netinfo/react-native-netinfo)

---

## ✨ Features Implemented

### Offline-First Architecture
- ✅ SQLite local database (11 tables)
- ✅ Sync queue với retry logic
- ✅ Auto-sync khi có network
- ✅ Pending operation count badge
- ✅ Repository pattern cho data access

### UI/UX for Elderly Farmers
- ✅ Large icons (48-80px)
- ✅ Large touch targets (CARD_SIZE ~150px)
- ✅ Bold text (font weight 700-900)
- ✅ High contrast colors
- ✅ Grid layout với spacing rộng
- ✅ Clear labels (không icon only)

### Role-Based Dashboards
- ✅ FarmerHomeScreen (6 menus, màu xanh lá)
- ✅ SupervisorHomeScreen (8 menus, màu tím)
- ✅ StatCard cho quick stats
- ✅ Sync status indicator
- ✅ Pull-to-refresh

### Data Management
- ✅ Farmer: Daily reports (offline)
- ✅ Supervisor: Field diaries (offline)
- ✅ Phase management (start/complete)
- ✅ Report approval/rejection
- ✅ Media upload queue

---

## 🎯 Next Steps

1. **Native Module Linking**
   - Link vector icons fonts
   - Configure permissions

2. **Testing**
   - Test offline flows
   - Test sync with backend
   - Test on real devices

3. **Backend Integration**
   - Implement `/api/mobile/bootstrap` endpoint
   - Implement `/api/sync/bulk` endpoint
   - Implement `/api/media/upload` endpoint

4. **UI Polish**
   - Add loading states
   - Add error boundaries
   - Add empty states

5. **Production**
   - Code signing
   - Release builds
   - App Store / Play Store submission

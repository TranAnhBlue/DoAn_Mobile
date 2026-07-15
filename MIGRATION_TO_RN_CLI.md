# 🔄 MIGRATION: EXPO → REACT NATIVE CLI + OFFLINE-FIRST

## Mục tiêu
Chuyển đổi dự án từ Expo sang React Native CLI thuần và tích hợp kiến trúc offline-first từ DoAn_FE_Mobile.

---

## BƯỚC 1: Backup & Init React Native CLI Project

### 1.1 Backup dự án hiện tại
```bash
# Backup thư mục src/
cp -r "D:\Ky 9\DoAn_Mobile\src" "D:\Ky 9\DoAn_Mobile_Backup\src"
cp "D:\Ky 9\DoAn_Mobile\package.json" "D:\Ky 9\DoAn_Mobile_Backup\"
```

### 1.2 Init React Native CLI project mới
```bash
cd "D:\Ky 9"
npx @react-native-community/cli@latest init DoAn_Mobile_RN --version 0.76.0
cd DoAn_Mobile_RN
```

---

## BƯỚC 2: Dependencies Migration Map

### 2.1 LOẠI BỎ (Expo-specific)
```json
{
  "expo": "REMOVE",
  "expo-*": "REMOVE ALL",
  "@expo/vector-icons": "REMOVE",
  "expo-camera": "REMOVE",
  "expo-constants": "REMOVE",
  "expo-device": "REMOVE",
  "expo-font": "REMOVE",
  "expo-glass-effect": "REMOVE",
  "expo-image": "REMOVE",
  "expo-image-picker": "REMOVE",
  "expo-linear-gradient": "REMOVE",
  "expo-linking": "REMOVE",
  "expo-splash-screen": "REMOVE",
  "expo-status-bar": "REMOVE",
  "expo-symbols": "REMOVE",
  "expo-system-ui": "REMOVE",
  "expo-web-browser": "REMOVE",
  "react-native-web": "REMOVE",
  "react-native-worklets": "REMOVE",
  "babel-preset-expo": "REMOVE"
}
```

### 2.2 GIỮ NGUYÊN (Platform-agnostic)
```json
{
  "@react-native-async-storage/async-storage": "^2.2.0",
  "@react-native-community/datetimepicker": "^8.4.4",
  "@react-navigation/bottom-tabs": "^7.15.5",
  "@react-navigation/elements": "^2.9.10",
  "@react-navigation/native": "^7.2.4",
  "@react-navigation/native-stack": "^7.15.1",
  "@tanstack/react-query": "^5.62.14",
  "axios": "^1.16.1",
  "react-native-chart-kit": "^6.12.0",
  "react-native-gesture-handler": "^2.28.0",
  "react-native-reanimated": "^4.1.1",
  "react-native-safe-area-context": "^5.6.0",
  "react-native-screens": "^4.16.0",
  "react-native-svg": "^15.12.1",
  "react-native-toast-message": "^2.3.3",
  "zustand": "^5.0.13"
}
```

### 2.3 THAY THẾ (Native alternatives)
```json
{
  "@expo/vector-icons": "→ react-native-vector-icons@^10.3.0",
  "expo-image-picker": "→ react-native-image-picker@^7.1.2",
  "expo-camera": "→ react-native-vision-camera@^4.0.0",
  "expo-linear-gradient": "→ react-native-linear-gradient@^2.8.3",
  "expo-constants": "→ react-native-config@^1.5.3",
  "expo-device": "→ react-native-device-info@^13.0.0",
  "expo-font": "→ Manual font linking",
  "expo-status-bar": "→ StatusBar from react-native",
  "dotenv": "→ react-native-config"
}
```

### 2.4 THÊM MỚI (Offline-first architecture)
```json
{
  "@op-engineering/op-sqlite": "^15.2.14",
  "@react-native-community/netinfo": "^11.4.1",
  "react-native-get-random-values": "^1.11.0",
  "react-native-uuid": "^2.0.2"
}
```

---

## BƯỚC 3: Package.json Mới

### 3.1 Final package.json
```json
{
  "name": "DoAn_Mobile_RN",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "lint": "eslint .",
    "start": "react-native start",
    "test": "jest"
  },
  "dependencies": {
    "react": "19.1.0",
    "react-native": "0.76.0",
    
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-native-community/datetimepicker": "^8.4.4",
    "@react-native-community/netinfo": "^11.4.1",
    
    "@react-navigation/bottom-tabs": "^7.15.5",
    "@react-navigation/elements": "^2.9.10",
    "@react-navigation/native": "^7.2.4",
    "@react-navigation/native-stack": "^7.15.1",
    
    "@tanstack/react-query": "^5.62.14",
    "axios": "^1.16.1",
    "zustand": "^5.0.13",
    
    "@op-engineering/op-sqlite": "^15.2.14",
    
    "react-native-chart-kit": "^6.12.0",
    "react-native-config": "^1.5.3",
    "react-native-device-info": "^13.0.0",
    "react-native-gesture-handler": "^2.28.0",
    "react-native-get-random-values": "^1.11.0",
    "react-native-image-picker": "^7.1.2",
    "react-native-linear-gradient": "^2.8.3",
    "react-native-reanimated": "^4.1.1",
    "react-native-safe-area-context": "^5.6.0",
    "react-native-screens": "^4.16.0",
    "react-native-svg": "^15.12.1",
    "react-native-toast-message": "^2.3.3",
    "react-native-uuid": "^2.0.2",
    "react-native-vector-icons": "^10.3.0",
    "react-native-vision-camera": "^4.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@babel/preset-env": "^7.25.3",
    "@babel/runtime": "^7.25.0",
    "@react-native/babel-preset": "^0.76.0",
    "@react-native/eslint-config": "^0.76.0",
    "@react-native/metro-config": "^0.76.0",
    "@react-native/typescript-config": "^0.76.0",
    "@types/react": "^19.1.10",
    "@types/react-native-vector-icons": "^6.4.18",
    "eslint": "^8.19.0",
    "typescript": "^5.9.2"
  },
  "engines": {
    "node": ">=22.11.0"
  }
}
```

---

## BƯỚC 4: Cấu trúc Project Mới

```
DoAn_Mobile_RN/
├── android/                    # Native Android
├── ios/                        # Native iOS
├── src/
│   ├── api/
│   │   └── api.js             # Axios + interceptors (từ DoAn_Mobile)
│   ├── components/
│   │   └── DismissKeyboard.js # (từ DoAn_Mobile)
│   ├── constants/
│   │   └── categories.js      # (từ DoAn_Mobile)
│   ├── database/              # ⭐ MỚI: Offline-first
│   │   ├── db.js              # SQLite connection
│   │   ├── schema.js          # Table definitions
│   │   └── migrations/
│   │       └── v1.js
│   ├── hooks/
│   │   ├── useSyncManager.js  # ⭐ MỚI: Sync hook
│   │   ├── useOfflineQuery.js # ⭐ MỚI: Offline query
│   │   └── useOfflineMutation.js # ⭐ MỚI: Offline mutation
│   ├── navigation/
│   │   └── RootNavigator.js   # Navigation setup
│   ├── repositories/          # ⭐ MỚI: Data access layer
│   │   ├── farmerRepository.js
│   │   ├── supervisorRepository.js
│   │   ├── syncRepository.js
│   │   ├── bootstrapRepository.js
│   │   └── mediaRepository.js
│   ├── screens/               # 27 screens từ DoAn_Mobile
│   │   ├── auth/
│   │   ├── home/
│   │   ├── journal/
│   │   ├── production/
│   │   ├── profile/
│   │   └── ...
│   ├── services/              # ⭐ MỚI: Sync manager
│   │   ├── syncManager.js     # Auto-sync service
│   │   └── apiClient.js       # API client từ DoAn_FE_Mobile
│   ├── store/
│   │   └── authStore.js       # Zustand store
│   ├── theme/
│   │   └── colors.js          # Theme constants
│   └── utils/
│       ├── roles.js
│       └── uuid.js
├── .env                        # Environment variables
├── App.js                      # Root component
├── index.js                    # Entry point
└── package.json
```

---

## BƯỚC 5: Code Migration Checklist

### 5.1 Replace Expo Imports

#### Before (Expo):
```javascript
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'expo-camera';
import Constants from 'expo-constants';
import { Feather } from '@expo/vector-icons';
```

#### After (React Native CLI):
```javascript
import { StatusBar } from 'react-native';
import { Image } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { Camera } from 'react-native-vision-camera';
import Config from 'react-native-config';
import Icon from 'react-native-vector-icons/Feather';
```

### 5.2 Screen Component Pattern

#### Từ DoAn_Mobile (Expo):
```javascript
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  return (
    <View>
      <Feather name="home" size={24} />
    </View>
  );
}
```

#### Sang React Native CLI:
```javascript
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export default function HomeScreen({ navigation }) {
  return (
    <View>
      <Icon name="home" size={24} />
    </View>
  );
}
```

### 5.3 Environment Variables

#### Before (.env với expo-constants):
```javascript
import Constants from 'expo-constants';
const API_URL = Constants.expoConfig.extra.apiUrl;
```

#### After (.env với react-native-config):
```javascript
import Config from 'react-native-config';
const API_URL = Config.API_URL;
```

**Setup .env:**
```env
API_URL=https://api.eapls.io.vn/api
```

---

## BƯỚC 6: Native Module Setup

### 6.1 Android Setup (android/app/build.gradle)

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.facebook.react'

// React Native Config
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"

android {
    // ...
}

dependencies {
    implementation project(':react-native-vector-icons')
    implementation project(':@react-native-async-storage/async-storage')
    implementation project(':@react-native-community/netinfo')
    // ... other dependencies
}
```

### 6.2 iOS Setup (ios/Podfile)

```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '13.0'

target 'DoAn_Mobile_RN' do
  config = use_native_modules!
  use_react_native!(:path => config[:reactNativePath])

  # Vector Icons
  pod 'RNVectorIcons', :path => '../node_modules/react-native-vector-icons'
  
  # ... other pods
end
```

### 6.3 Link Vector Icons

**Android (android/app/build.gradle):**
```gradle
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

**iOS: Run pod install**
```bash
cd ios && pod install && cd ..
```

---

## BƯỚC 7: Offline-First Implementation

### 7.1 Database Setup (src/database/db.js)

```javascript
import { open } from '@op-engineering/op-sqlite';

let db = null;

export function getDatabase() {
  if (!db) {
    db = open({ name: 'eapls_mobile.db' });
  }
  return db;
}

export async function executeQuery(query, params = []) {
  try {
    const database = getDatabase();
    const result = await database.execute(query, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function transaction(callback) {
  const database = getDatabase();
  try {
    await database.execute('BEGIN TRANSACTION');
    await callback(database);
    await database.execute('COMMIT');
  } catch (error) {
    await database.execute('ROLLBACK');
    throw error;
  }
}
```

### 7.2 Schema Migration (src/database/schema.js)

```javascript
import { getDatabase } from './db';

export async function initializeDatabase() {
  const db = getDatabase();
  
  // Users table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      fullname TEXT,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      role TEXT,
      organization TEXT,
      province TEXT,
      sync_status TEXT DEFAULT 'SYNCED',
      server_version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TEXT
    )
  `);

  // Sync queue table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      operation TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      data TEXT,
      sync_status TEXT DEFAULT 'PENDING',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      synced_at TEXT
    )
  `);

  // Create indexes
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
    ON sync_queue(sync_status)
  `);

  console.log('✅ Database initialized');
}
```

### 7.3 Sync Manager (src/services/syncManager.js)

```javascript
import NetInfo from '@react-native-community/netinfo';
import { syncRepository } from '../repositories/syncRepository';
import { bootstrapRepository } from '../repositories/bootstrapRepository';
import api from '../api/api';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = [];
  }

  initialize() {
    // Listen to network state
    this.unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isSyncing) {
        this.runSync();
      }
    });
  }

  async runSync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    console.log('🔄 Starting sync...');

    try {
      // 1. Bootstrap: Pull server changes
      const cursors = await syncRepository.getSyncCursors();
      const response = await api.post('/mobile/bootstrap', { cursors });
      await bootstrapRepository.applyServerChanges(response.data);

      // 2. Bulk sync: Push local changes
      const pendingOps = await syncRepository.getPendingOperations();
      if (pendingOps.length > 0) {
        const bulkResponse = await api.post('/sync/bulk', {
          operations: pendingOps
        });
        await syncRepository.updateSyncResults(bulkResponse.data.results);
      }

      console.log('✅ Sync completed');
      this.notifyListeners('success');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.notifyListeners('error', error);
    } finally {
      this.isSyncing = false;
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(status, data) {
    this.listeners.forEach(cb => cb(status, data));
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}

export default new SyncManager();
```

---

## BƯỚC 8: Migration Commands

### 8.1 Install Dependencies
```bash
cd "D:\Ky 9\DoAn_Mobile_RN"

# Core dependencies
npm install

# Link native modules (Android)
npx react-native link react-native-vector-icons
npx react-native link react-native-config

# iOS pods
cd ios && pod install && cd ..
```

### 8.2 Android Permissions (android/app/src/main/AndroidManifest.xml)
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <application
      android:usesCleartextTraffic="true"
      android:networkSecurityConfig="@xml/network_security_config">
      <!-- ... -->
    </application>
</manifest>
```

### 8.3 iOS Permissions (ios/DoAn_Mobile_RN/Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>Cần quyền truy cập camera để chụp ảnh báo cáo</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Cần quyền truy cập thư viện ảnh</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Cần quyền truy cập vị trí để gắn vị trí báo cáo</string>
```

---

## BƯỚC 9: Copy Code từ DoAn_Mobile

### 9.1 Screens cần migrate
```bash
# Copy toàn bộ src/screens từ DoAn_Mobile
cp -r "D:\Ky 9\DoAn_Mobile\src\screens" "D:\Ky 9\DoAn_Mobile_RN\src\"

# Sau đó tìm và thay thế:
# - @expo/vector-icons → react-native-vector-icons
# - expo-image-picker → react-native-image-picker
# - expo-linear-gradient → react-native-linear-gradient
```

### 9.2 Find & Replace Script (PowerShell)
```powershell
$srcDir = "D:\Ky 9\DoAn_Mobile_RN\src"

Get-ChildItem -Path $srcDir -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    
    # Replace Expo imports
    $content = $content -replace "from 'expo-status-bar'", "from 'react-native'"
    $content = $content -replace "from '@expo/vector-icons'", "from 'react-native-vector-icons'"
    $content = $content -replace "import { (\w+) } from '@expo/vector-icons';", "import `$1 from 'react-native-vector-icons/`$1';"
    $content = $content -replace "<StatusBar style=", "<StatusBar barStyle="
    
    Set-Content $_.FullName -Value $content
}

Write-Host "✅ Migration completed"
```

---

## BƯỚC 10: Testing & Verification

### 10.1 Build & Run
```bash
# Android
npm run android

# iOS
npm run ios
```

### 10.2 Test Offline Functionality
1. Login vào app
2. Bật Airplane Mode
3. Tạo báo cáo/nhật ký → Kiểm tra lưu local
4. Tắt Airplane Mode
5. Kiểm tra auto-sync

### 10.3 Debug Commands
```bash
# Clear cache
npm start -- --reset-cache

# Android logs
npx react-native log-android

# iOS logs
npx react-native log-ios

# Check database
adb shell run-as vn.io.eapls.mobile
cd /data/data/vn.io.eapls.mobile/databases
sqlite3 eapls_mobile.db
```

---

## Timeline Estimate

| Phase | Tasks | Time |
|-------|-------|------|
| 1 | Init RN CLI project + dependencies | 2 hours |
| 2 | Setup native modules (Android/iOS) | 3 hours |
| 3 | Database layer + repositories | 4 hours |
| 4 | Sync manager + API integration | 3 hours |
| 5 | Migrate screens (find & replace) | 4 hours |
| 6 | Testing + bug fixes | 4 hours |
| **Total** | | **~20 hours** |

---

## Key Differences Summary

| Feature | Expo | React Native CLI |
|---------|------|------------------|
| **Init** | `npx create-expo-app` | `npx react-native init` |
| **Icons** | `@expo/vector-icons` | `react-native-vector-icons` |
| **Image Picker** | `expo-image-picker` | `react-native-image-picker` |
| **Camera** | `expo-camera` | `react-native-vision-camera` |
| **Config** | `expo-constants` | `react-native-config` |
| **Build** | `expo build` | `npx react-native run-android/ios` |
| **Update OTA** | Expo Updates | CodePush |
| **Native Code** | ❌ No access | ✅ Full access |
| **App Size** | Larger (~50MB+) | Smaller (~20MB) |
| **Offline DB** | ✅ Works | ✅ Works better |

---

## Troubleshooting

### Issue: Metro bundler error
```bash
npm start -- --reset-cache
```

### Issue: Android build failed
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

### Issue: iOS build failed
```bash
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
npm run ios
```

### Issue: Vector icons not showing
```bash
# Android: Check fonts.gradle applied
# iOS: Check RNVectorIcons pod installed
```

---

## Next Steps After Migration

1. ✅ Verify all screens render correctly
2. ✅ Test offline functionality
3. ✅ Configure environment variables
4. ✅ Setup CI/CD for native builds
5. ✅ Add crash reporting (Sentry/Bugsnag)
6. ✅ Configure code signing (iOS/Android)
7. ✅ Prepare for App Store/Play Store submission

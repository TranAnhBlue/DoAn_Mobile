# 📋 KẾ HOẠCH REFACTOR: OFFLINE-FIRST ARCHITECTURE

## Mục tiêu
Chuyển kiến trúc offline-first từ DoAn_FE_Mobile sang DoAn_Mobile (Expo) với:
- SQLite local database (expo-sqlite)
- Sync queue cho operations offline
- Repository pattern cho data access
- Background sync khi có network

## Giai đoạn 1: Cài đặt Dependencies

### Thêm packages mới:
```bash
npx expo install expo-sqlite expo-network
npm install uuid
```

### Loại bỏ/thay thế:
- Giữ TanStack Query cho server state caching
- Giữ Zustand cho auth state
- Thêm SQLite cho offline persistence

## Giai đoạn 2: Database Layer

### 2.1 Tạo cấu trúc database/

```
src/database/
├── db.js              # Database connection & transaction wrapper
├── schema.js          # Table definitions & migrations
└── migrations/        # Version-based migrations
    └── v1.js
```

### 2.2 Tables cần tạo (10 tables)

**Core tables:**
1. `users` - User profiles
2. `seasons` - Production seasons
3. `phases` - Season phases
4. `technical_descriptions` - Phase instructions
5. `season_farmer_assignments` - Farmer assignments

**Offline operations:**
6. `farmer_daily_reports` - Daily reports (offline-capable)
7. `field_diaries` - Field diary entries
8. `media_files` - Image upload queue
9. `phase_events` - Phase lifecycle events

**Sync management:**
10. `sync_queue` - Operation queue
11. `sync_state` - Sync cursors

### 2.3 Schema patterns
- `id` (TEXT PRIMARY KEY) - UUID
- `sync_status` - PENDING/SYNCING/SYNCED/FAILED
- `dirty_flag` (INTEGER 0/1) - Local modifications
- `server_version` (INTEGER) - Optimistic locking
- `created_at`, `updated_at`, `deleted_at` (TEXT ISO8601)
- `last_synced_at` (TEXT ISO8601)

## Giai đoạn 3: Repository Layer

### 3.1 Tạo cấu trúc repositories/

```
src/repositories/
├── farmerRepository.js       # Farmer operations
├── supervisorRepository.js   # Supervisor operations
├── syncRepository.js         # Sync queue management
├── bootstrapRepository.js    # Server data sync
└── mediaRepository.js        # Media upload queue
```

### 3.2 Repository pattern
```javascript
// Example: farmerRepository.js
export const farmerRepository = {
  async getCurrentFarmerPhase(farmerId) {
    // Complex JOIN query
    // Returns active phase + technical description
  },
  
  async createDailyReport(farmerId, phaseId, data) {
    // Transaction:
    // 1. Insert into farmer_daily_reports
    // 2. Insert into sync_queue
    // Return immediately (offline-first)
  }
}
```

## Giai đoạn 4: Sync Manager Service

### 4.1 Tạo services/syncManager.js

**Responsibilities:**
- Network state monitoring (@react-native-community/netinfo or expo-network)
- Auto-sync trigger on network reconnect
- Bootstrap data pull from server
- Bulk sync pending operations
- Media upload queue processing
- Conflict resolution

**Key methods:**
```javascript
export const syncManager = {
  initialize(),           // Setup network listener
  runSyncNow(),          // Manual sync trigger
  getPendingCount(),     // Queue size for UI badge
  getLastSyncTime()      // Display in Profile
}
```

### 4.2 Sync flow
1. Detect network online
2. Call `/api/mobile/bootstrap` (pull server changes)
3. Apply server changes to local DB
4. Get pending operations from sync_queue
5. Call `/api/sync/bulk` (push local changes)
6. Update sync_status based on results
7. Process media upload queue separately

## Giai đoạn 5: API Client Updates

### 5.1 Cập nhật src/api/api.js

**Thêm endpoints:**
- `POST /api/mobile/bootstrap` - Delta sync (cursor-based)
- `POST /api/sync/bulk` - Batch operation sync
- `POST /api/media/upload` - Media upload with metadata

**Bootstrap payload:**
```json
{
  "last_sync_cursors": {
    "users": 1234567890,
    "seasons": 1234567890
  },
  "user_id": "uuid"
}
```

**Bulk sync payload:**
```json
{
  "operations": [
    {
      "id": "queue-uuid",
      "entity_type": "farmer_daily_report",
      "operation": "CREATE",
      "entity_id": "report-uuid",
      "data": {...}
    }
  ]
}
```

## Giai đoạn 6: Hooks Integration

### 6.1 Tạo hooks mới

```
src/hooks/
├── useSyncManager.js      # Sync state & manual trigger
├── useOfflineQuery.js     # SQLite + fallback to API
└── useOfflineMutation.js  # Local write + queue
```

### 6.2 Example: useOfflineQuery
```javascript
export function useOfflineQuery(key, repositoryFn, apiFn) {
  // 1. Try local DB first
  // 2. If empty & online, fetch from API
  // 3. Store in local DB
  // 4. Return combined state
}
```

### 6.3 Example: useOfflineMutation
```javascript
export function useOfflineMutation(repositoryFn) {
  return useMutation({
    mutationFn: async (data) => {
      // 1. Write to local DB with PENDING status
      // 2. Add to sync_queue
      // 3. Return immediately
      // 4. Background sync will handle server update
    }
  })
}
```

## Giai đoạn 7: Screen Refactoring

### 7.1 Ưu tiên refactor screens:

**Phase 1 (Core offline features):**
1. `MyTasksScreen` → Farmer daily reports
2. `JournalEntryScreen` → Field diary entries
3. `ProductionPlanDetailScreen` → Phase management

**Phase 2 (Read-only with cache):**
4. `HomeScreen` → Dashboard stats from local DB
5. `ProductionPlansScreen` → Seasons list
6. `NotificationsScreen` → Notification queue

**Phase 3 (Nice-to-have offline):**
7. `InventoryScreen` → Material tracking
8. `ProductBatchesScreen` → Batch tracking

### 7.2 Refactor pattern example

**Before (online-only):**
```javascript
const [tasks, setTasks] = useState([]);
useEffect(() => {
  api.get('/tasks').then(setTasks);
}, []);
```

**After (offline-first):**
```javascript
const { data: tasks, isLoading } = useOfflineQuery(
  'myTasks',
  () => farmerRepository.getMyTasks(userId),
  () => api.get('/tasks')
);
```

## Giai đoạn 8: UI Enhancements

### 8.1 Sync status indicator
- Badge trong Profile screen hiển thị pending count
- "Đồng bộ dữ liệu" button trong Settings
- Toast notifications cho sync success/failure
- Network offline banner

### 8.2 Optimistic UI
- Hiển thị dữ liệu ngay sau khi lưu local
- Badge "Chưa đồng bộ" cho pending items
- Loading spinner khi sync đang chạy

## Giai đoạn 9: Testing Strategy

### 9.1 Test scenarios
1. **Offline create** - Tạo report khi offline → sync khi online
2. **Offline edit** - Sửa data khi offline → conflict resolution
3. **Image upload** - Chụp ảnh offline → upload khi online
4. **Network toggle** - Bật/tắt airplane mode nhiều lần
5. **Concurrent edits** - Server version conflict handling

### 9.2 Mock data
- Tạo migration với seed data cho development
- Mock API responses cho bootstrap & bulk sync

## Giai đoạn 10: Migration Path

### 10.1 Backwards compatibility
- Giữ existing online-only flow hoạt động
- Dần dần migrate từng feature sang offline-first
- Feature flag cho enable/disable offline mode

### 10.2 Data migration
- Khi user upgrade app, pull full bootstrap
- Populate local DB lần đầu
- Set initial sync cursors

## Implementation Order

### Sprint 1 (Foundation)
- [ ] Install dependencies
- [ ] Setup database (db.js, schema.js)
- [ ] Create core tables với migration v1
- [ ] Test database operations

### Sprint 2 (Repositories)
- [ ] Implement farmerRepository
- [ ] Implement supervisorRepository
- [ ] Implement syncRepository
- [ ] Unit tests cho repositories

### Sprint 3 (Sync Manager)
- [ ] Implement syncManager service
- [ ] Network state monitoring
- [ ] Bootstrap sync logic
- [ ] Bulk sync logic

### Sprint 4 (API Integration)
- [ ] Add bootstrap endpoint
- [ ] Add bulk sync endpoint
- [ ] Add media upload endpoint
- [ ] Test with mock server

### Sprint 5 (Hooks & Screens)
- [ ] Create useSyncManager hook
- [ ] Create useOfflineQuery hook
- [ ] Create useOfflineMutation hook
- [ ] Refactor MyTasksScreen (pilot)

### Sprint 6 (Rollout)
- [ ] Refactor remaining priority screens
- [ ] Add sync status UI
- [ ] Add manual sync button
- [ ] End-to-end testing

### Sprint 7 (Polish)
- [ ] Error handling & retry logic
- [ ] Conflict resolution UI
- [ ] Performance optimization
- [ ] Documentation

## Key Differences: DoAn_FE_Mobile vs DoAn_Mobile

| Aspect | DoAn_FE_Mobile | DoAn_Mobile (After Refactor) |
|--------|----------------|------------------------------|
| Database | @op-engineering/op-sqlite | expo-sqlite |
| Image Picker | react-native-image-picker | expo-image-picker |
| UUID | react-native-uuid | uuid package |
| Icons | react-native-vector-icons | @expo/vector-icons (already installed) |
| Network | @react-native-community/netinfo | expo-network or keep netinfo |
| State | Component state only | Zustand + TanStack Query + SQLite |
| Screens | Simple grid menus | Rich bottom tabs + stacks |
| Backend | Custom sync API | Same API + extend endpoints |

## Backend Requirements

API backend cần implement 3 endpoints:

### 1. Bootstrap Sync (Delta pull)
```
POST /api/mobile/bootstrap
Request: { last_sync_cursors: {...}, user_id: "uuid" }
Response: {
  data: { users: [...], seasons: [...], ... },
  cursors: { users: 1234567890, ... }
}
```

### 2. Bulk Sync (Operation push)
```
POST /api/sync/bulk
Request: { operations: [{id, entity_type, operation, entity_id, data}] }
Response: {
  results: [
    { queue_id: "uuid", status: "SUCCESS", server_version: 1 },
    { queue_id: "uuid", status: "CONFLICT", message: "..." }
  ]
}
```

### 3. Media Upload
```
POST /api/media/upload
Request: FormData with file + metadata
Response: { url: "https://...", media_id: "uuid" }
```

## Notes for AI Implementation

Khi implement từng phần, cần:

1. **Không xóa code cũ ngay** - comment out hoặc keep parallel
2. **Migration strategy** - tạo migration files thay vì ALTER trực tiếp
3. **Transaction safety** - wrap multi-step operations trong transaction
4. **Error boundary** - try/catch cho tất cả DB operations
5. **Logging** - console.log sync progress cho debugging
6. **Type safety** - consider adding JSDoc comments nếu không dùng TypeScript
7. **Performance** - index các cột thường query (user_id, season_id, sync_status)
8. **Memory** - limit query results với LIMIT/OFFSET cho large datasets
9. **Security** - không log sensitive data, validate input trước khi INSERT

## Success Metrics

- [ ] App hoạt động hoàn toàn offline cho core features
- [ ] Sync tự động khi có network
- [ ] Conflict resolution không mất dữ liệu
- [ ] UI responsive (no blocking operations)
- [ ] Media upload không fail sau nhiều lần retry
- [ ] Database size < 50MB sau 6 tháng sử dụng
- [ ] Sync latency < 5s cho 100 pending operations

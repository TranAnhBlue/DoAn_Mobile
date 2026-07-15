/**
 * Cấu hình API endpoint cho DoAn_FE_Mobile.
 *
 * ═══════════════════════════════════════════════════════════
 *  ĐỂ ĐỔI SANG PRODUCTION / HTTPS: chỉ cần set biến này:
 * ═══════════════════════════════════════════════════════════
 *   const PRODUCTION_API_URL = 'https://api.yourserver.com'
 *
 *  Khi PRODUCTION_API_URL !== null, toàn bộ app sẽ dùng URL
 *  đó và bỏ qua mọi localhost fallback.
 * ═══════════════════════════════════════════════════════════
 */
const PRODUCTION_API_URL = null

// ── Dev config ──────────────────────────────────────────────
// Port mà DoAn_BE_Mobile đang chạy (xem .env.example)
const DEV_PORT = 4000

/**
 * Khi test trên thiết bị thật (không phải emulator),
 * set IP LAN của máy tính ở đây.
 * Ví dụ: '192.168.1.5'
 * Để null khi dùng emulator Android (sẽ tự dùng 10.0.2.2).
 */
const DEV_LAN_IP = null

// ── Tự động chọn host phù hợp ───────────────────────────────
import {Platform} from 'react-native'

const buildUrl = host => `http://${host}:${DEV_PORT}`

const devHostCandidates = DEV_LAN_IP
  ? [DEV_LAN_IP]
  : Platform.select({
      // Android emulator: 10.0.2.2 trỏ về localhost của máy host
      android: ['10.0.2.2', 'localhost'],
      // iOS simulator: 127.0.0.1 hoặc localhost đều OK
      ios: ['localhost', '127.0.0.1'],
      default: ['localhost'],
    })

/**
 * Danh sách URL thử lần lượt khi network error (chỉ dùng ở dev).
 * Ở production, chỉ có 1 URL duy nhất.
 */
export const API_BASE_CANDIDATES = PRODUCTION_API_URL
  ? [PRODUCTION_API_URL]
  : devHostCandidates.map(buildUrl)

/** URL chính — production URL hoặc URL dev đầu tiên. */
export const API_BASE_URL = API_BASE_CANDIDATES[0]

/** Device ID gửi kèm mỗi request để BE phân biệt thiết bị. */
export const DEVICE_ID = 'dev-mobile-device-001'

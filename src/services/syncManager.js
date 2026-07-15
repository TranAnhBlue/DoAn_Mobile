import NetInfo from '@react-native-community/netinfo'

import { initializeDatabase } from '../database/schema'
import { applyServerChanges } from '../repositories/bootstrapRepository'
import {
  applySyncResults,
  getPendingMediaUploads,
  getPendingOperations,
  getSyncCursor,
  markMediaUploaded,
  markMediaUploadFailed,
  markOperationsProcessing,
  resetProcessingToPending,
} from '../repositories/syncRepository'
import { apiClient } from './apiClient'

// ==================== Sync State Management ====================

let isSyncRunning = false
let isUserAuthenticated = false

export const resetAuthentication = () => {
  isUserAuthenticated = false
}

// ==================== Authentication ====================

/**
 * Đảm bảo user đã đăng nhập trước khi sync.
 * 
 * NOTE: Đây là dev/demo auto-login. 
 * Production cần thay bằng màn hình Login thật và 
 * gọi apiClient.setTokens() sau khi user đăng nhập thành công.
 */
const ensureAuthenticated = async (role) => {
  if (isUserAuthenticated) return

  const credentials =
    role === 'FARMER'
      ? { phone: '0900000002', password: 'secret' }
      : { phone: '0900000001', password: 'secret' }

  await apiClient.login(credentials)
  isUserAuthenticated = true
}

// ==================== Sync Operations ====================

const syncPendingOperations = async (userId) => {
  const pendingOperations = await getPendingOperations(25)
  if (pendingOperations.length === 0) return

  await markOperationsProcessing(pendingOperations.map((item) => item.id))

  const cursor = await getSyncCursor()
  const response = await apiClient.bulkSync({
    userId,
    cursor,
    operations: pendingOperations.map((item) => item.payload),
  })

  await applySyncResults(response.results || [])
  await applyServerChanges(response.serverChanges)
}

const syncPendingMediaUploads = async () => {
  const pendingMedia = await getPendingMediaUploads(5)

  for (const media of pendingMedia) {
    try {
      const uploadedMedia = await apiClient.uploadMedia({
        mediaId: media.id,
        ownerType: media.ownerType,
        ownerId: media.ownerId,
        localUri: media.localUri,
        fileName: media.fileName,
        mimeType: media.mimeType,
        caption: media.caption,
        takenAt: media.takenAt,
      })
      
      await markMediaUploaded(media.id, uploadedMedia.remoteUrl)
    } catch (error) {
      await markMediaUploadFailed(media.id)
    }
  }
}

// ==================== Public API ====================

/**
 * Thực hiện đồng bộ dữ liệu với server.
 * 
 * Flow:
 * 1. Kiểm tra kết nối mạng
 * 2. Đảm bảo đã đăng nhập
 * 3. Bootstrap dữ liệu từ server
 * 4. Gửi các operations đang chờ
 * 5. Upload media đang chờ
 * 
 * @param {Object} params
 * @param {string} params.userId - ID của user hiện tại
 * @param {string} params.role - Role của user (FARMER/FARM_SUPERVISOR)
 */
export const runSyncNow = async ({ userId, role }) => {
  if (isSyncRunning) return

  const networkState = await NetInfo.fetch()
  if (!networkState.isConnected || networkState.isInternetReachable === false) {
    return
  }

  isSyncRunning = true

  try {
    initializeDatabase()
    
    await ensureAuthenticated(role)

    const cursor = await getSyncCursor()
    const bootstrapData = await apiClient.bootstrap({ cursor })
    await applyServerChanges(bootstrapData)
    
    await syncPendingOperations(userId)
    await syncPendingMediaUploads()
  } catch (error) {
    const isAuthError = 
      error?.message?.includes('401') || 
      error?.message?.includes('unauthorized')
      
    if (isAuthError) {
      isUserAuthenticated = false
    }
    
    await resetProcessingToPending()
  } finally {
    isSyncRunning = false
  }
}

/**
 * Đăng ký listener để tự động sync khi có mạng.
 * 
 * @param {Object} params
 * @param {string} params.userId - ID của user hiện tại
 * @param {string} params.role - Role của user
 * @returns {Function} Unsubscribe function
 */
export const subscribeSyncOnNetwork = ({ userId, role }) =>
  NetInfo.addEventListener((networkState) => {
    if (networkState.isConnected && networkState.isInternetReachable !== false) {
      runSyncNow({ userId, role })
    }
  })

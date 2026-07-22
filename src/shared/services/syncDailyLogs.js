import { Platform } from 'react-native';

import api from '../api/client';
import { unwrapPayload } from '../api/response';
import { offlineQueue } from './offlineQueue';

const MAX_RETRIES = 3;

/** Upload một ảnh từ URI local lên server */
async function uploadImageAsset(asset, index) {
  const extension = asset.fileName?.split('.').pop() || asset.uri.split('.').pop() || 'jpg';
  const formData = new FormData();
  formData.append('file', {
    uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
    name: asset.fileName || `daily-log-${Date.now()}-${index}.${extension}`,
    type: asset.mimeType || `image/${extension}`,
  });

  const response = await api.post('/v1/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const payload = unwrapPayload(response.data) || {};
  const url =
    payload.url || payload.secureUrl || payload.fileUrl || payload.path;
  if (!url) throw new Error('API tải ảnh không trả về URL.');
  return { id: payload.id || payload.publicId || '', url };
}

const toRequestMaterials = (items) =>
  items.map((item) => ({
    id: item.id,
    quantity: Number(item.quantity),
    unit: item.unit?.trim() || null,
    area: item.area ? Number(item.area) : null,
  }));

/**
 * Sync một entry từ offline queue lên server.
 * Trả về true nếu thành công, false nếu thất bại.
 */
async function syncEntry(entry) {
  try {
    const uploadedImages = await Promise.all(
      (entry.imageAssets || []).map((asset, index) =>
        uploadImageAsset(asset, index)
      )
    );

    await api.post('/cultivation-daily-logs', {
      taskId: entry.taskId,
      date: entry.date,
      description: entry.description,
      fertilizers: toRequestMaterials(entry.fertilizers || []),
      pesticides: toRequestMaterials(entry.pesticides || []),
      images: uploadedImages,
    });

    await offlineQueue.remove(entry.id);
    return { success: true, entry };
  } catch (error) {
    await offlineQueue.incrementRetry(entry.id);
    return { success: false, entry, error };
  }
}

/**
 * Sync tất cả entries trong queue.
 * Entries đã retry >= MAX_RETRIES lần sẽ bị bỏ qua (giữ lại để user xử lý thủ công).
 * @returns {{ synced: number, failed: number, skipped: number }}
 */
export async function syncAllPendingLogs() {
  const queue = await offlineQueue.getAll();
  if (!queue.length) return { synced: 0, failed: 0, skipped: 0 };

  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const entry of queue) {
    if ((entry.retryCount || 0) >= MAX_RETRIES) {
      skipped++;
      continue;
    }

    const result = await syncEntry(entry);
    if (result.success) {
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed, skipped };
}

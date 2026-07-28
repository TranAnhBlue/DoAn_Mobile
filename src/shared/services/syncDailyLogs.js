import { Platform } from 'react-native';

import api from '../api/client';
import { unwrapPayload } from '../api/response';
import { offlineQueue } from './offlineQueue';

const MAX_RETRIES = 5;

/** Upload một ảnh từ URI local lên server, thử nhiều endpoint phổ biến */
async function uploadImageAsset(asset, index) {
  if (!asset?.uri) return null;
  const extension = asset.fileName?.split('.').pop() || asset.uri?.split('.').pop() || 'jpg';
  const formData = new FormData();
  formData.append('file', {
    uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
    name: asset.fileName || `daily-log-${Date.now()}-${index}.${extension}`,
    type: asset.mimeType || `image/${extension}`,
  });

  const uploadEndpoints = ['/v1/media/upload', '/media/upload', '/api/media/upload', '/uploads'];
  let lastError = null;

  for (const endpoint of uploadEndpoints) {
    try {
      const response = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const payload = unwrapPayload(response.data) || {};
      const url = payload.url || payload.secureUrl || payload.fileUrl || payload.path;
      if (!url) continue;
      return { id: payload.id || payload.publicId || '', url, metadata: asset.metadata || null };
    } catch (err) {
      lastError = err;
      if (err?.response?.status !== 404) throw err;
    }
  }

  throw lastError || new Error('Không thể upload ảnh — không tìm được endpoint phù hợp.');
}

/** Chuyển đổi và làm sạch payload để phù hợp với định dạng yêu cầu của Backend API */
function buildPayloadVariations(entry, uploadedImages = []) {
  const taskIdVal = entry.taskId || entry.cultivationTaskId;
  const numTaskId = Number(taskIdVal);
  const taskId = !isNaN(numTaskId) && String(numTaskId) === String(taskIdVal) ? numTaskId : taskIdVal;

  const lbVal = entry.cultivationLogbookId || entry.task?.cultivationLogbookId || entry.task?.logbookId;
  const numLb = Number(lbVal);
  const cultivationLogbookId = !isNaN(numLb) ? numLb : (lbVal || undefined);

  const plotVal = entry.landPlotId || entry.task?.landPlotId || entry.task?.plotId;
  const numPlot = Number(plotVal);
  const landPlotId = !isNaN(numPlot) ? numPlot : (plotVal || undefined);

  const isoDate = entry.date || new Date().toISOString();
  const dateOnly = isoDate.split('T')[0];
  const description = (entry.description || '').trim();
  const progress = entry.progress != null ? Number(entry.progress) : 100;

  // Materials
  const rawFertilizers = entry.fertilizers || [];
  const rawPesticides = entry.pesticides || [];

  const fertilizers = rawFertilizers
    .filter((f) => f && (f.id || f.materialId) && f.quantity && Number(f.quantity) > 0)
    .map((f) => ({
      id: f.id || f.materialId,
      materialId: f.id || f.materialId,
      quantity: Number(f.quantity),
      unit: f.unit?.trim() || undefined,
      area: f.area ? Number(f.area) : undefined,
    }));

  const pesticides = rawPesticides
    .filter((p) => p && (p.id || p.materialId) && p.quantity && Number(p.quantity) > 0)
    .map((p) => ({
      id: p.id || p.materialId,
      materialId: p.id || p.materialId,
      quantity: Number(p.quantity),
      unit: p.unit?.trim() || undefined,
      area: p.area ? Number(p.area) : undefined,
    }));

  const materials = [...fertilizers, ...pesticides].map((m) => ({
    materialId: m.id || m.materialId,
    quantity: m.quantity,
    unit: m.unit,
    area: m.area,
  }));

  const images = uploadedImages
    .filter((img) => img && (img.url || img.imageUrl || typeof img === 'string'))
    .map((img) => ({
      id: img.id || undefined,
      url: typeof img === 'string' ? img : (img.url || img.imageUrl),
      imageUrl: typeof img === 'string' ? img : (img.url || img.imageUrl),
      caption: 'Ảnh hiện trường',
      metadata: img.metadata || undefined,
    }));

  return [
    // Biến thể A: Đầy đủ các trường phổ biến (bao gồm progress & song ngữ description/content/notes)
    {
      taskId,
      cultivationTaskId: taskId,
      cultivationLogbookId,
      landPlotId,
      date: isoDate,
      activityDate: isoDate,
      logDate: dateOnly,
      description,
      content: description,
      notes: description,
      progress,
      fertilizers: fertilizers.length ? fertilizers : undefined,
      pesticides: pesticides.length ? pesticides : undefined,
      materials: materials.length ? materials : undefined,
      images: images.length ? images : undefined,
    },
    // Biến thể B: Tối giản bắt buộc
    {
      taskId,
      cultivationTaskId: taskId,
      description,
      content: description,
      progress,
      date: isoDate,
      materials: materials.length ? materials : undefined,
      images: images.length ? images : undefined,
    },
    // Biến thể C: Ngày YYYY-MM-DD
    {
      taskId,
      description,
      progress,
      date: dateOnly,
      activityDate: dateOnly,
    },
  ];
}

/**
 * Sync một entry từ offline queue lên server.
 * Trả về { success: true/false, entry, error }
 */
async function syncEntry(entry) {
  try {
    let uploadedImages = [];
    if (entry.imageAssets?.length) {
      const uploadResults = await Promise.allSettled(
        entry.imageAssets.map((asset, index) => uploadImageAsset(asset, index))
      );
      uploadedImages = uploadResults
        .filter((r) => r.status === 'fulfilled' && r.value)
        .map((r) => r.value);
    }

    const payloadVariations = buildPayloadVariations(entry, uploadedImages);
    const taskIdVal = entry.taskId || entry.cultivationTaskId;

    // Danh sách đường dẫn API endpoint có thể xảy ra ở backend
    const logEndpoints = [
      `/cultivation-tasks/${taskIdVal}/daily-logs`,
      `/cultivation-tasks/${taskIdVal}/logs`,
      '/cultivation-daily-logs',
      '/cultivation-logs',
      '/api/cultivation-daily-logs',
      '/api/cultivation-logs',
    ];

    let success = false;
    let lastError = null;

    for (const endpoint of logEndpoints) {
      for (const payload of payloadVariations) {
        try {
          await api.post(endpoint, payload);
          success = true;
          break;
        } catch (err) {
          lastError = err;
          const status = err?.response?.status;
          if (status === 404) break; // Sai endpoint -> thử endpoint tiếp theo
        }
      }
      if (success) break;
    }

    if (!success) {
      const serverMsg = lastError?.response?.data?.message
        || (typeof lastError?.response?.data === 'string' ? lastError.response.data : null)
        || lastError?.message
        || 'Dữ liệu nhật ký không hợp lệ.';
      throw new Error(serverMsg);
    }

    // Gửi thành công -> xóa khỏi queue
    await offlineQueue.remove(entry.id);
    return { success: true, entry };
  } catch (error) {
    const errorMsg = error?.message || 'Lỗi kết nối máy chủ';
    console.warn('[syncDailyLogs] Sync entry thất bại:', {
      taskId: entry.taskId,
      message: errorMsg,
    });
    await offlineQueue.incrementRetry(entry.id);
    return { success: false, entry, error: errorMsg };
  }
}

/**
 * Sync tất cả entries trong queue.
 * @param {Object} [options]
 * @param {boolean} [options.force] - Nếu true, reset retryCount để thử lại toàn bộ
 * @returns {Promise<{ synced: number, failed: number, skipped: number, errors: Array }>}
 */
export async function syncAllPendingLogs(options = {}) {
  if (options?.force) {
    await offlineQueue.resetAllRetries();
  }

  const queue = await offlineQueue.getAll();
  if (!queue.length) return { synced: 0, failed: 0, skipped: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  let skipped = 0;
  const errors = [];

  for (const entry of queue) {
    if (!options?.force && (entry.retryCount || 0) >= MAX_RETRIES) {
      skipped++;
      continue;
    }

    const result = await syncEntry(entry);
    if (result.success) {
      synced++;
    } else {
      failed++;
      errors.push({
        taskId: entry.taskId,
        description: entry.description,
        message: result.error,
        retryCount: (entry.retryCount || 0) + 1,
      });
    }
  }

  if (errors.length) {
    console.warn('[syncDailyLogs] Kết quả đồng bộ:', { synced, failed, skipped, errors });
  }

  return { synced, failed, skipped, errors };
}

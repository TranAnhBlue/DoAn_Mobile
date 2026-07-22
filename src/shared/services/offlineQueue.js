import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'farm-leader:offline-queue';

/**
 * @typedef {Object} OfflineLogEntry
 * @property {string} id - Unique ID của entry
 * @property {string} taskId
 * @property {string} date - ISO string
 * @property {string} description
 * @property {Array} fertilizers
 * @property {Array} pesticides
 * @property {Array} imageAssets - Mảng các { uri, fileName, mimeType } từ ImagePicker
 * @property {string} createdAt - ISO string
 * @property {number} retryCount - Số lần đã thử sync
 */

/** Đọc toàn bộ queue, trả về mảng rỗng nếu không có */
async function getAll() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Lưu toàn bộ queue */
async function saveAll(queue) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Thêm một log entry vào queue */
async function enqueue(entry) {
  const queue = await getAll();
  const newEntry = {
    ...entry,
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  queue.push(newEntry);
  await saveAll(queue);
  return newEntry;
}

/** Xóa một entry theo id */
async function remove(id) {
  const queue = await getAll();
  await saveAll(queue.filter((entry) => entry.id !== id));
}

/** Tăng retry count cho một entry */
async function incrementRetry(id) {
  const queue = await getAll();
  const updated = queue.map((entry) =>
    entry.id === id ? { ...entry, retryCount: (entry.retryCount || 0) + 1 } : entry
  );
  await saveAll(updated);
}

/** Trả về số lượng entry đang chờ */
async function count() {
  const queue = await getAll();
  return queue.length;
}

export const offlineQueue = { enqueue, getAll, remove, incrementRetry, count };

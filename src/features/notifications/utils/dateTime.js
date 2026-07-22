const hasExplicitTimeZone = (value) => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

/**
 * Parse chuỗi ngày giờ từ server thành đối tượng Date.
 * Nếu chuỗi chưa có thông tin múi giờ (chưa có Z hay +07:00), tự động chuyển sang ISO UTC ("Z").
 */
export const parseServerDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();
  const normalized = hasExplicitTimeZone(text) ? text : `${text}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Định dạng ngày giờ chuẩn múi giờ Việt Nam (Asia/Ho_Chi_Minh = UTC+7).
 * @param {string|Date|null|undefined} value
 * @param {string} fallback
 * @returns {string} ví dụ: "22/07/2026 11:45"
 */
export function formatVietnamDateTime(value, fallback = '') {
  const date = parseServerDateTime(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

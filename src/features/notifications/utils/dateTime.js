/**
 * Formats a date value into a Vietnamese locale date-time string.
 * @param {string|Date|null|undefined} value - The date to format.
 * @param {string} fallback - The string to return when value is invalid or empty.
 * @returns {string}
 */
export function formatVietnamDateTime(value, fallback = '') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return fallback;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

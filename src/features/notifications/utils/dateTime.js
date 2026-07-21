const hasExplicitTimeZone = (value) => /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);

export const parseServerDateTime = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();
  const normalized = hasExplicitTimeZone(text) ? text : `${text}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatVietnamDateTime = (value, fallback = '') => {
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
};

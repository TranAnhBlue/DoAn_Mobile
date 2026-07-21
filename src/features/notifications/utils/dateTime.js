const API_DATE_TIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const HAS_TIME_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

const parseApiDateTime = (value) => {
  if (!value) return null;

  const rawValue = String(value).trim();
  const normalizedValue = API_DATE_TIME_WITHOUT_ZONE.test(rawValue) && !HAS_TIME_ZONE.test(rawValue)
    ? `${rawValue}Z`
    : rawValue;
  const date = new Date(normalizedValue);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatVietnamDateTime = (value, fallback = '') => {
  const date = parseApiDateTime(value);
  if (!date) return fallback;

  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
};

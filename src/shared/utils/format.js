/**
 * Shared formatting utilities for dates, URLs, and display values.
 */
import Constants from 'expo-constants';
import { formatVietnamDateTime } from '../../features/notifications/utils/dateTime';

const BASE_API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.eapls.io.vn/api';
const API_ORIGIN = BASE_API_URL.replace(/\/api\/?$/, '');

/**
 * Resolve a possibly-relative image URL to an absolute URL.
 */
export const resolveAvatarUrl = (url, fallbackUrl = null) => {
  const raw = url || fallbackUrl;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  return `${API_ORIGIN}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

/**
 * Format a date value to Vietnamese DD/MM/YYYY string.
 */
export const formatDateVN = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}/${m}/${y}`;
    }
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(val);
  }
};

/**
 * Format date or return 'Chưa xác định'.
 */
export const dateOf = (value) => (value ? formatDateVN(value) : 'Chưa xác định');

/**
 * Format datetime in Vietnamese locale.
 */
export const dateTimeOf = (value) => formatVietnamDateTime(value, 'Chưa xác định');

/**
 * Robust date parser returning milliseconds timestamp (0 if invalid).
 */
export const getTimeMs = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) return isNaN(val.getTime()) ? 0 : val.getTime();
  if (typeof val === 'object') {
    const raw =
      val.createdAt || val.loggedAt || val.activityDate || val.logDate ||
      val.performedAt || val.workDate || val.createdDate || val.date || val.updatedAt;
    return getTimeMs(raw);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
      const parts = trimmed.split(' ');
      const [d, m, y] = parts[0].split('/');
      const timeStr = parts[1] || '00:00:00';
      const isoStr = `${y}-${m}-${d}T${timeStr}`;
      const ts = new Date(isoStr).getTime();
      if (!isNaN(ts)) return ts;
    }
    const ts = new Date(trimmed).getTime();
    if (!isNaN(ts)) return ts;
  }
  return 0;
};

/**
 * Sorts array of daily logs or activity logs in descending order (newest first).
 */
export const sortLogsDescending = (logs) => {
  if (!Array.isArray(logs)) return [];
  return [...logs].sort((a, b) => {
    const timeA = getTimeMs(a);
    const timeB = getTimeMs(b);
    if (timeA !== timeB) return timeB - timeA;
    const idA = Number(a?.id || a?._id || 0);
    const idB = Number(b?.id || b?._id || 0);
    return idB - idA;
  });
};


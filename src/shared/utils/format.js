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

/**
 * Category definitions for Journal Management
 * Based on backend FormSchema.category enum
 */

// Main category groups for UI navigation
export const CATEGORY_GROUPS = {
  VIETGAP: {
    key: 'vietgap',
    label: 'VietGAP',
    color: '#22c55e',
    icon: 'leaf',
    description: 'Thực hành nông nghiệp tốt',
    categories: [
      { key: 'trongtrot', label: 'Trồng trọt', icon: 'sun' },
      { key: 'channuoi', label: 'Chăn nuôi', icon: 'home' },
      { key: 'thuysan', label: 'Thủy sản', icon: 'droplet' },
    ]
  },
  ORGANIC: {
    key: 'organic',
    label: 'Hữu cơ',
    color: '#16a34a',
    icon: 'heart',
    description: 'Nông nghiệp hữu cơ',
    categories: [
      { key: 'huuco_caytrong', label: 'Cây trồng', icon: 'sun' },
      { key: 'huuco_channuoi', label: 'Chăn nuôi', icon: 'home' },
      { key: 'huuco_thuysan', label: 'Thủy sản', icon: 'droplet' },
    ]
  },
  SMART: {
    key: 'smart',
    label: 'Thông minh',
    color: '#059669',
    icon: 'zap',
    description: 'Nông nghiệp công nghệ cao',
    categories: [
      { key: 'thongminh', label: 'Tất cả', icon: 'cpu' },
    ]
  },
};

// Journal status options
export const STATUS_OPTIONS = [
  { key: 'all', label: 'Tất cả', color: '#6b7280', icon: 'list' },
  { key: 'Draft', label: 'Nháp', color: '#3b82f6', icon: 'edit-3' },
  { key: 'Submitted', label: 'Chờ duyệt', color: '#f59e0b', icon: 'clock' },
  { key: 'Verified', label: 'Đã duyệt', color: '#22c55e', icon: 'check-circle' },
  { key: 'Locked', label: 'Khóa', color: '#ef4444', icon: 'lock' },
];

// Sort options
export const SORT_OPTIONS = [
  { key: 'newest', label: 'Mới nhất', field: 'createdAt', order: 'desc' },
  { key: 'oldest', label: 'Cũ nhất', field: 'createdAt', order: 'asc' },
  { key: 'name-asc', label: 'Tên A-Z', field: 'schemaName', order: 'asc' },
  { key: 'name-desc', label: 'Tên Z-A', field: 'schemaName', order: 'desc' },
];

// Helper functions

/**
 * Get category group from category key
 * @param {string} categoryKey - Backend category key (e.g., 'trongtrot', 'huuco_caytrong')
 * @returns {object|null} Category group object or null
 */
export const getCategoryGroup = (categoryKey) => {
  if (!categoryKey) return null;
  
  if (['trongtrot', 'channuoi', 'thuysan'].includes(categoryKey)) {
    return CATEGORY_GROUPS.VIETGAP;
  }
  
  if (['huuco', 'huuco_caytrong', 'huuco_channuoi', 'huuco_thuysan'].includes(categoryKey)) {
    return CATEGORY_GROUPS.ORGANIC;
  }
  
  if (categoryKey === 'thongminh') {
    return CATEGORY_GROUPS.SMART;
  }
  
  return null;
};

/**
 * Get category label for display
 * @param {string} categoryKey - Backend category key
 * @returns {string} Display label
 */
export const getCategoryLabel = (categoryKey) => {
  const labels = {
    'trongtrot': 'Trồng trọt',
    'channuoi': 'Chăn nuôi',
    'thuysan': 'Thủy sản',
    'huuco': 'Hữu cơ',
    'huuco_caytrong': 'Cây trồng',
    'huuco_channuoi': 'Chăn nuôi',
    'huuco_thuysan': 'Thủy sản',
    'thongminh': 'Thông minh',
  };
  return labels[categoryKey] || categoryKey;
};

/**
 * Get all categories from a group
 * @param {string} groupKey - Group key ('vietgap', 'organic', 'smart')
 * @returns {array} Array of category objects
 */
export const getCategoriesByGroup = (groupKey) => {
  const group = Object.values(CATEGORY_GROUPS).find(g => g.key === groupKey);
  return group ? group.categories : [];
};

/**
 * Get status label and color
 * @param {string} statusKey - Status key
 * @returns {object} Status object with label and color
 */
export const getStatusInfo = (statusKey) => {
  return STATUS_OPTIONS.find(s => s.key === statusKey) || STATUS_OPTIONS[0];
};

/**
 * Get full category display name
 * @param {string} categoryKey - Backend category key
 * @returns {string} Full display name (e.g., 'VietGAP - Trồng trọt')
 */
export const getFullCategoryName = (categoryKey) => {
  const group = getCategoryGroup(categoryKey);
  const label = getCategoryLabel(categoryKey);
  return group ? `${group.label} - ${label}` : label;
};

/**
 * Check if category belongs to a group
 * @param {string} categoryKey - Backend category key
 * @param {string} groupKey - Group key to check
 * @returns {boolean}
 */
export const isCategoryInGroup = (categoryKey, groupKey) => {
  const group = getCategoryGroup(categoryKey);
  return group?.key === groupKey;
};

/**
 * Get default category for a group
 * @param {string} groupKey - Group key
 * @returns {string} Default category key
 */
export const getDefaultCategoryForGroup = (groupKey) => {
  const group = Object.values(CATEGORY_GROUPS).find(g => g.key === groupKey);
  return group?.categories[0]?.key || null;
};

// Export all for easy access
export default {
  CATEGORY_GROUPS,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  getCategoryGroup,
  getCategoryLabel,
  getCategoriesByGroup,
  getStatusInfo,
  getFullCategoryName,
  isCategoryInGroup,
  getDefaultCategoryForGroup,
};

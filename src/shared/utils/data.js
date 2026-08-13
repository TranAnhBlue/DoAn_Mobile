/**
 * Shared data utilities: value coalescing, status normalization, entity IDs.
 */

/**
 * Returns the first non-null, non-undefined, non-empty value from the provided list.
 */
export const valueOf = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

/**
 * Normalizes a task status value to a canonical status key.
 * Returns one of: 'COMPLETED' | 'PENDING_APPROVAL' | 'IN_PROGRESS'
 */
export const normalizeStatus = (item) => {
  if (!item) return 'IN_PROGRESS';

  // Explicit summary submission boolean flags
  const isSubmittedFlag = valueOf(
    item.isSubmitted, item.hasSummary, item.summarySubmitted,
    item.isSummarySubmitted, item.isPendingApproval, item.hasPendingSummary,
    item.submittedForApproval
  );
  if (isSubmittedFlag === true) {
    return 'PENDING_APPROVAL';
  }

  const val = valueOf(
    item.status?.name, item.status?.code, item.status?.statusName, item.status?.value,
    item.taskStatus, item.state, item.approvalStatus, item.reviewStatus, item.stageStatus,
    item.status
  );

  if (val === undefined || val === null || val === '') {
    if (item.completedAt || item.completedDate || item.progress === 100) return 'COMPLETED';
    if (item.descriptionSummary || item.summaryDescription || item.summaryNotes || item.summary) return 'PENDING_APPROVAL';
    return 'IN_PROGRESS';
  }

  const s = String(val).trim().toUpperCase();

  // Completed status check
  if (
    s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED' || s === 'APPROVED' || s === '3' ||
    s.includes('HOÀN THÀNH') || s.includes('HOAN THANH') || s.includes('COMPLETED')
  ) {
    return 'COMPLETED';
  }

  // Pending approval / review check
  if (
    s === 'WAITING_APPROVAL' || s === 'PENDING_APPROVAL' || s === 'PENDING_REVIEW' ||
    s === 'SUBMITTED' || s === 'WAITING' || s === 'PENDING' || s === 'REVIEWING' ||
    s === 'SUMMARY_SUBMITTED' || s === 'SUMMARYSUBMITTED' || s === '2' ||
    s.includes('CHỜ DUYỆT') || s.includes('CHO DUYET') || s.includes('WAITING') ||
    s.includes('PENDING') || s.includes('SUBMITTED') || s.includes('REVIEW')
  ) {
    return 'PENDING_APPROVAL';
  }

  // If summary note exists (summary submitted) and not completed, treat as PENDING_APPROVAL
  if (
    (item.descriptionSummary || item.summaryDescription || item.summaryNotes || item.summaryText || item.summary) &&
    !item.completedAt
  ) {
    return 'PENDING_APPROVAL';
  }

  // In progress status check
  if (
    s === 'IN_PROGRESS' || s === 'ASSIGNED' || s === 'DOING' || s === 'ACTIVE' ||
    s === 'PLANNED' || s === 'OVERDUE' || s === '1' || s === '0' ||
    s.includes('ĐANG THỰC HIỆN') || s.includes('DANG THUC HIEN') || s.includes('ĐANG LÀM')
  ) {
    return 'IN_PROGRESS';
  }

  return 'IN_PROGRESS';
};

/**
 * Status display config: [label, color, bgColor, textColor]
 */
export const STATUS = {
  PENDING:          ['Chờ duyệt',        '#d97706', '#fef3c7', '#b45309'],
  PENDING_APPROVAL: ['Chờ duyệt',        '#d97706', '#fef3c7', '#b45309'],
  WAITING_APPROVAL: ['Chờ duyệt',        '#d97706', '#fef3c7', '#b45309'],
  WAITING:          ['Chờ duyệt',        '#d97706', '#fef3c7', '#b45309'],
  SUBMITTED:        ['Chờ duyệt',        '#d97706', '#fef3c7', '#b45309'],
  PLANNED:          ['Đã lên lịch',      '#2563eb', '#dbeafe', '#1d4ed8'],
  ASSIGNED:         ['Đã phân công',     '#2563eb', '#dbeafe', '#1d4ed8'],
  ASSIGNED_LEADER:  ['Đã phân công',     '#2563eb', '#dbeafe', '#1d4ed8'],
  IN_PROGRESS:      ['Đang thực hiện',   '#15803d', '#dcfce7', '#166534'],
  DOING:            ['Đang thực hiện',   '#15803d', '#dcfce7', '#166534'],
  COMPLETED:        ['Hoàn thành',       '#059669', '#dcfce7', '#166534'],
  DONE:             ['Hoàn thành',       '#059669', '#dcfce7', '#166534'],
  CANCELLED:        ['Đã hủy',           '#64748b', '#f1f5f9', '#475569'],
};

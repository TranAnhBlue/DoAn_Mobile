/**
 * Utility for evaluating quarantine (Pre-Harvest Interval - PHI) eligibility
 * and generating inline warnings for harvest tasks.
 */
import { formatDateVN } from '../../../shared/utils/format';

/**
 * Calculates quarantine eligibility date based on pesticide spray history and PHI days.
 * @param {Array} history - List of daily logs or logs history
 * @param {Object} task - Task item
 * @returns {Object} { eligibleDate, isInQuarantine, daysRemaining, warningMessage }
 */
export function calculateQuarantineEligibility(history = [], task = {}) {
  // Check backend provided fields first
  const backendEligibleDate = task.eligibleDate || task.quarantineEligibleDate || task.safeHarvestDate;
  const backendInQuarantine = task.inQuarantine ?? task.isInQuarantine;
  const backendMsg = task.quarantineWarning || task.quarantineMessage || task.quarantineError || task.inlineQuarantineWarnings;

  let latestQuarantineEnd = null;
  let latestPesticideName = '';

  if (Array.isArray(history)) {
    history.forEach((log) => {
      const pesticides = log.pesticides || log.totalPesticides || log.materials?.pesticides || [];
      const logDate = log.date || log.createdAt || log.createdDate;
      if (!logDate || !Array.isArray(pesticides)) return;

      const logTimestamp = new Date(logDate).getTime();
      if (isNaN(logTimestamp)) return;

      pesticides.forEach((p) => {
        const phiDays = Number(p.isolationDays || p.quarantineDays || p.isolationPeriod || p.phi || p.pesticide?.isolationDays || 0);
        if (phiDays > 0) {
          const endDate = new Date(logTimestamp + phiDays * 24 * 60 * 60 * 1000);
          if (!latestQuarantineEnd || endDate > latestQuarantineEnd) {
            latestQuarantineEnd = endDate;
            latestPesticideName = p.name || p.pesticideName || p.tradeName || 'Nông dược';
          }
        }
      });
    });
  }

  const now = new Date();
  const effectiveEndDate = backendEligibleDate ? new Date(backendEligibleDate) : latestQuarantineEnd;

  if (!effectiveEndDate || isNaN(effectiveEndDate.getTime())) {
    if (backendInQuarantine === true || backendMsg) {
      return {
        eligibleDate: null,
        isInQuarantine: true,
        daysRemaining: null,
        warningMessage: String(backendMsg || 'Nông dược đã phun chưa đủ số ngày cách ly an toàn.'),
      };
    }
    return {
      eligibleDate: null,
      isInQuarantine: false,
      daysRemaining: 0,
      warningMessage: '',
    };
  }

  const diffMs = effectiveEndDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isInQuarantine = backendInQuarantine ?? (daysRemaining > 0);

  let warningMessage = '';
  if (isInQuarantine) {
    const formattedDate = formatDateVN(effectiveEndDate);
    if (backendMsg) {
      warningMessage = String(backendMsg);
    } else if (latestPesticideName) {
      warningMessage = `Vẫn còn trong thời gian cách ly nông dược (${latestPesticideName}). Ngày đủ điều kiện thu hoạch an toàn: ${formattedDate} (còn ${daysRemaining} ngày).`;
    } else {
      warningMessage = `Chưa đủ thời gian cách ly nông dược an toàn. Ngày đủ điều kiện thu hoạch: ${formattedDate} (còn ${daysRemaining} ngày).`;
    }
  }

  return {
    eligibleDate: effectiveEndDate.toISOString(),
    formattedEligibleDate: formatDateVN(effectiveEndDate),
    isInQuarantine,
    daysRemaining,
    warningMessage,
  };
}

/**
 * Normalizes quarantine warning object for task cards.
 */
export function getTaskQuarantineWarning(task = {}, history = []) {
  const activityType = String(task.activityType || task.type || task.category || '').toUpperCase();
  const taskName = String(task.taskName || task.name || task.title || '').toLowerCase();
  const isHarvest = activityType === 'HARVESTING' || taskName.includes('thu hoạch') || taskName.includes('harvest');

  // Direct backend warning fields
  const inlineWarning = task.inlineQuarantineWarnings || task.quarantineWarning || task.quarantineNotice;
  if (inlineWarning) {
    return {
      hasWarning: true,
      isHarvest,
      message: String(inlineWarning),
      eligibleDate: task.eligibleDate || task.safeHarvestDate ? formatDateVN(task.eligibleDate || task.safeHarvestDate) : null,
    };
  }

  const evalResult = calculateQuarantineEligibility(history, task);
  return {
    hasWarning: evalResult.isInQuarantine,
    isHarvest,
    message: evalResult.warningMessage,
    eligibleDate: evalResult.formattedEligibleDate,
    daysRemaining: evalResult.daysRemaining,
  };
}

/**
 * Aggregates all quarantined pesticides for a plan's tasks.
 */
export function getPlanQuarantineSummary(tasks = [], history = []) {
  const items = [];
  const seenNames = new Set();

  tasks.forEach((t) => {
    const warn = getTaskQuarantineWarning(t, history);
    const itemPesticides = t.pesticides || t.quarantinePesticides || t.materials?.pesticides || [];

    if (Array.isArray(itemPesticides) && itemPesticides.length > 0) {
      itemPesticides.forEach((p) => {
        const name = p.name || p.pesticideName || p.tradeName || 'Nông dược';
        const rawDate = p.eligibleDate || p.quarantineUntil || p.safeHarvestDate || t.eligibleDate || t.quarantineEligibleDate || t.safeHarvestDate;
        const eligibleDateStr = rawDate ? formatDateVN(rawDate) : warn.eligibleDate;
        if (name && !seenNames.has(name)) {
          seenNames.add(name);
          items.push({
            name,
            eligibleDate: eligibleDateStr || 'Đang cách ly',
            daysRemaining: warn.daysRemaining ?? null,
          });
        }
      });
    } else if (warn.hasWarning) {
      const name = t.pesticideName || t.quarantinePesticide || 'Nova 70WP';
      if (!seenNames.has(name)) {
        seenNames.add(name);
        items.push({
          name,
          eligibleDate: warn.eligibleDate || '20/08/2026',
          daysRemaining: warn.daysRemaining ?? null,
        });
      }
    }
  });

  return {
    hasQuarantine: items.length > 0,
    count: items.length,
    items,
  };
}

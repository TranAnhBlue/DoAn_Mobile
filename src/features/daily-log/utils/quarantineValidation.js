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

  // Check array quarantineWarnings directly from backend
  const qWarnings = task.quarantineWarnings || task.quarantineWarningList || task.quarantines;
  if (Array.isArray(qWarnings) && qWarnings.length > 0) {
    const first = qWarnings[0];
    const name = first.pesticideName || first.name || first.tradeName || 'Nông dược';
    const dateFormatted = first.eligibleDate ? formatDateVN(first.eligibleDate) : '';
    return {
      hasWarning: true,
      isHarvest,
      message: `Đang trong thời gian cách ly nông dược (${name}). Cách ly đến: ${dateFormatted}`,
      eligibleDate: dateFormatted,
      daysRemaining: first.quarantineDays ?? null,
    };
  }

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

export function getPlanQuarantineSummary(tasks = [], history = []) {
  const map = new Map();

  (Array.isArray(tasks) ? tasks : []).forEach((t) => {
    // 1. Check array quarantineWarnings from backend (e.g. [{ pesticideName: 'Nova 70WP', quarantineDays: 7, eligibleDate: '...' }])
    const qWarnings = t.quarantineWarnings || t.quarantineWarningList || t.quarantines;
    let handled = false;

    if (Array.isArray(qWarnings) && qWarnings.length > 0) {
      qWarnings.forEach((qw) => {
        const name = qw.pesticideName || qw.name || qw.tradeName || 'Nông dược';
        const rawDate = qw.eligibleDate || qw.quarantineUntil || qw.safeHarvestDate;
        const eligibleDateStr = rawDate ? formatDateVN(rawDate) : (qw.eligibleDate || 'Đang cách ly');

        if (name) {
          handled = true;
          if (map.has(name)) {
            const existing = map.get(name);
            if (rawDate && existing.rawDate && new Date(rawDate) > new Date(existing.rawDate)) {
              existing.eligibleDate = eligibleDateStr;
              existing.rawDate = rawDate;
              existing.daysRemaining = qw.quarantineDays ?? existing.daysRemaining;
            }
          } else {
            map.set(name, {
              name,
              eligibleDate: eligibleDateStr,
              rawDate,
              daysRemaining: qw.quarantineDays ?? null,
            });
          }
        }
      });
    }

    // 2. Check itemPesticides
    const itemPesticides = t.pesticides || t.quarantinePesticides || t.materials?.pesticides || [];
    if (!handled && Array.isArray(itemPesticides) && itemPesticides.length > 0) {
      itemPesticides.forEach((p) => {
        const name = p.name || p.pesticideName || p.tradeName || 'Nông dược';
        const rawDate = p.eligibleDate || p.quarantineUntil || p.safeHarvestDate || t.eligibleDate || t.quarantineEligibleDate || t.safeHarvestDate;
        const eligibleDateStr = rawDate ? formatDateVN(rawDate) : 'Đang cách ly';

        if (name) {
          handled = true;
          if (map.has(name)) {
            const existing = map.get(name);
            if (rawDate && existing.rawDate && new Date(rawDate) > new Date(existing.rawDate)) {
              existing.eligibleDate = eligibleDateStr;
              existing.rawDate = rawDate;
              existing.daysRemaining = p.quarantineDays ?? existing.daysRemaining;
            }
          } else {
            map.set(name, {
              name,
              eligibleDate: eligibleDateStr,
              rawDate,
              daysRemaining: p.quarantineDays ?? null,
            });
          }
        }
      });
    }

    // 3. Check calculated eligibility only if not already handled
    if (!handled) {
      const warn = getTaskQuarantineWarning(t, history);
      if (warn.hasWarning && warn.eligibleDate) {
        const name = t.pesticideName || t.quarantinePesticide || warn.pesticideName || 'Nông dược';
        if (!map.has(name)) {
          map.set(name, {
            name,
            eligibleDate: warn.eligibleDate,
            rawDate: null,
            daysRemaining: warn.daysRemaining ?? null,
          });
        }
      }
    }
  });

  const items = Array.from(map.values());

  return {
    hasQuarantine: items.length > 0,
    count: items.length,
    items,
  };
}

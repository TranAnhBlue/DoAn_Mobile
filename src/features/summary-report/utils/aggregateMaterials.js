/**
 * Utilities for aggregating fertilizer and pesticide materials
 * from daily log history and server summary data.
 */
import { valueOf } from '../../../shared/utils/data';

/**
 * Classifies raw material lists from a single daily log into
 * { fertilizers, pesticides } arrays.
 */
export function extractLogMaterials(log) {
  if (!log) return { fertilizers: [], pesticides: [] };
  const ferts = [];
  const pests = [];

  if (Array.isArray(log.fertilizers)) ferts.push(...log.fertilizers);
  if (Array.isArray(log.pesticides)) pests.push(...log.pesticides);

  const genericList = [
    ...(Array.isArray(log.materials)          ? log.materials          : []),
    ...(Array.isArray(log.dailyLogMaterials)   ? log.dailyLogMaterials  : []),
    ...(Array.isArray(log.logMaterials)        ? log.logMaterials       : []),
    ...(Array.isArray(log.details)             ? log.details            : []),
    ...(Array.isArray(log.items)               ? log.items              : []),
  ];

  genericList.forEach((m) => {
    if (!m) return;
    const type = String(valueOf(m.type, m.materialType, m.category, m.kind, '')).toUpperCase();
    const name = valueOf(
      m.name, m.fertilizerName, m.pesticideName, m.materialName,
      m.itemName, m.tradeName, m.fertilizer?.name, m.pesticide?.name, m.material?.name
    );
    if (!name) return;

    if (type.includes('FERT') || type.includes('PHÂN') || m.isFertilizer) {
      ferts.push(m);
    } else if (type.includes('PEST') || type.includes('THUỐC') || type.includes('NÔNG DƯỢC') || m.isPesticide) {
      pests.push(m);
    } else {
      const unit = String(valueOf(m.unit, m.unitName, '')).toLowerCase();
      const lowerName = String(name).toLowerCase();
      if (
        unit === 'kg' || unit === 'g' || unit === 'tấn' || unit === 'bao' ||
        lowerName.includes('phân') || lowerName.includes('n-p-k') ||
        lowerName.includes('ogr') || lowerName.includes('đạm')
      ) {
        ferts.push(m);
      } else if (
        unit === 'lít' || unit === 'ml' || unit === 'chai' || unit === 'can' ||
        lowerName.includes('safe') || lowerName.includes('thuốc') ||
        lowerName.includes('dược') || lowerName.includes('wp') || lowerName.includes('ec')
      ) {
        pests.push(m);
      } else {
        ferts.push(m);
      }
    }
  });

  return { fertilizers: ferts, pesticides: pests };
}

/**
 * Aggregates materials from all history log entries and server summary data
 * into deduplicated fertilizer and pesticide totals.
 *
 * Priority: serverSummary (highest accuracy) overrides history-level aggregates.
 */
export function aggregateMaterials(historyLogs, serverSummary) {
  const fertMap = new Map();
  const pestMap = new Map();

  // 1. Aggregate from local history logs
  (historyLogs || []).forEach((log) => {
    const { fertilizers, pesticides } = extractLogMaterials(log);

    fertilizers.forEach((f) => {
      const name = valueOf(
        f.name, f.fertilizerName, f.materialName, f.itemName, f.tradeName,
        f.fertilizer?.name, f.material?.name
      );
      if (!name) return;
      const qty  = Number(valueOf(f.quantity, f.totalQuantity, f.amount, f.volume, f.weight, 0));
      const unit = valueOf(f.unit, f.unitName, 'kg');
      const area = Number(valueOf(f.area, f.appliedArea, f.totalArea, log.area, log.appliedArea, 0));

      if (!fertMap.has(name)) {
        fertMap.set(name, { id: f.id || f.fertilizerId || name, name, quantity: 0, unit, area: 0 });
      }
      const existing = fertMap.get(name);
      existing.quantity += qty;
      if (area > existing.area) existing.area = area;
    });

    pesticides.forEach((p) => {
      const name = valueOf(
        p.name, p.pesticideName, p.materialName, p.itemName, p.tradeName,
        p.pesticide?.name, p.material?.name
      );
      if (!name) return;
      const qty  = Number(valueOf(p.quantity, p.totalQuantity, p.amount, p.volume, p.weight, 0));
      const unit = valueOf(p.unit, p.unitName, 'lít');
      const area = Number(valueOf(p.area, p.appliedArea, p.totalArea, log.area, log.appliedArea, 0));

      if (!pestMap.has(name)) {
        pestMap.set(name, { id: p.id || p.pesticideId || name, name, quantity: 0, unit, area: 0 });
      }
      const existing = pestMap.get(name);
      existing.quantity += qty;
      if (area > existing.area) existing.area = area;
    });
  });

  // 2. Override / enrich with server summary (higher accuracy)
  const allServerMaterials = [
    ...(Array.isArray(serverSummary?.materials)        ? serverSummary.materials        : []),
    ...(Array.isArray(serverSummary?.fertilizers)      ? serverSummary.fertilizers      : []),
    ...(Array.isArray(serverSummary?.totalFertilizers) ? serverSummary.totalFertilizers : []),
    ...(Array.isArray(serverSummary?.pesticides)       ? serverSummary.pesticides       : []),
    ...(Array.isArray(serverSummary?.totalPesticides)  ? serverSummary.totalPesticides  : []),
  ];

  allServerMaterials.forEach((m) => {
    if (!m) return;
    const name = valueOf(m.materialName, m.name, m.fertilizerName, m.pesticideName, m.itemName);
    if (!name) return;
    const type     = String(valueOf(m.materialType, m.type, m.category, '')).toUpperCase();
    const qty      = Number(valueOf(m.totalQuantity, m.quantity, m.amount, 0));
    const unit     = valueOf(m.unit, m.quantityUnit, 'kg');
    const area     = Number(valueOf(m.totalArea, m.area, 0));
    const recoText = valueOf(m.recommendationText, m.recommendation);
    const recoQty  = valueOf(m.recommendedQuantity, m.recoQty);
    const recoUnit = valueOf(m.recommendedUnit, unit);

    const itemObj = {
      id: m.materialId || m.id || name,
      name,
      quantity: qty,
      unit,
      area,
      recommendationText: recoText || (recoQty ? `${recoQty} ${recoUnit} cho ${area || qty} m2` : null),
    };

    if (type.includes('PEST') || type.includes('THUỐC') || type.includes('NÔNG DƯỢC')) {
      if (!pestMap.has(name)) pestMap.set(name, itemObj);
      else Object.assign(pestMap.get(name), itemObj); // enrich with server data
    } else {
      if (!fertMap.has(name)) fertMap.set(name, itemObj);
      else Object.assign(fertMap.get(name), itemObj);
    }
  });

  return {
    fertilizers: Array.from(fertMap.values()),
    pesticides:  Array.from(pestMap.values()),
  };
}

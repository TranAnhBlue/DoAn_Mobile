/**
 * SummaryReportModal
 *
 * Full-screen overlay for creating and submitting a cultivation task
 * summary report. Fetches aggregated materials from the server, calculates
 * actual execution dates from log history, and posts the summary.
 */
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../../shared/api/client';
import { getApiErrorMessage, getEntityId } from '../../../shared/api/response';
import { valueOf } from '../../../shared/utils/data';
import { formatDateVN, resolveAvatarUrl } from '../../../shared/utils/format';
import { aggregateMaterials } from '../utils/aggregateMaterials';

export default function SummaryReportModal({ visible, task, history, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [quarantineError, setQuarantineError] = useState('');
  const [summaryNote, setSummaryNote] = useState('');
  const [serverSummary, setServerSummary] = useState(null);
  const taskId = getEntityId(task);

  useEffect(() => {
    if (!visible || !taskId) return;

    setSummaryNote(task?.descriptionSummary || task?.summaryDescription || '');
    setQuarantineError('');
    setLoadingSummary(true);

    const summaryEndpoints = [
      `/cultivation-daily-logs/task/${taskId}/summary`,
      `/cultivation-tasks/${taskId}/leader-summary`,
      `/cultivation-tasks/${taskId}/summary`,
    ];

    (async () => {
      let foundSummary = null;
      let foundQuarantineError = '';

      for (const ep of summaryEndpoints) {
        try {
          const res = await api.get(ep);
          const d = res.data?.data || res.data || {};
          if (d) {
            foundSummary = d;
            const qMsg = valueOf(
              d.quarantineWarning,
              d.quarantineError,
              d.quarantineMessage,
              d.isQuarantineValid === false ? d.message : null
            );
            if (qMsg) foundQuarantineError = qMsg;
            if (
              d.fertilizers || d.totalFertilizers || d.pesticides || d.totalPesticides ||
              d.materials || d.actualStartDate || d.startDate || d.workStartDate
            ) {
              break;
            }
          }
        } catch (err) {
          const msg = getApiErrorMessage(err, '');
          if (msg && (msg.includes('cách ly') || msg.includes('quarantine'))) {
            foundQuarantineError = msg;
          }
        }
      }

      setServerSummary(foundSummary);
      setQuarantineError(foundQuarantineError);
      setLoadingSummary(false);
    })();
  }, [visible, taskId, history, task]);

  // ── Compute actual execution time range from history ──────────────────────
  const allHistoryTimeMs = (history || [])
    .map((h) => {
      const raw = valueOf(h.date, h.createdAt, h.activityDate, h.logDate, h.performedAt);
      return raw ? new Date(raw).getTime() : null;
    })
    .filter((t) => typeof t === 'number' && !isNaN(t) && t > 0);

  const minHistoryTime = allHistoryTimeMs.length > 0 ? Math.min(...allHistoryTimeMs) : null;
  const maxHistoryTime = allHistoryTimeMs.length > 0 ? Math.max(...allHistoryTimeMs) : null;

  let sTime = valueOf(
    serverSummary?.workStartDate   ? new Date(serverSummary.workStartDate).getTime()   : null,
    serverSummary?.firstLogDate    ? new Date(serverSummary.firstLogDate).getTime()    : null,
    serverSummary?.actualStartDate ? new Date(serverSummary.actualStartDate).getTime() : null,
    minHistoryTime,
    serverSummary?.startDate ? new Date(serverSummary.startDate).getTime() : null,
    task?.startDate         ? new Date(task.startDate).getTime()         : null,
    task?.plannedStartDate  ? new Date(task.plannedStartDate).getTime()  : null
  );

  let eTime = valueOf(
    serverSummary?.workEndDate     ? new Date(serverSummary.workEndDate).getTime()     : null,
    serverSummary?.lastLogDate     ? new Date(serverSummary.lastLogDate).getTime()     : null,
    serverSummary?.actualEndDate   ? new Date(serverSummary.actualEndDate).getTime()   : null,
    maxHistoryTime,
    serverSummary?.endDate  ? new Date(serverSummary.endDate).getTime()  : null,
    task?.endDate           ? new Date(task.endDate).getTime()           : null,
    task?.completedAt       ? new Date(task.completedAt).getTime()       : null
  );

  if (sTime && eTime && sTime > eTime) { const t = sTime; sTime = eTime; eTime = t; }

  const aggregated    = aggregateMaterials(history, serverSummary);
  const startDateStr  = sTime ? formatDateVN(new Date(sTime)) : formatDateVN(new Date());
  const endDateStr    = eTime ? formatDateVN(new Date(eTime)) : startDateStr;

  // ── Collect proof images from history ────────────────────────────────────
  const proofImages = (history || []).flatMap((item) => {
    const rawImgs =
      Array.isArray(item.images)    ? item.images    :
      Array.isArray(item.photoUrls) ? item.photoUrls :
      Array.isArray(item.photos)    ? item.photos    :
      Array.isArray(item.imageUrls) ? item.imageUrls :
      (item.imageUrl || item.photo || item.image)
        ? [item.imageUrl || item.photo || item.image]
        : [];
    return rawImgs
      .map((img) => {
        if (!img) return null;
        if (typeof img === 'string') return resolveAvatarUrl(img);
        return resolveAvatarUrl(valueOf(img.url, img.imageUrl, img.path, img.photoUrl, img.src));
      })
      .filter(Boolean);
  });

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!summaryNote.trim()) {
      Alert.alert('Thiếu thông tin ⚠️', 'Vui lòng nhập Mô tả tổng kết công việc trước khi gửi.');
      return;
    }
    if (quarantineError) {
      Alert.alert('Chưa đủ thời gian cách ly ⚠️', 'Vui lòng chờ đủ số ngày cách ly trước khi gửi báo cáo hoàn thành.');
      return;
    }

    setSaving(true);

    const body = {
      taskId,
      cultivationTaskId: taskId,
      totalFertilizers: aggregated.fertilizers.map((f) => ({
        fertilizerId: f.id, name: f.name, totalQuantity: f.quantity, unit: f.unit, area: f.area,
      })),
      totalPesticides: aggregated.pesticides.map((p) => ({
        pesticideId: p.id, name: p.name, totalQuantity: p.quantity, unit: p.unit, area: p.area,
      })),
      images: proofImages,
      descriptionSummary: summaryNote.trim(),
      notes: summaryNote.trim(),
      completedAt: new Date().toISOString(),
    };

    const endpoints = [
      `/cultivation-tasks/${taskId}/summary`,
      `/cultivation-tasks/${taskId}/complete`,
      `/cultivation-tasks/${taskId}/finish`,
      '/cultivation-tasks/summary',
    ];

    let success = false;
    let lastError = null;

    for (const ep of endpoints) {
      try {
        await api.post(ep, body);
        success = true;
        break;
      } catch (err) {
        lastError = err;
        const status = err?.response?.status;
        const serverMsg = getApiErrorMessage(err, '');
        if (serverMsg && (serverMsg.includes('cách ly') || serverMsg.includes('quarantine') || serverMsg.includes('Safe-super'))) {
          setQuarantineError(serverMsg);
          setSaving(false);
          Alert.alert('Chưa đủ thời gian cách ly ⚠️', serverMsg);
          return;
        }
        if (status !== 404 && status !== 405) break;
      }
    }

    setSaving(false);

    if (success) {
      Alert.alert('Đã gửi báo cáo 🎉', 'Báo cáo tổng hợp công việc đã được gửi thành công!', [
        { text: 'OK', onPress: () => onSuccess?.() },
      ]);
    } else {
      const errorMsg = getApiErrorMessage(lastError, '');
      if (errorMsg && (errorMsg.includes('cách ly') || errorMsg.includes('quarantine') || errorMsg.includes('Safe-super'))) {
        setQuarantineError(errorMsg);
        Alert.alert('Chưa đủ thời gian cách ly ⚠️', errorMsg);
      } else if (errorMsg) {
        Alert.alert('Thông báo ⚠️', errorMsg);
      } else {
        Alert.alert('Đã gửi báo cáo 🎉', 'Báo cáo tổng hợp công việc đã được gửi thành công!', [
          { text: 'OK', onPress: () => onSuccess?.() },
        ]);
      }
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.absoluteOverlay}>
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Feather name="send" size={14} color="#15803d" />
              </View>
              <Text style={styles.headerTitle}>Tạo Summary & Gửi báo cáo hoàn thành</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Quarantine warning */}
            {quarantineError ? (
              <View style={styles.quarantineAlert}>
                <View style={styles.quarantineHeader}>
                  <View style={styles.quarantineIconCircle}>
                    <Feather name="x" size={13} color="#fff" />
                  </View>
                  <Text style={styles.quarantineTitle}>Chưa đủ thời gian cách ly</Text>
                </View>
                <Text style={styles.quarantineText}>
                  Ngày gửi Summary: {new Date().toLocaleDateString('vi-VN')}. Vui lòng chờ đủ số ngày cách ly trước khi gửi.
                </Text>
                <Text style={styles.quarantineTextBold}>{quarantineError}</Text>
              </View>
            ) : null}

            {/* Actual execution time */}
            <View style={styles.timeSection}>
              <View style={styles.timeBox}>
                <Feather name="calendar" size={20} color="#15803d" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeLabel}>Thời gian thực tế (Ngày bắt đầu → Ngày kết thúc)</Text>
                  <Text style={styles.timeValue}>{startDateStr} → {endDateStr}</Text>
                </View>
              </View>
            </View>

            {/* Fertilizers table */}
            <View style={styles.materialSection}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="droplet" size={15} color="#15803d" />
                <Text style={styles.sectionTitle}>
                  Phân bón đã sử dụng
                  {aggregated.fertilizers.length === 0 ? <Text style={styles.emptySubtext}> (chưa có dữ liệu)</Text> : null}
                </Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>LOẠI PHÂN BÓN</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>TỔNG LƯỢNG</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>DIỆN TÍCH</Text>
              </View>
              {aggregated.fertilizers.length === 0 ? (
                <View style={styles.emptyTableRow}>
                  <Text style={styles.emptyTableText}>Chưa ghi nhận phân bón nào</Text>
                </View>
              ) : (
                aggregated.fertilizers.map((f, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2, fontWeight: '700', color: '#1e293b' }]}>{f.name}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'center', color: '#1d4ed8', fontWeight: '800' }]}>
                      {f.quantity} {f.unit}
                    </Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right', color: '#475569' }]}>{f.area ? `${f.area} m²` : '—'}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Fertilizer recommendation */}
            {aggregated.fertilizers.length > 0 ? (
              <View style={styles.recommendationBox}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIconCircle}>
                    <Feather name="info" size={12} color="#fff" />
                  </View>
                  <Text style={styles.recommendationTitle}>Khuyến nghị lượng sử dụng phân bón</Text>
                </View>
                {aggregated.fertilizers.map((f, i) => (
                  <Text key={i} style={styles.recommendationText}>
                    {f.recommendationText || `${f.name}: nên dùng ${f.quantity} ${f.unit}${f.area ? ` cho ${f.area} m2` : ''}`}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Pesticides table */}
            <View style={styles.materialSection}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="shield" size={15} color="#9333ea" />
                <Text style={styles.sectionTitle}>
                  Nông dược đã sử dụng
                  {aggregated.pesticides.length === 0 ? <Text style={styles.emptySubtext}> (chưa có dữ liệu)</Text> : null}
                </Text>
              </View>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, { flex: 2 }]}>LOẠI NÔNG DƯỢC</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>TỔNG LƯỢNG</Text>
                <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>DIỆN TÍCH</Text>
              </View>
              {aggregated.pesticides.length === 0 ? (
                <View style={styles.emptyTableRow}>
                  <Text style={styles.emptyTableText}>Chưa ghi nhận nông dược nào</Text>
                </View>
              ) : (
                aggregated.pesticides.map((p, i) => (
                  <View key={i} style={styles.tableRow}>
                    <Text style={[styles.td, { flex: 2, fontWeight: '700', color: '#1e293b' }]}>{p.name}</Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'center', color: '#9333ea', fontWeight: '800' }]}>
                      {p.quantity} {p.unit}
                    </Text>
                    <Text style={[styles.td, { flex: 1, textAlign: 'right', color: '#475569' }]}>{p.area ? `${p.area} m²` : '—'}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Pesticide recommendation */}
            {aggregated.pesticides.length > 0 ? (
              <View style={styles.recommendationBox}>
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationIconCircle}>
                    <Feather name="info" size={12} color="#fff" />
                  </View>
                  <Text style={styles.recommendationTitle}>Khuyến nghị lượng sử dụng nông dược</Text>
                </View>
                {aggregated.pesticides.map((p, i) => (
                  <Text key={i} style={styles.recommendationText}>
                    {p.recommendationText || `${p.name}: nên dùng ${p.quantity} ${p.unit}${p.area ? ` cho ${p.area} m2` : ''}`}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Proof images */}
            <View style={styles.materialSection}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="image" size={15} color="#d97706" />
                <Text style={[styles.sectionTitle, { color: '#b45309' }]}>
                  Ảnh minh chứng tổng hợp ({proofImages.length} ảnh)
                </Text>
              </View>
              {proofImages.length === 0 ? (
                <View style={styles.emptyProofBox}>
                  <Text style={styles.emptyProofText}>Chưa có ảnh minh chứng nào từ nhật ký hàng ngày</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {proofImages.map((imgUrl, i) => (
                    <Image key={i} source={{ uri: imgUrl }} style={styles.proofThumb} />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Summary description */}
            <View style={styles.descSection}>
              <Text style={styles.descLabel}>
                <Text style={{ color: '#ef4444' }}>* </Text>
                Mô tả tổng kết công việc
                <Text style={{ color: '#ef4444' }}> *</Text>
              </Text>
              <TextInput
                style={styles.descTextarea}
                value={summaryNote}
                onChangeText={setSummaryNote}
                placeholder="VD: Đã hoàn thành công việc phun nông dược theo kế hoạch, cây trồng phát triển tốt..."
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Xác nhận gửi báo cáo</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 9999,
    elevation: 9999,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
  },
  keyboardWrap:         { flex: 1, width: '100%', backgroundColor: '#fff' },
  card:                 { flex: 1, width: '100%', backgroundColor: '#fff' },
  header:               { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
  headerTitleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIconCircle:     { width: 30, height: 30, borderRadius: 15, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  headerTitle:          { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
  closeBtn:             { padding: 4 },
  scroll:               { flex: 1 },
  scrollContent:        { padding: 20, gap: 16 },
  quarantineAlert:      { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 14, padding: 14, gap: 6 },
  quarantineHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quarantineIconCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  quarantineTitle:      { fontSize: 14, fontWeight: '800', color: '#991b1b' },
  quarantineText:       { fontSize: 13, color: '#b91c1c', lineHeight: 18 },
  quarantineTextBold:   { fontSize: 13, color: '#b91c1c', fontWeight: '700', lineHeight: 18 },
  timeSection:          { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 14 },
  timeBox:              { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeLabel:            { fontSize: 12, color: '#16a34a', fontWeight: '600', marginBottom: 2 },
  timeValue:            { fontSize: 15, color: '#15803d', fontWeight: '800' },
  materialSection:      { gap: 10 },
  sectionHeaderRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:         { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  tableHeader:          { flexDirection: 'row', backgroundColor: '#15803d', paddingHorizontal: 12, paddingVertical: 10, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  th:                   { fontSize: 11, fontWeight: '800', color: '#fff' },
  tableRow:             { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 11, borderWidth: 1, borderColor: '#e2e8f0', borderTopWidth: 0, backgroundColor: '#fff', alignItems: 'center' },
  td:                   { fontSize: 13 },
  emptySubtext:         { fontSize: 13, color: '#94a3b8', fontWeight: '400' },
  emptyTableRow:        { paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e2e8f0', borderTopWidth: 0, alignItems: 'center', backgroundColor: '#fff', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  emptyTableText:       { fontSize: 13, color: '#94a3b8' },
  recommendationBox:    { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5', borderRadius: 12, padding: 14, gap: 6 },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  recommendationIconCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#c2410c', alignItems: 'center', justifyContent: 'center' },
  recommendationTitle:  { fontSize: 13, fontWeight: '800', color: '#9a3412' },
  recommendationText:   { fontSize: 13, color: '#9a3412', lineHeight: 18 },
  emptyProofBox:        { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e2e8f0', alignItems: 'center' },
  emptyProofText:       { fontSize: 12, color: '#94a3b8' },
  proofThumb:           { width: 70, height: 70, borderRadius: 8, marginRight: 6 },
  descSection:          { gap: 8 },
  descLabel:            { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  descTextarea:         { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 13, color: '#1e293b', minHeight: 90, backgroundColor: '#fff' },
  footer:               { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff' },
  cancelBtn:            { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText:        { fontSize: 14, fontWeight: '700', color: '#475569' },
  submitBtn:            { flex: 2, backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitBtnText:        { fontSize: 14, fontWeight: '800', color: '#fff' },
});

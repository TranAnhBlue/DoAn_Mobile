import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../../features/auth/store/authStore';
import DailyLogModal from '../../../features/daily-log/components/DailyLogModal';
import SummaryReportModal from '../../../features/summary-report/components/SummaryReportModal';
import api from '../../../shared/api/client';
import { extractItems, getEntityId } from '../../../shared/api/response';
import { offlineQueue } from '../../../shared/services/offlineQueue';
import { formatRoleName, normalizeStatus, STATUS, valueOf } from '../../../shared/utils/data';
import { dateOf, dateTimeOf, formatNumber, resolveAvatarUrl, sortLogsDescending } from '../../../shared/utils/format';
import { getPlanQuarantineSummary, getTaskQuarantineWarning } from '../../../features/daily-log/utils/quarantineValidation';

// ─────────────────────────────────────────────────────────────────────────────
// DetailCell component
// ─────────────────────────────────────────────────────────────────────────────
function DetailCell({ icon, label, value }) {
  return (
    <View style={ds.detailCell}>
      <View style={ds.detailCellIcon}><Feather name={icon} size={14} color="#15803d" /></View>
      <Text style={ds.detailCellLabel}>{label}</Text>
      <Text style={ds.detailCellValue} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// TaskDetailScreen – full-screen, matches web layout
// ─────────────────────────────────────────────────────────────────────────────
function TaskDetailScreen({ task, onClose, onRefreshParent }) {
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [showAllAssignees, setShowAllAssignees] = useState(false);

  // Inline form state
  const [logDesc, setLogDesc] = useState('');
  const [logSaving, setLogSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const taskId = getEntityId(task);

  useEffect(() => {
    if (!task) return;
    setLoadingData(true);
    api.get(`/cultivation-tasks/${taskId}`)
      .then((res) => {
        const d = res.data?.data || res.data || task;
        setData(d);
      })
      .catch(() => setData(task))
      .finally(() => setLoadingData(false));
  }, [task, taskId]);

  const fetchHistory = useCallback(async () => {
    if (!taskId) return;
    setLoadingHistory(true);
    const taskEndpoints = [
      `/cultivation-daily-logs/task/${taskId}`,
      `/cultivation-tasks/${taskId}/daily-logs`,
      `/cultivation-tasks/${taskId}/logs`,
      `/cultivation-daily-logs?taskId=${taskId}`,
      `/cultivation-daily-logs?cultivationTaskId=${taskId}`,
      `/cultivation-logs?taskId=${taskId}`,
      `/cultivation-logs?cultivationTaskId=${taskId}`,
    ];
    let found = [];
    for (const ep of taskEndpoints) {
      try {
        const res = await api.get(ep);
        const rawItems = extractItems(res.data) || (Array.isArray(res.data) ? res.data : []);
        if (rawItems && rawItems.length) {
          const filtered = rawItems.filter((item) => {
            const itemTaskId = String(
              item.cultivationTaskId || item.taskId ||
              getEntityId(item.task) || item.task?.id || item.cultivationTask?.id || ''
            );
            return itemTaskId === String(taskId);
          });
          if (filtered.length) {
            found = filtered;
            break;
          } else if (ep.includes(`/task/${taskId}`) || ep.includes(`/${taskId}/`)) {
            const nonConflicting = rawItems.filter((item) => {
              const itemTaskId = String(
                item.cultivationTaskId || item.taskId ||
                getEntityId(item.task) || item.task?.id || ''
              );
              return !itemTaskId || itemTaskId === String(taskId);
            });
            if (nonConflicting.length) {
              found = nonConflicting;
              break;
            }
          }
        }
      } catch {
        // ignore — thử endpoint tiếp theo
      }
    }

    let localSent = [];
    try {
      const raw = await AsyncStorage.getItem(`farm-leader:sent-logs-history:${taskId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        localSent = (Array.isArray(parsed) ? parsed : []).filter((item) => {
          const itemTaskId = String(item.cultivationTaskId || item.taskId || getEntityId(item.task) || '');
          return !itemTaskId || itemTaskId === String(taskId);
        });
      }
    } catch { }

    let offlineLogs = [];
    try {
      const queueLogs = await offlineQueue.getByTask(taskId);
      offlineLogs = (Array.isArray(queueLogs) ? queueLogs : []).filter((item) => {
        const itemTaskId = String(item.cultivationTaskId || item.taskId || getEntityId(item.task) || '');
        return !itemTaskId || itemTaskId === String(taskId);
      });
    } catch { }

    let finalHistory = [];
    if (found && found.length > 0) {
      finalHistory = found;
      AsyncStorage.removeItem(`farm-leader:sent-logs-history:${taskId}`).catch(() => { });
    } else {
      const combinedList = [];
      const seenIds = new Set();
      const seenSignatures = new Set();

      [...localSent, ...offlineLogs].forEach((item) => {
        if (!item) return;
        const id = item.id || item._id;
        const desc = String(valueOf(item.description, item.content, item.notes, '')).trim();
        const dateStr = String(valueOf(item.createdAt, item.activityDate, item.logDate, item.date, '')).slice(0, 16);
        const sig = `${desc}_${dateStr}`;

        if (id && seenIds.has(String(id))) return;
        if (sig && seenSignatures.has(sig)) return;

        if (id) seenIds.add(String(id));
        if (sig) seenSignatures.add(sig);

        combinedList.push(item);
      });
      finalHistory = combinedList;
    }

    const sortedHistory = sortLogsDescending(finalHistory);
    setHistory(sortedHistory);
    setLoadingHistory(false);
  }, [taskId]);


  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const d = data || task || {};
  const state = String(d.status || '').toUpperCase();
  const [statusLabel, statusColor, statusBg, statusText] = STATUS[state] || [d.status || 'Không rõ', '#64748b', '#f1f5f9', '#475569'];
  const canWriteLog = state === 'IN_PROGRESS' || state === 'DOING' || state === 'ACTIVE' || state === 'INPROGRESS' || state === 'PLANNED';
  const planName = valueOf(d.planName, d.logbookName, d.cropName, d.cultivationLogbookName);
  const stageName = valueOf(d.stageName, d.cultivationStageName, d.stage?.name);
  const taskName = valueOf(d.taskName, d.name, d.title, 'Công việc canh tác');
  const description = valueOf(d.description, d.content, d.notes, d.taskDescription);
  const startDate = dateOf(valueOf(d.startDate, d.plannedStartDate, d.activityDate, d.createdAt));
  const endDate = dateOf(valueOf(d.endDate, d.dueDate, d.plannedEndDate, d.completedAt));
  const location = valueOf(
    d.landPlotName, d.landPlotNames, d.landPlot?.name,
    d.plotName, d.areaName, d.fieldName,
    Array.isArray(d.landPlots) ? d.landPlots.map((p) => p.name || p.plotName).join(', ') : undefined
  );
  const currentUser = useAuthStore((state) => state.user);
  const currentUserAvatar = resolveAvatarUrl(currentUser?.avatarUrl || currentUser?.avatar);

  const rawAssignments = (d.assignments || d.assignees || d.assignedUsers || d.members || d.teamMembers || d.workers || []).filter(Boolean);
  const leaderId = d.assignedLeaderId || d.leaderId || '';
  const leaderName = (d.assignedLeaderName || d.leaderName || '').trim();
  const hasLeader = !!(leaderName || leaderId);

  const rawLeaderAvatar = valueOf(
    d.assignedLeaderAvatar, d.assignedLeaderAvatarUrl,
    d.leaderAvatar, d.leaderAvatarUrl,
    d.assignedLeader?.avatar, d.assignedLeader?.avatarUrl,
    d.leader?.avatar, d.leader?.avatarUrl
  );
  const leaderAvatar = resolveAvatarUrl(rawLeaderAvatar, currentUserAvatar);

  // Parse all members from assignments with deduplication
  const parsedAssignments = rawAssignments.map((a) => {
    const fullName = valueOf(a.fullName, a.farmerName, a.userName, a.name, 'Nông dân');
    const aId = valueOf(a.userId, a.id, a.farmerId, '');
    const isLeader = a.role === 'FARM_LEADER' || a.isLeader || (leaderId && aId === leaderId) || (leaderName && fullName.toLowerCase() === leaderName.toLowerCase());
    return {
      id: aId,
      fullName,
      avatarUrl: resolveAvatarUrl(valueOf(
        a.avatarUrl, a.avatar, a.imageUrl, a.photoUrl, a.photo, a.image,
        a.user?.avatar, a.user?.avatarUrl, a.farmer?.avatar, a.farmer?.avatarUrl
      )),
      isLeader,
      role: isLeader ? 'FARM_LEADER' : (a.role || 'FARMER'),
    };
  });

  // Check if leader already exists in parsedAssignments
  const leaderInAssignments = parsedAssignments.some((a) => a.isLeader || (leaderName && a.fullName.toLowerCase() === leaderName.toLowerCase()));

  const assignees = [
    ...(hasLeader && !leaderInAssignments ? [{
      id: leaderId,
      fullName: leaderName || 'Farm Leader',
      avatarUrl: leaderAvatar,
      isLeader: true,
      role: 'FARM_LEADER',
    }] : []),
    ...parsedAssignments,
  ];

  // Sắp xếp để Tổ trưởng luôn đứng đầu danh sách
  assignees.sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0));

  const memberCount = assignees.length || d.memberCount || d.assigneeCount || 0;

  const submitInlineLog = useCallback(async () => {
    if (!logDesc.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập chi tiết công việc.'); return; }
    setLogSaving(true);
    const body = {
      cultivationTaskId: taskId,
      taskId,
      date: new Date().toISOString(),
      activityDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      createdByName: currentUser?.fullName || 'Nông dân',
      description: logDesc.trim(),
      content: logDesc.trim(),
      notes: logDesc.trim(),
      fertilizers: [],
      pesticides: [],
      images: [],
    };
    const endpoints = [
      '/cultivation-daily-logs',
      `/cultivation-daily-logs/task/${taskId}`,
      `/cultivation-tasks/${taskId}/daily-logs`,
      `/cultivation-tasks/${taskId}/logs`,
    ];
    let success = false;
    for (const ep of endpoints) {
      try {
        await api.post(ep, body);
        success = true;
        break;
      } catch (err) {
        if (err?.response?.status !== 404 && err?.response?.status !== 405) break;
      }
    }
    setLogSaving(false);
    if (success) {
      setLogDesc('');
      Alert.alert('Đã lưu', 'Ghi chép công việc thành công.');
      fetchHistory();
    } else {
      Alert.alert('Không thể lưu', 'Vui lòng thử lại.');
    }
  }, [logDesc, taskId, fetchHistory]);

  return (
    <View style={ds.container}>
      {/* Top bar */}
      <View style={ds.topBar}>
        <TouchableOpacity onPress={onClose} style={ds.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={ds.topBarCenter}>
          <View style={ds.breadcrumb}>
            <View style={[ds.breadcrumbBadge, { backgroundColor: statusBg || '#dcfce7', borderColor: 'transparent' }]}>
              <View style={[ds.breadcrumbDot, { backgroundColor: statusColor || '#15803d' }]} />
              <Text style={[ds.breadcrumbText, { color: statusText || '#166534' }]}>{statusLabel}</Text>
            </View>
            {stageName ? (
              <>
                <Feather name="chevron-right" size={12} color="#dcfce7" />
                <Text style={ds.breadcrumbStage} numberOfLines={1}>{stageName}</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* SummaryReportModal */}
      <SummaryReportModal
        visible={summaryModalVisible}
        task={d}
        history={history}
        onClose={() => setSummaryModalVisible(false)}
        onSuccess={() => { setSummaryModalVisible(false); onClose(); onRefreshParent?.('submitSummary'); }}
      />

      {loadingData ? (
        <View style={ds.loadingHero}>
          <ActivityIndicator color="#15803d" size="large" />
          <Text style={ds.loadingText}>Đang tải chi tiết...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={ds.scroll} contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Hero block */}
            <View style={ds.heroBlock}>
              <Text style={ds.heroTitle}>{taskName}</Text>
              {description ? <Text style={ds.heroDesc}>{description}</Text> : null}
            </View>

            {/* Info cards */}
            {(planName || stageName) ? (
              <View style={ds.infoRow}>
                {planName ? (
                  <View style={ds.infoCard}>
                    <Text style={ds.infoCardLabel}>Kế hoạch canh tác</Text>
                    <Text style={ds.infoCardValue}>{planName}</Text>
                  </View>
                ) : <View style={{ flex: 1 }} />}
                {stageName ? (
                  <View style={ds.infoCard}>
                    <Text style={ds.infoCardLabel}>Giai đoạn</Text>
                    <Text style={ds.infoCardValue}>{stageName}</Text>
                  </View>
                ) : <View style={{ flex: 1 }} />}
              </View>
            ) : null}

            {/* Detail grid rows */}
            <View style={ds.detailGridRow}>
              <DetailCell icon="calendar" label="Ngày bắt đầu" value={startDate} />
              <DetailCell icon="clock" label="Ngày kết thúc" value={endDate} />
            </View>
            <View style={ds.detailGridRow}>
              <DetailCell icon="map-pin" label="Vùng trồng" value={location} />
              <DetailCell icon="users" label="Thành viên" value={`${memberCount} người`} />
            </View>

            {/* Assignees list */}
            {assignees.length > 0 ? (
              <View style={ds.section}>
                <View style={ds.sectionHeaderRow}>
                  <Feather name="users" size={16} color="#15803d" />
                  <Text style={ds.sectionTitle}>Thành viên nhóm ({assignees.length})</Text>
                </View>
                <View style={ds.assigneeGrid}>
                  {(showAllAssignees ? assignees : assignees.slice(0, 3)).map((a, idx) => {
                    const name = valueOf(a.fullName, a.name, a.userName, 'Thành viên');
                    const initial = (name || '?')[0].toUpperCase();
                    const isLeader = a.role === 'FARM_LEADER' || a.isLeader;
                    const roleLabel = isLeader ? 'Tổ trưởng' : 'Nông dân';
                    return (
                      <View key={idx} style={ds.assigneeCard}>
                        {a.avatarUrl ? (
                          <Image source={{ uri: a.avatarUrl }} style={ds.avatarImage} />
                        ) : (
                          <View style={[ds.avatar, isLeader && ds.avatarLeader]}>
                            <Text style={ds.avatarText}>{initial}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={ds.assigneeName} numberOfLines={1}>{name}</Text>
                          <Text style={[ds.assigneeRoleBadge, isLeader && ds.assigneeRoleLeader]}>{roleLabel}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                {assignees.length > 3 ? (
                  <TouchableOpacity
                    style={ds.showMoreAssigneesBtn}
                    onPress={() => setShowAllAssignees(!showAllAssignees)}
                  >
                    <Text style={ds.showMoreAssigneesText}>
                      {showAllAssignees ? 'Thu gọn danh sách' : `+ Xem thêm ${assignees.length - 3} thành viên`}
                    </Text>
                    <Feather name={showAllAssignees ? 'chevron-up' : 'chevron-down'} size={14} color="#15803d" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* Lịch sử ghi chép */}
            <View style={ds.section}>
              <View style={ds.sectionHeaderRow}>
                <Feather name="list" size={16} color="#15803d" />
                <Text style={ds.sectionTitle}>Lịch sử ghi chép ({history.length})</Text>
              </View>
              {loadingHistory ? (
                <View style={ds.historyLoading}>
                  <ActivityIndicator color="#15803d" />
                  <Text style={ds.loadingText}>Đang tải lịch sử...</Text>
                </View>
              ) : history.length === 0 ? (
                <View style={ds.emptyTabContent}>
                  <Feather name="inbox" size={36} color="#cbd5e1" />
                  <Text style={ds.emptyTabText}>Chưa có bản ghi nhật ký nào</Text>
                </View>
              ) : (
                <View style={ds.historyList}>
                  {history.map((item, idx) => {
                    const logDate = valueOf(item.createdAt, item.activityDate, item.logDate, item.performedAt, item.date);
                    const logDescText = valueOf(item.description, item.content, item.notes);
                    const updatedBy = valueOf(
                      item.createdByName,
                      item.updatedByName,
                      item.authorName,
                      item.userName,
                      item.user?.fullName,
                      currentUser?.fullName,
                      d.assignedLeaderName,
                      assignees[0]?.fullName,
                      'Nông dân'
                    );
                    const hasFert = item.fertilizers?.length > 0;
                    const hasPest = item.pesticides?.length > 0;
                    return (
                      <View key={idx} style={ds.historyItem}>
                        <View style={ds.historyDot} />
                        <View style={ds.historyBody}>
                          <Text style={ds.historyDate}>{dateTimeOf(logDate)}</Text>
                          <Text style={ds.historyUpdatedBy}>Cập nhật bởi: {updatedBy}</Text>
                          {logDescText ? <Text style={ds.historyDesc}>{logDescText}</Text> : null}
                          {hasFert ? (
                            <View style={ds.historyMaterialBoxGreen}>
                              <Text style={ds.historyMaterialTitleGreen}>Phân bón</Text>
                              <View style={ds.historyMaterialContentGreen}>
                                <View style={ds.historyMaterialHeaderRow}>
                                  <Feather name="droplet" size={12} color="#15803d" />
                                  <Text style={ds.historyMaterialLabelGreen}>Phân bón đã sử dụng:</Text>
                                </View>
                                {item.fertilizers.map((f, fIdx) => (
                                  <Text key={fIdx} style={ds.historyMaterialItemGreen}>
                                    • <Text style={{ fontWeight: '700', color: '#1e293b' }}>{valueOf(f.name, f.fertilizerName, 'Phân bón')}</Text>: <Text style={{ color: '#15803d', fontWeight: '800' }}>{formatNumber(f.quantity || f.amount || 1)} {valueOf(f.unit, 'kg')}</Text>{(f.area || f.totalArea) ? ` (${formatNumber(f.area || f.totalArea)} m2)` : ''}
                                  </Text>
                                ))}
                              </View>
                            </View>
                          ) : null}

                          {hasPest ? (
                            <View style={ds.historyMaterialBoxPurple}>
                              <Text style={ds.historyMaterialTitlePurple}>Thuốc</Text>
                              <View style={ds.historyMaterialContentPurple}>
                                <View style={ds.historyMaterialHeaderRow}>
                                  <Feather name="shield" size={12} color="#9333ea" />
                                  <Text style={ds.historyMaterialLabelPurple}>Nông dược đã sử dụng:</Text>
                                </View>
                                {item.pesticides.map((p, pIdx) => (
                                  <Text key={pIdx} style={ds.historyMaterialItemPurple}>
                                    • <Text style={{ fontWeight: '700', color: '#1e293b' }}>{valueOf(p.name, p.pesticideName, 'Thuốc')}</Text>: <Text style={{ color: '#9333ea', fontWeight: '800' }}>{p.quantity || p.amount || 1} {valueOf(p.unit, 'lít')}</Text>{(p.area || p.totalArea) ? ` (${p.area || p.totalArea} m2)` : ''}
                                  </Text>
                                ))}
                              </View>
                            </View>
                          ) : null}
                          {(() => {
                            const rawImgs = Array.isArray(item.images) ? item.images :
                              Array.isArray(item.photoUrls) ? item.photoUrls :
                                Array.isArray(item.photos) ? item.photos :
                                  Array.isArray(item.imageUrls) ? item.imageUrls :
                                    (item.imageUrl || item.photo || item.image) ? [item.imageUrl || item.photo || item.image] : [];
                            const imgUrls = rawImgs.map((img) => {
                              if (!img) return null;
                              if (typeof img === 'string') return resolveAvatarUrl(img);
                              return resolveAvatarUrl(valueOf(img.url, img.imageUrl, img.path, img.photoUrl, img.src));
                            }).filter(Boolean);

                            if (imgUrls.length === 0) return null;
                            return (
                              <View style={ds.historyImageGallery}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.historyImageScroll}>
                                  {imgUrls.map((url, imgIdx) => (
                                    <TouchableOpacity
                                      key={imgIdx}
                                      activeOpacity={0.85}
                                      onPress={() => setPreviewImage(url)}
                                    >
                                      <Image source={{ uri: url }} style={ds.historyThumbImage} resizeMode="cover" />
                                    </TouchableOpacity>
                                  ))}
                                </ScrollView>
                              </View>
                            );
                          })()}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <Modal visible={Boolean(previewImage)} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
              <TouchableOpacity style={ds.imagePreviewBackdrop} activeOpacity={1} onPress={() => setPreviewImage(null)}>
                <TouchableOpacity style={ds.closePreviewBtn} onPress={() => setPreviewImage(null)}>
                  <Feather name="x" size={24} color="#fff" />
                </TouchableOpacity>
                {previewImage ? (
                  <Image source={{ uri: previewImage }} style={ds.fullPreviewImage} resizeMode="contain" />
                ) : null}
              </TouchableOpacity>
            </Modal>

            <View style={{ height: canWriteLog ? 110 : 60 }} />
          </ScrollView>

          {canWriteLog ? (
            <View style={ds.bottomStickyBar}>
              <TouchableOpacity
                style={ds.primaryLogBtn}
                onPress={() => { onClose(); setTimeout(() => onRefreshParent?.('openLog', task), 250); }}
              >
                <Feather name="edit-3" size={18} color="#fff" />
                <Text style={ds.primaryLogBtnText}>Ghi nhật ký</Text>
              </TouchableOpacity>

              <TouchableOpacity style={ds.secondarySummaryBtn} onPress={() => setSummaryModalVisible(true)}>
                <Feather name="check-circle" size={16} color="#15803d" />
                <Text style={ds.secondarySummaryBtnText}>Hoàn thành & Gửi Summary</Text>
              </TouchableOpacity>
            </View>
          ) : (state === 'COMPLETED' || state === 'WAITING_APPROVAL' || state === 'PENDING_APPROVAL') ? (
            <View style={ds.bottomStickyBar}>
              <TouchableOpacity style={ds.primaryLogBtn} onPress={() => setSummaryModalVisible(true)}>
                <Feather name="file-text" size={17} color="#fff" />
                <Text style={ds.primaryLogBtnText}>Xem báo cáo tổng hợp đã gửi</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const ds = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803d',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 12,
  },
  backBtn: { padding: 4 },
  topBarCenter: { flex: 1 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  breadcrumbBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  breadcrumbDot: { width: 7, height: 7, borderRadius: 4 },
  breadcrumbText: { fontSize: 12, fontWeight: '700' },
  breadcrumbStage: { fontSize: 12, color: '#dcfce7', fontWeight: '500', flex: 1 },
  loadingHero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  heroBlock: {
    backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  heroDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  infoCard: {
    flex: 1, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center',
  },
  infoCardLabel: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginBottom: 3 },
  infoCardValue: { fontSize: 13, color: '#15803d', fontWeight: '700', lineHeight: 19 },
  detailGridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  detailCell: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
    justifyContent: 'center',
  },
  detailCellIcon: { marginBottom: 4 },
  detailCellLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  detailCellValue: { fontSize: 13, color: '#1e293b', fontWeight: '700', lineHeight: 19 },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  assigneeList: { gap: 10 },
  assigneeGrid: { gap: 8 },
  assigneeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  assigneeRoleBadge: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 1 },
  assigneeRoleLeader: { color: '#1d4ed8', fontWeight: '700' },
  showMoreAssigneesBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, marginTop: 8, backgroundColor: '#f0fdf4',
    borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0',
  },
  showMoreAssigneesText: { color: '#15803d', fontSize: 13, fontWeight: '700' },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0' },
  avatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#15803d',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLeader: { backgroundColor: '#1d4ed8' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  assigneeName: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
  assigneeRole: { fontSize: 11, color: '#94a3b8' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#15803d', backgroundColor: '#f0fdf4' },
  tabText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  tabTextActive: { color: '#15803d' },
  tabContent: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    overflow: 'hidden',
  },
  inlineForm: { padding: 16 },
  formRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  formHalf: { flex: 1 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  dateDisplayBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9,
  },
  dateDisplayText: { fontSize: 13, color: '#374151' },
  photoBox: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, minHeight: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  photoBoxText: { fontSize: 12, color: '#94a3b8' },
  formTextarea: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10,
    fontSize: 14, color: '#1e293b', minHeight: 90, marginBottom: 14, backgroundColor: '#fafafa',
  },
  formTextareaDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  formSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  formSectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  addMaterialBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#15803d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  addMaterialBtnText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  emptyMaterial: {
    backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  emptyMaterialText: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
  submitLogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 12, marginBottom: 10,
  },
  submitLogBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fullFormLink: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  fullFormLinkText: { fontSize: 12, color: '#64748b' },
  historyLoading: { padding: 20, alignItems: 'center', gap: 8 },
  emptyTabContent: { padding: 32, alignItems: 'center', gap: 8 },
  emptyTabText: { fontSize: 14, color: '#94a3b8' },
  historyList: { padding: 16 },
  historyCount: { fontSize: 12, color: '#94a3b8', marginBottom: 12, fontWeight: '600' },
  historyItem: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  historyDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#15803d',
    marginTop: 4, flexShrink: 0,
  },
  historyBody: { flex: 1 },
  historyDate: { fontSize: 12, color: '#15803d', fontWeight: '700', marginBottom: 2 },
  historyUpdatedBy: { fontSize: 11, color: '#94a3b8', marginBottom: 4 },
  historyDesc: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 6 },
  historyMaterialBoxGreen: { marginTop: 6, gap: 3 },
  historyMaterialTitleGreen: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  historyMaterialContentGreen: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, gap: 3, borderWidth: 1, borderColor: '#dcfce7' },
  historyMaterialLabelGreen: { fontSize: 12, fontWeight: '700', color: '#15803d' },
  historyMaterialItemGreen: { fontSize: 12, color: '#334155', marginLeft: 4, lineHeight: 18 },
  historyMaterialBoxPurple: { marginTop: 6, gap: 3 },
  historyMaterialTitlePurple: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  historyMaterialContentPurple: { backgroundColor: '#faf5ff', borderRadius: 10, padding: 10, gap: 3, borderWidth: 1, borderColor: '#f3e8ff' },
  historyMaterialLabelPurple: { fontSize: 12, fontWeight: '700', color: '#9333ea' },
  historyMaterialItemPurple: { fontSize: 12, color: '#334155', marginLeft: 4, lineHeight: 18 },
  historyMaterialHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyMaterials: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  materialTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  materialTagText: { fontSize: 11, color: '#15803d' },
  historyImageGallery: { marginTop: 6 },
  historyImageScroll: { gap: 8 },
  historyThumbImage: { width: 80, height: 60, borderRadius: 8 },
  imagePreviewBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  closePreviewBtn: { position: 'absolute', top: 50, right: 16, zIndex: 10, padding: 8 },
  fullPreviewImage: { width: '100%', height: '75%' },
  summaryHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#166534', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#22c55e',
  },
  summaryHeaderBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroSummaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16,
    marginTop: 12, shadowColor: '#15803d', shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
  },
  heroSummaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  bottomStickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1, borderTopColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
    gap: 8,
  },
  primaryLogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 13,
  },
  primaryLogBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondarySummaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#15803d', borderRadius: 12, paddingVertical: 11,
  },
  secondarySummaryBtnText: { color: '#15803d', fontSize: 14, fontWeight: '700' },
  bottomSummaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 13,
  },
  bottomSummaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

export default function MyTasksScreen({ navigation, route }) {
  const currentUser = useAuthStore((state) => state.user);
  const currentUserAvatar = resolveAvatarUrl(currentUser?.avatarUrl || currentUser?.avatar);

  const [tasks, setTasks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('IN_PROGRESS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [dailyLogVisible, setDailyLogVisible] = useState(false);
  const [entryMode, setEntryMode] = useState('daily');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailTask, setDetailTask] = useState(null);

  const fetchTasks = useCallback(async () => {
    setError('');
    try {
      let myTasksRaw = [];
      let logbookSummaries = [];
      let logbookTasks = [];

      try {
        const sumRes = await api.get('/cultivation-tasks/my-logbook-summaries');
        logbookSummaries = extractItems(sumRes.data);
      } catch { }

      const myLogbookIdSet = new Set(
        logbookSummaries
          .map((lb) => String(getEntityId(lb) || lb.id || lb.logbookId || ''))
          .filter(Boolean)
      );
      const myLogbookNameSet = new Set(
        logbookSummaries
          .map((lb) => valueOf(lb.name, lb.title, lb.logbookName, lb.planName))
          .filter(Boolean)
      );

      if (myLogbookIdSet.size > 0) {
        const taskPromises = Array.from(myLogbookIdSet).map(async (lbId) => {
          const lbObj = logbookSummaries.find((l) => String(getEntityId(l) || l.id || l.logbookId || '') === lbId);
          const lbName = valueOf(lbObj?.name, lbObj?.title, lbObj?.logbookName, lbObj?.planName);
          try {
            const lbRes = await api.get(`/cultivation-tasks/logbook/${lbId}`);
            const rawBody = lbRes.data;
            const lbData = rawBody?.data ?? rawBody ?? {};
            let items = extractItems(lbData);
            if ((!items || items.length === 0) && lbData?.stages) {
              items = [];
              lbData.stages.forEach((stg) => {
                const stgTasks = stg.tasks || stg.cultivationTasks || [];
                stgTasks.forEach((t) => {
                  t.stageName = stg.name;
                  t.planName = lbName;
                  t.logbookId = lbId;
                  items.push(t);
                });
              });
            }
            items.forEach((t) => {
              if (lbName) t.planName = lbName;
              if (lbId) t.logbookId = lbId;
            });
            return items;
          } catch {
            return [];
          }
        });
        const results = await Promise.all(taskPromises);
        logbookTasks = results.flat();
      }

      try {
        const res = await api.get('/cultivation-tasks/my-tasks', { params: { PageIndex: 1, PageSize: 100 } });
        myTasksRaw = extractItems(res.data);
      } catch { }

      const mergedMap = new Map();

      logbookTasks.forEach((lt) => {
        const id = String(getEntityId(lt) || lt.id || lt.taskId || '');
        if (id) mergedMap.set(id, lt);
      });

      myTasksRaw.forEach((mt) => {
        const id = String(getEntityId(mt) || mt.id || mt.taskId || '');
        if (!id) return;
        if (mergedMap.has(id)) {
          const existing = mergedMap.get(id);
          const combined = { ...mt, ...existing };
          if (existing.planName) combined.planName = existing.planName;
          if (existing.status) combined.status = existing.status;
          mergedMap.set(id, combined);
        } else {
          mergedMap.set(id, mt);
        }
      });

      const finalItems = Array.from(mergedMap.values());
      const seen = new Set();
      const cleanTasks = finalItems.filter((item) => {
        if (!item) return false;
        const state = String(item.status || item.state || '').toUpperCase();
        if (state === 'CANCELLED' || state === 'DELETED' || state === 'INACTIVE' || state === 'DRAFT') {
          return false;
        }

        if (myLogbookIdSet.size > 0 || myLogbookNameSet.size > 0) {
          const itemLbId = String(item.cultivationLogbookId || item.logbookId || item.planId || '');
          const itemLbName = String(item.planName || item.logbookName || item.cropName || '').trim();
          const matchId = itemLbId && myLogbookIdSet.has(itemLbId);
          const matchName = itemLbName && Array.from(myLogbookNameSet).some((n) => { const ns = String(n || '').toLowerCase(); const is = String(itemLbName || '').toLowerCase(); return ns === is || is.includes(ns) || ns.includes(is); });
          if (!matchId && !matchName) {
            return false;
          }
        }

        const id = String(getEntityId(item) || item.id || item.taskId || '');
        if (id && seen.has(id)) return false;
        if (id) seen.add(id);
        return true;
      });

      setTasks(cleanTasks);

      const plansMap = new Map();

      logbookSummaries.forEach((lb) => {
        const id = String(getEntityId(lb) || lb.id || lb.logbookId || '');
        const name = valueOf(lb.name, lb.title, lb.logbookName, lb.planName, 'Quy trình canh tác');
        const cropName = valueOf(lb.cropName, lb.crop?.name, 'Cây trồng');
        if (id) {
          plansMap.set(id, { id, name, cropName, tasks: [] });
        }
      });

      cleanTasks.forEach((task) => {
        const planId = String(task.cultivationLogbookId || task.logbookId || task.planId || '');
        const planName = valueOf(task.planName, task.logbookName, task.cropName, task.cultivationLogbookName, 'Quy trình canh tác');
        const cropName = valueOf(task.cropName, task.crop?.name, 'Cây trồng');

        let key = planId;
        if (!key || !plansMap.has(key)) {
          const existingEntry = Array.from(plansMap.entries()).find(
            ([_, p]) => String(p.name || '').toLowerCase().trim() === String(planName || '').toLowerCase().trim()
          );
          if (existingEntry) {
            key = existingEntry[0];
          }
        }

        if (plansMap.has(key)) {
          plansMap.get(key).tasks.push(task);
        }
      });

      const builtPlans = Array.from(plansMap.values())
        .filter((p) => p.tasks.length > 0)
        .map((p) => {
          const tasksCount = p.tasks.length;
          const doingCount = p.tasks.filter((t) => normalizeStatus(t) === 'IN_PROGRESS').length;
          const completedCount = p.tasks.filter((t) => normalizeStatus(t) === 'COMPLETED').length;
          const pendingCount = p.tasks.filter((t) => normalizeStatus(t) === 'PENDING_APPROVAL').length;
          return {
            ...p,
            tasksCount,
            doingCount,
            completedCount,
            pendingCount,
          };
        });

      setPlans(builtPlans);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải công việc.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTasks(); }, [fetchTasks]));

  const openEntry = (task, mode) => {
    setSelectedTask(task);
    setEntryMode(mode);
    if (mode === 'daily') { setDailyLogVisible(true); }
    else { setDescription(''); }
  };

  const handleDetailAction = (action, task) => {
    if (action === 'openLog') {
      openEntry(task, 'daily');
    } else if (action === 'openSummary') {
      openEntry(task, 'summary');
    } else if (action === 'submitSummary') {
      fetchTasks();
      setFilter('PENDING_APPROVAL');
    } else {
      fetchTasks();
    }
  };

  useEffect(() => {
    const { focusTaskId, focusPlanId, focusTaskName, focusPlanName } = route?.params || {};
    if (!focusTaskId && !focusPlanId && !focusTaskName && !focusPlanName) return;
    if (!plans.length) return;

    // 1. Tìm kế hoạch tương ứng
    let matchedPlan = null;
    if (focusPlanId) {
      matchedPlan = plans.find((p) => String(p.id) === String(focusPlanId));
    }
    if (!matchedPlan && focusTaskId) {
      matchedPlan = plans.find((p) => p.tasks && p.tasks.some((t) => String(getEntityId(t)) === String(focusTaskId)));
    }
    if (!matchedPlan && focusTaskName) {
      matchedPlan = plans.find((p) => p.tasks && p.tasks.some((t) => (t.name || '').toLowerCase().includes(focusTaskName.toLowerCase())));
    }
    if (!matchedPlan && focusPlanName) {
      matchedPlan = plans.find((p) => (p.name || '').toLowerCase().includes(focusPlanName.toLowerCase()));
    }

    if (matchedPlan) {
      setSelectedPlan(matchedPlan);
    }

    // 2. Tìm công việc tương ứng để mở chi tiết
    let matchedTask = null;
    const allTasks = matchedPlan ? matchedPlan.tasks : tasks;

    if (focusTaskId) {
      matchedTask = allTasks.find((t) => String(getEntityId(t)) === String(focusTaskId));
    }
    if (!matchedTask && focusTaskName) {
      matchedTask = allTasks.find((t) => (t.name || '').toLowerCase().includes(focusTaskName.toLowerCase()));
    }

    if (matchedTask) {
      setDetailTask(matchedTask);
    } else if (focusTaskId) {
      api.get(`/cultivation-tasks/${focusTaskId}`)
        .then((res) => {
          const d = unwrapPayload(res.data) || res.data?.data || res.data;
          if (d && (d.id || d.name)) setDetailTask(d);
        })
        .catch(() => {});
    }

    navigation?.setParams?.({
      focusTaskId: undefined,
      focusPlanId: undefined,
      focusTaskName: undefined,
      focusPlanName: undefined,
    });
  }, [navigation, route?.params, tasks, plans]);

  const submitEntry = async () => {
    if (!description.trim()) {
      Alert.alert('Vui lòng nhập mô tả ⚠️', 'Vui lòng viết mô tả tổng kết công việc trước khi gửi.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/cultivation-tasks/${getEntityId(selectedTask)}/summary`, {
        totalFertilizers: [],
        totalPesticides: [],
        images: [],
        descriptionSummary: description.trim(),
        completedAt: new Date().toISOString(),
      });
      setSelectedTask(null);
      setDescription('');
      Alert.alert('Đã gửi báo cáo 🎉', 'Công việc đã gửi bản tổng hợp thành công.');
      fetchTasks();
      setFilter('PENDING_APPROVAL');
    } catch (requestError) {
      const serverMsg = getApiErrorMessage(requestError, '');
      const isQuarantineError = serverMsg && (
        serverMsg.toLowerCase().includes('cách ly') ||
        serverMsg.toLowerCase().includes('quarantine') ||
        serverMsg.toLowerCase().includes('safe-super') ||
        serverMsg.toLowerCase().includes('thời gian cách ly')
      );
      if (isQuarantineError) {
        Alert.alert('Cảnh báo thời gian cách ly ⚠️', serverMsg);
      } else if (serverMsg) {
        Alert.alert('Chưa thể gửi tổng hợp ⚠️', serverMsg);
      } else {
        Alert.alert('Lỗi hệ thống ⚠️', 'Không thể gửi báo cáo tổng hợp. Vui lòng kiểm tra kết nối mạng và thử lại.');
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      String(p.name || '').toLowerCase().includes(q) ||
      String(p.cropName || '').toLowerCase().includes(q) ||
      (Array.isArray(p.tasks) && p.tasks.some((t) =>
        String(valueOf(t.taskName, t.name, t.title, '') || '').toLowerCase().includes(q) ||
        String(valueOf(t.stageName, t.stage?.name, '') || '').toLowerCase().includes(q)
      ))
    );
  });

  const currentTasksList = selectedPlan
    ? (selectedPlan.tasks && selectedPlan.tasks.length ? selectedPlan.tasks : tasks.filter((t) => {
      const pId = String(t.cultivationLogbookId || t.logbookId || t.planId || '');
      const pName = String(valueOf(t.planName, t.logbookName, t.cropName, '') || '').toLowerCase();
      return pId === String(selectedPlan.id) || pName === String(selectedPlan.name || '').toLowerCase();
    }))
    : tasks;

  const assignedCount = currentTasksList.filter((t) => normalizeStatus(t) === 'ASSIGNED').length;
  const activeCount = currentTasksList.filter((t) => normalizeStatus(t) === 'IN_PROGRESS').length;
  const pendingCount = currentTasksList.filter((t) => normalizeStatus(t) === 'PENDING_APPROVAL').length;
  const completedCount = currentTasksList.filter((t) => normalizeStatus(t) === 'COMPLETED').length;

  const filteredTasks = currentTasksList.filter((task) => {
    const normState = normalizeStatus(task);
    if (filter === 'ASSIGNED') return normState === 'ASSIGNED';
    if (filter === 'IN_PROGRESS') return normState === 'IN_PROGRESS';
    if (filter === 'PENDING_APPROVAL') return normState === 'PENDING_APPROVAL';
    if (filter === 'COMPLETED') return normState === 'COMPLETED';
    return true;
  });

  const planTasksForQuarantine = selectedPlan
    ? (selectedPlan.tasks && selectedPlan.tasks.length ? selectedPlan.tasks : tasks.filter((t) => {
      const pId = String(t.cultivationLogbookId || t.logbookId || t.planId || '');
      const pName = String(valueOf(t.planName, t.logbookName, t.cropName, '') || '').toLowerCase();
      return pId === String(selectedPlan.id) || pName === String(selectedPlan.name || '').toLowerCase();
    }))
    : tasks;

  const planQuarantineSummary = getPlanQuarantineSummary(planTasksForQuarantine);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  if (!selectedPlan) {
    return (
      <View style={styles.container}>
        <View style={styles.planCatalogHeader}>
          <View style={styles.planCatalogHeaderRow}>
            <Text style={styles.planCatalogTitle}>Danh mục Kế hoạch</Text>
            <View style={styles.planCatalogBadge}>
              <Text style={styles.planCatalogBadgeText}>{plans.length} Kế hoạch</Text>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Feather name="search" size={18} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kế hoạch, giai đoạn..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          data={filteredPlans}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.planListContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} colors={['#15803d']} />}
          renderItem={({ item }) => {
            return (
              <TouchableOpacity
                style={styles.planCard}
                activeOpacity={0.88}
                onPress={() => {
                  setSelectedPlan(item);
                  setFilter('IN_PROGRESS');
                }}
              >
                <View style={styles.planCardTopRow}>
                  <Text style={styles.planCardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.planTaskBadge}>
                    <Text style={styles.planTaskBadgeText}>{item.tasksCount} công việc</Text>
                  </View>
                </View>

                <View style={styles.planCardBottomRow}>
                  <Text style={styles.planCropText}>{item.cropName}</Text>
                  <Text style={styles.planDoingText}>
                    {item.doingCount} đang làm
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="book-open" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Chưa có kế hoạch</Text>
              <Text style={styles.emptySubtitle}>Không tìm thấy kế hoạch canh tác nào.</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => setSelectedPlan(null)}
          >
            <Feather name="arrow-left" size={18} color="#fff" />
            <Text style={styles.headerBackText}>Danh mục Kế hoạch</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle} numberOfLines={2}>{selectedPlan.name}</Text>
      </View>

      {/* Top Quarantine Summary Banner (khớp 100% giao diện Web) */}
      {planQuarantineSummary.hasQuarantine ? (
        <View style={styles.topQuarantineCard}>
          <View style={styles.topQuarantineHeader}>
            <Feather name="alert-triangle" size={20} color="#d97706" />
            <View style={{ flex: 1 }}>
              <Text style={styles.topQuarantineTitle}>Đang trong thời gian cách ly</Text>
              <Text style={styles.topQuarantineSubtitle}>
                {planQuarantineSummary.count} loại nông dược
              </Text>
            </View>
          </View>
          <View style={styles.topQuarantineList}>
            {planQuarantineSummary.items.map((item, idx) => (
              <View key={idx} style={styles.topQuarantineItem}>
                <Feather name="shield" size={15} color="#d97706" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.topQuarantineItemName}>{item.name}</Text>
                  <Text style={styles.topQuarantineItemDate}>
                    Cách ly đến: <Text style={{ fontWeight: '700' }}>{item.eligibleDate}</Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {[
            ['ALL', `Tất cả (${currentTasksList.length})`],
            ['ASSIGNED', `Đã phân công (${assignedCount})`],
            ['IN_PROGRESS', `Đang làm (${activeCount})`],
            ['PENDING_APPROVAL', `Chờ duyệt (${pendingCount})`],
            ['COMPLETED', `Hoàn thành (${completedCount})`],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.filter, filter === key && styles.filterActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filteredTasks}
        keyExtractor={(item, index) => String(getEntityId(item) || index)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} colors={['#15803d']} />}
        renderItem={({ item }) => {
          const state = normalizeStatus(item);
          const [label, color, bg, text] = STATUS[state] || [item.status || 'Đang thực hiện', '#15803d', '#dcfce7', '#166534'];
          const canWriteLog = state === 'IN_PROGRESS';
          const startDateStr = dateOf(valueOf(item.startDate, item.plannedStartDate, item.activityDate, item.createdAt, item.dueDate, item.endDate));
          const locationStr = valueOf(item.landPlotName, item.landPlotNames, item.landPlot?.name, item.logbookName);
          const stageName = valueOf(item.stageName, item.cultivationStageName, item.stage?.name);
          const planName = valueOf(item.planName, item.logbookName, item.cropName, item.cultivationLogbookName, item.logbook?.name);
          const qWarn = getTaskQuarantineWarning(item, []);

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.88}
              onPress={() => setDetailTask(item)}
            >
              {stageName ? (
                <View style={styles.tagContainer}>
                  <View style={styles.stageTagBadge}>
                    <Feather name="layers" size={12} color="#0369a1" />
                    <Text style={styles.stageTagText}>Giai đoạn: {stageName}</Text>
                  </View>
                </View>
              ) : null}

              {/* Inline Quarantine Warning */}
              {qWarn.hasWarning ? (
                <View style={styles.cardQuarantineWarning}>
                  <View style={styles.cardQuarantineHeader}>
                    <Feather name="alert-triangle" size={13} color="#b91c1c" />
                    <Text style={styles.cardQuarantineTitle}>Cảnh báo thời gian cách ly</Text>
                  </View>
                  <Text style={styles.cardQuarantineText} numberOfLines={2}>{qWarn.message}</Text>
                </View>
              ) : null}

              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{valueOf(item.taskName, item.name, item.title, 'Công việc canh tác')}</Text>
                <View style={[styles.badge, { backgroundColor: bg || '#dcfce7' }]}>
                  <Text style={[styles.badgeText, { color: text || '#166534' }]}>{label}</Text>
                </View>
              </View>

              {item.description ? <Text style={styles.description} numberOfLines={2}>{item.description}</Text> : null}

              <View style={styles.metaRow}>
                <Feather name="calendar" size={14} color="#64748b" />
                <Text style={styles.meta}>Ngày bắt đầu: {startDateStr}</Text>
              </View>

              {qWarn.eligibleDate ? (
                <View style={styles.metaRow}>
                  <Feather name="shield" size={14} color="#15803d" />
                  <Text style={[styles.meta, { color: '#15803d', fontWeight: '700' }]}>
                    Ngày đủ điều kiện thu hoạch: {qWarn.eligibleDate}
                  </Text>
                </View>
              ) : null}

              {locationStr ? (
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={14} color="#64748b" />
                  <Text style={styles.meta}>{locationStr}</Text>
                </View>
              ) : null}

              <View style={styles.memberRow}>
                <Feather name="users" size={14} color="#64748b" />
                <Text style={styles.memberLabel}>Thành viên nhóm</Text>
                {(() => {
                  const farmerList = item.assignments || item.assignees || item.assignedUsers || item.members || item.workers || [];
                  const memberList = farmerList.map((a) => ({
                    fullName: valueOf(a.fullName, a.farmerName, a.userName, a.name, '?'),
                    avatarUrl: resolveAvatarUrl(valueOf(
                      a.avatarUrl, a.avatar, a.imageUrl, a.photoUrl, a.photo, a.image,
                      a.user?.avatar, a.user?.avatarUrl, a.farmer?.avatar, a.farmer?.farmerAvatar, a.farmer?.avatarUrl
                    )),
                  }));
                  const count = memberList.length || item.memberCount || item.assigneeCount || 0;
                  if (memberList.length === 0) {
                    return <Text style={styles.meta}>{count > 0 ? `${count} người` : '—'}</Text>;
                  }
                  const MAX_SHOW = 3;
                  const shown = memberList.slice(0, MAX_SHOW);
                  const remaining = count - shown.length;
                  return (
                    <View style={styles.avatarRow}>
                      {shown.map((a, i) => {
                        const name = valueOf(a.fullName, a.name, a.userName, '?');
                        const initial = (name || '?')[0].toUpperCase();
                        return (
                          <View key={i} style={[styles.miniAvatar, { marginLeft: i === 0 ? 0 : -6 }]}>
                            {a.avatarUrl ? (
                              <Image source={{ uri: a.avatarUrl }} style={styles.miniAvatarImg} />
                            ) : (
                              <Text style={styles.miniAvatarText}>{initial}</Text>
                            )}
                          </View>
                        );
                      })}
                      {remaining > 0 ? (
                        <View style={[styles.miniAvatar, { backgroundColor: '#1e40af', marginLeft: -6 }]}>
                          <Text style={[styles.miniAvatarText, { color: '#fff' }]}>+{remaining}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.meta, { marginLeft: 6 }]}>{count} người</Text>
                    </View>
                  );
                })()}
              </View>

              <View style={styles.actions}>
                {state === 'PENDING_APPROVAL' ? (
                  <TouchableOpacity
                    style={[styles.logBtn, { backgroundColor: '#d97706', flex: 1, justifyContent: 'center' }]}
                    onPress={() => setDetailTask(item)}
                  >
                    <Feather name="clock" size={14} color="#fff" />
                    <Text style={styles.logBtnText}>Chờ duyệt</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() => setDetailTask(item)}
                    >
                      <Feather name="eye" size={14} color="#15803d" />
                      <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                    </TouchableOpacity>
                    {canWriteLog ? (
                      <TouchableOpacity
                        style={styles.logBtn}
                        onPress={() => openEntry(item, 'daily')}
                      >
                        <Feather name="edit-3" size={14} color="#fff" />
                        <Text style={styles.logBtnText}>Ghi nhật ký</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Chưa có công việc</Text>
            <Text style={styles.emptySubtitle}>Bạn chưa có công việc nào trong danh sách này.</Text>
          </View>
        }
      />

      {detailTask ? (
        <Modal visible animationType="slide" onRequestClose={() => setDetailTask(null)}>
          <TaskDetailScreen
            task={detailTask}
            onClose={() => setDetailTask(null)}
            onRefreshParent={handleDetailAction}
          />
        </Modal>
      ) : null}

      {dailyLogVisible && selectedTask ? (
        <DailyLogModal
          visible={dailyLogVisible}
          task={selectedTask}
          plan={selectedPlan}
          onClose={() => { setDailyLogVisible(false); setSelectedTask(null); }}
          onSuccess={() => { setDailyLogVisible(false); setSelectedTask(null); fetchTasks(); }}
        />
      ) : null}

      {entryMode === 'summary' && selectedTask && !dailyLogVisible ? (
        <Modal visible animationType="slide" transparent onRequestClose={() => setSelectedTask(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tổng kết công việc</Text>
                <TouchableOpacity onPress={() => { setSelectedTask(null); setDescription(''); }}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalTaskName}>{valueOf(selectedTask.taskName, selectedTask.name, selectedTask.title)}</Text>
              <TextInput
                style={styles.textarea}
                value={description}
                onChangeText={setDescription}
                placeholder="Nhập mô tả tổng kết công việc..."
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                numberOfLines={5}
              />
              <TouchableOpacity style={styles.submitBtn} onPress={submitEntry} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Gửi tổng kết</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  planCatalogHeader: {
    backgroundColor: '#15803d',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  planCatalogHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  planCatalogTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  planCatalogBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  planCatalogBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  planListContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  planCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  planCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 22,
  },
  planTaskBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planTaskBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  planCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCropText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  planDoingText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '700',
  },

  header: {
    backgroundColor: '#15803d',
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 10,
  },
  headerBackText: {
    color: '#dcfce7',
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#bbf7d0', marginTop: 4 },

  filtersContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filter: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  filterActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  filterText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  error: { color: '#ef4444', textAlign: 'center', padding: 12, fontSize: 13 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  stageTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageTagText: {
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '800',
  },
  planTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planTagText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '800',
  },
  cardQuarantineWarning: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 4,
  },
  cardQuarantineHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardQuarantineTitle: { fontSize: 12, fontWeight: '800', color: '#991b1b' },
  cardQuarantineText: { fontSize: 12, color: '#b91c1c', lineHeight: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#0f172a' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  description: { fontSize: 13, color: '#475569', marginBottom: 8, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  meta: { fontSize: 13, color: '#64748b' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 12, flexWrap: 'wrap' },
  memberLabel: { fontSize: 13, color: '#64748b', marginRight: 4 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  miniAvatar: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#1d4ed8',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
    overflow: 'hidden',
  },
  miniAvatarImg: { width: 26, height: 26, borderRadius: 13 },
  miniAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  detailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#15803d', borderRadius: 10, paddingVertical: 9,
  },
  detailBtnText: { fontSize: 13, color: '#15803d', fontWeight: '700' },
  logBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 9,
  },
  logBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  emptyContainer: { paddingTop: 60, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#475569' },
  emptySubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalTaskName: { fontSize: 14, color: '#475569', marginBottom: 14, fontWeight: '600' },
  textarea: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1e293b', minHeight: 110, marginBottom: 16, backgroundColor: '#f8fafc',
  },
  submitBtn: {
    backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  // TOP QUARANTINE SUMMARY CARD (MATCHES WEB)
  topQuarantineCard: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  topQuarantineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  topQuarantineTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400e',
  },
  topQuarantineSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
    marginTop: 1,
  },
  topQuarantineList: {
    gap: 8,
  },
  topQuarantineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 10,
    padding: 10,
  },
  topQuarantineItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78350f',
  },
  topQuarantineItemDate: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 1,
  },
});

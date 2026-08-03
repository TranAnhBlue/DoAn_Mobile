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
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import DailyLogModal from '../../../features/daily-log/components/DailyLogModal';
import SummaryReportModal from '../../../features/summary-report/components/SummaryReportModal';
import { extractLogMaterials } from '../../../features/summary-report/utils/aggregateMaterials';
import { useAuthStore } from '../../../features/auth/store/authStore';
import api from '../../../shared/api/client';
import { extractItems, getEntityId } from '../../../shared/api/response';
import { offlineQueue } from '../../../shared/services/offlineQueue';
import { normalizeStatus, STATUS, valueOf } from '../../../shared/utils/data';
import { dateOf, dateTimeOf, formatDateVN, formatNumber, resolveAvatarUrl, sortLogsDescending } from '../../../shared/utils/format';

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
  const [activeTab, setActiveTab] = useState('log');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);

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
      } catch (err) {
        console.log(`[TaskDetail] ${ep} ERR:`, err?.response?.status, err?.message);
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
    } catch {}

    let offlineLogs = [];
    try {
      const queueLogs = await offlineQueue.getByTask(taskId);
      offlineLogs = (Array.isArray(queueLogs) ? queueLogs : []).filter((item) => {
        const itemTaskId = String(item.cultivationTaskId || item.taskId || getEntityId(item.task) || '');
        return !itemTaskId || itemTaskId === String(taskId);
      });
    } catch {}

    let finalHistory = [];
    if (found && found.length > 0) {
      finalHistory = found;
      AsyncStorage.removeItem(`farm-leader:sent-logs-history:${taskId}`).catch(() => {});
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

  const assignments = (d.assignments || d.assignees || d.assignedUsers || d.members || d.teamMembers || d.workers || []).filter(Boolean);
  const hasLeader = !!(d.assignedLeaderName || d.assignedLeaderId);
  const memberCount = assignments.length + (hasLeader ? 1 : 0) || d.memberCount || d.assigneeCount || 0;

  const rawLeaderAvatar = valueOf(
    d.assignedLeaderAvatar, d.assignedLeaderAvatarUrl,
    d.leaderAvatar, d.leaderAvatarUrl,
    d.assignedLeader?.avatar, d.assignedLeader?.avatarUrl,
    d.leader?.avatar, d.leader?.avatarUrl
  );
  const leaderAvatar = resolveAvatarUrl(rawLeaderAvatar, currentUserAvatar);

  const assignees = [
    ...(hasLeader ? [{
      fullName: d.assignedLeaderName || 'Farm Leader',
      avatarUrl: leaderAvatar,
      isLeader: true,
      role: 'FARM_LEADER',
    }] : []),
    ...assignments.map((a) => ({
      fullName: valueOf(a.fullName, a.farmerName, a.userName, a.name, 'Nông dân'),
      avatarUrl: resolveAvatarUrl(valueOf(
        a.avatarUrl, a.avatar, a.imageUrl, a.photoUrl, a.photo, a.image,
        a.user?.avatar, a.user?.avatarUrl, a.farmer?.avatar, a.farmer?.avatarUrl
      )),
      isLeader: a.role === 'FARM_LEADER' || a.isLeader,
      role: a.role || 'FARMER',
    })),
  ];

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
        onSuccess={() => { setSummaryModalVisible(false); onClose(); onRefreshParent?.(); }}
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
              {canWriteLog ? (
                <TouchableOpacity style={ds.heroSummaryBtn} onPress={() => setSummaryModalVisible(true)}>
                  <Feather name="check-circle" size={15} color="#fff" />
                  <Text style={ds.heroSummaryBtnText}>Hoàn thành & Gửi Summary</Text>
                </TouchableOpacity>
              ) : null}
            </View>

          {/* Info cards */}
          {(planName || stageName) ? (
            <View style={ds.infoRow}>
              {planName ? (
                <View style={ds.infoCard}>
                  <Text style={ds.infoCardLabel}>Kế hoạch canh tác</Text>
                  <Text style={ds.infoCardValue}>{planName}</Text>
                </View>
              ) : null}
              {stageName ? (
                <View style={ds.infoCard}>
                  <Text style={ds.infoCardLabel}>Giai đoạn</Text>
                  <Text style={ds.infoCardValue}>{stageName}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Detail grid */}
          <View style={ds.detailGrid}>
            <DetailCell icon="calendar" label="Ngày bắt đầu" value={startDate} />
            <DetailCell icon="clock" label="Ngày kết thúc" value={endDate} />
            <DetailCell icon="map-pin" label="Vùng trồng" value={location} />
            <DetailCell icon="users" label="Thành viên" value={`${memberCount} người`} />
          </View>

          {/* Assignees list */}
          {assignees.length > 0 ? (
            <View style={ds.section}>
              <Text style={ds.sectionTitle}>Thành viên nhóm</Text>
              <View style={ds.assigneeList}>
                {assignees.map((a, idx) => {
                  const name = valueOf(a.fullName, a.name, a.userName, 'Thành viên');
                  const initial = (name || '?')[0].toUpperCase();
                  const isLeader = a.role === 'FARM_LEADER' || a.isLeader;
                  return (
                    <View key={idx} style={ds.assigneeRow}>
                      {a.avatarUrl ? (
                        <Image source={{ uri: a.avatarUrl }} style={ds.avatarImage} />
                      ) : (
                        <View style={[ds.avatar, isLeader && ds.avatarLeader]}>
                          <Text style={ds.avatarText}>{initial}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={ds.assigneeName}>{name}</Text>
                        {a.role ? <Text style={ds.assigneeRole}>{a.role}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Tab bar */}
          <View style={ds.tabBar}>
            <TouchableOpacity
              style={[ds.tab, activeTab === 'log' && ds.tabActive]}
              onPress={() => setActiveTab('log')}
            >
              <Feather name="edit-3" size={14} color={activeTab === 'log' ? '#15803d' : '#94a3b8'} />
              <Text style={[ds.tabText, activeTab === 'log' && ds.tabTextActive]}>Nội dung thực hiện</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ds.tab, activeTab === 'history' && ds.tabActive]}
              onPress={() => { setActiveTab('history'); fetchHistory(); }}
            >
              <Feather name="list" size={14} color={activeTab === 'history' ? '#15803d' : '#94a3b8'} />
              <Text style={[ds.tabText, activeTab === 'history' && ds.tabTextActive]}>
                Lịch sử{history.length > 0 ? ` (${history.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab: Nội dung thực hiện */}
          {activeTab === 'log' ? (
            <View style={ds.tabContent}>
              <View style={ds.inlineForm}>
                <View style={ds.formRow}>
                  <View style={ds.formHalf}>
                    <Text style={ds.formLabel}><Text style={{ color: '#ef4444' }}>*</Text> Ngày ghi nhận</Text>
                    <View style={ds.dateDisplayBox}>
                      <Text style={ds.dateDisplayText}>{new Date().toLocaleDateString('vi-VN')}</Text>
                      <Feather name="calendar" size={15} color="#94a3b8" />
                    </View>
                  </View>
                  <View style={ds.formHalf}>
                    <Text style={ds.formLabel}>Ảnh minh chứng</Text>
                    <TouchableOpacity
                      style={ds.photoBox}
                      disabled={!canWriteLog}
                      onPress={() => { onClose(); setTimeout(() => onRefreshParent?.('openLog', task), 250); }}
                    >
                      <Text style={ds.photoBoxText}>Chưa có ảnh</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={ds.formLabel}><Text style={{ color: '#ef4444' }}>*</Text> Chi tiết công việc</Text>
                <TextInput
                  style={[ds.formTextarea, !canWriteLog && ds.formTextareaDisabled]}
                  value={logDesc}
                  onChangeText={setLogDesc}
                  editable={canWriteLog}
                  placeholder="Mô tả tình hình cây trồng, vấn đề phát sinh..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  numberOfLines={4}
                />

                <View style={ds.formSectionHeader}>
                  <Text style={ds.formSectionTitle}>Phân bón</Text>
                  {canWriteLog && (
                    <TouchableOpacity
                      style={ds.addMaterialBtn}
                      onPress={() => { onClose(); setTimeout(() => onRefreshParent?.('openLog', task), 250); }}
                    >
                      <Feather name="plus" size={13} color="#15803d" />
                      <Text style={ds.addMaterialBtnText}>Thêm</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={ds.emptyMaterial}>
                  <Text style={ds.emptyMaterialText}>Chưa có phân bón nào</Text>
                </View>

                <View style={ds.formSectionHeader}>
                  <Text style={ds.formSectionTitle}>Nông dược</Text>
                  {canWriteLog && (
                    <TouchableOpacity
                      style={ds.addMaterialBtn}
                      onPress={() => { onClose(); setTimeout(() => onRefreshParent?.('openLog', task), 250); }}
                    >
                      <Feather name="plus" size={13} color="#15803d" />
                      <Text style={ds.addMaterialBtnText}>Thêm</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={ds.emptyMaterial}>
                  <Text style={ds.emptyMaterialText}>Chưa có nông dược nào</Text>
                </View>

                {canWriteLog ? (
                  <>
                    <TouchableOpacity style={ds.submitLogBtn} onPress={submitInlineLog} disabled={logSaving}>
                      {logSaving
                        ? <ActivityIndicator color="#fff" />
                        : <><Feather name="send" size={15} color="#fff" /><Text style={ds.submitLogBtnText}>Lưu ghi chép</Text></>
                      }
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={ds.fullFormLink}
                      onPress={() => { onClose(); setTimeout(() => onRefreshParent?.('openLog', task), 250); }}
                    >
                      <Feather name="external-link" size={13} color="#64748b" />
                      <Text style={ds.fullFormLinkText}>Mở form đầy đủ (ảnh, phân bón, nông dược...)</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Tab: Lịch sử ghi chép */}
          {activeTab === 'history' ? (
            <View style={ds.tabContent}>
              {loadingHistory ? (
                <View style={ds.historyLoading}>
                  <ActivityIndicator color="#15803d" />
                  <Text style={ds.loadingText}>Đang tải lịch sử...</Text>
                </View>
              ) : history.length === 0 ? (
                <View style={ds.emptyTabContent}>
                  <Feather name="inbox" size={36} color="#cbd5e1" />
                  <Text style={ds.emptyTabText}>Chưa có bản ghi nào</Text>
                </View>
              ) : (
                <View style={ds.historyList}>
                  <Text style={ds.historyCount}>{history.length} bản ghi</Text>
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
                                    • <Text style={{ fontWeight: '700', color: '#1e293b' }}>{valueOf(f.name, f.fertilizerName, 'Phân bón')}</Text>: <Text style={{ color: '#15803d', fontWeight: '800' }}>{formatNumber(f.quantity || f.amount || 1)} {valueOf(f.unit, 'kg')}</Text>{(f.area || f.totalArea) ? ` (${formatNumber(f.area || f.totalArea)} m²)` : ''}
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
                                    • <Text style={{ fontWeight: '700', color: '#1e293b' }}>{valueOf(p.name, p.pesticideName, 'Thuốc')}</Text>: <Text style={{ color: '#9333ea', fontWeight: '800' }}>{p.quantity || p.amount || 1} {valueOf(p.unit, 'lít')}</Text>{(p.area || p.totalArea) ? ` (${p.area || p.totalArea} m²)` : ''}
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
          ) : null}

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

          <View style={{ height: canWriteLog ? 80 : 40 }} />
        </ScrollView>
        {canWriteLog ? (
          <View style={ds.bottomStickyBar}>
            <TouchableOpacity style={ds.bottomSummaryBtn} onPress={() => setSummaryModalVisible(true)}>
              <Feather name="check-circle" size={17} color="#fff" />
              <Text style={ds.bottomSummaryBtnText}>Hoàn thành & Gửi Summary</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    )}
  </View>
);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function MyTasksScreen({ navigation, route }) {
  const currentUser = useAuthStore((state) => state.user);
  const currentUserAvatar = resolveAvatarUrl(currentUser?.avatarUrl || currentUser?.avatar);

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('ALL');
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
      } catch (errSum) {
        console.log('[fetchTasks] /my-logbook-summaries err:', errSum?.message);
      }

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
          } catch (errLb) {
            console.log(`[fetchTasks] /logbook/${lbId} err:`, errLb?.message);
            return [];
          }
        });
        const results = await Promise.all(taskPromises);
        logbookTasks = results.flat();
      }

      try {
        const res = await api.get('/cultivation-tasks/my-tasks', { params: { PageIndex: 1, PageSize: 100 } });
        myTasksRaw = extractItems(res.data);
      } catch (err) {
        console.log('[fetchTasks] /my-tasks err:', err?.message);
      }

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
          const matchName = itemLbName && Array.from(myLogbookNameSet).some((n) => n.toLowerCase() === itemLbName.toLowerCase() || itemLbName.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(itemLbName.toLowerCase()));
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
    if (action === 'openLog') openEntry(task, 'daily');
    if (action === 'openSummary') openEntry(task, 'summary');
  };

  useEffect(() => {
    const focusTaskId = route?.params?.focusTaskId;
    if (!focusTaskId || !tasks.length) return;
    const focusedTask = tasks.find((task) => getEntityId(task) === focusTaskId);
    if (!focusedTask) return;

    const status = String(focusedTask.status || '').toUpperCase();
    if (['ACTIVE', 'IN_PROGRESS'].includes(status)) openEntry(focusedTask, 'daily');
    else if (status === 'COMPLETED') openEntry(focusedTask, 'summary');
    navigation?.setParams?.({ focusTaskId: undefined });
  }, [navigation, route?.params?.focusTaskId, tasks]);

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
    } catch (requestError) {
      const serverMsg = getApiErrorMessage(requestError, '');
      if (serverMsg && (serverMsg.includes('cách ly') || serverMsg.includes('quarantine') || serverMsg.includes('Safe-super'))) {
        Alert.alert('Cảnh báo thời gian cách ly ⚠️', serverMsg);
      } else if (serverMsg && serverMsg.includes('nhật ký')) {
        Alert.alert('Chưa thể gửi tổng hợp ⚠️', serverMsg);
      } else {
        Alert.alert('Cảnh báo thời gian cách ly ⚠️', serverMsg || 'Chưa đủ ngày cách ly để gửi Summary.');
      }
    } finally {
      setSaving(false);
    }
  };

  const activeCount = tasks.filter((t) => normalizeStatus(t) === 'IN_PROGRESS').length;
  const pendingCount = tasks.filter((t) => normalizeStatus(t) === 'PENDING_APPROVAL').length;
  const completedCount = tasks.filter((t) => normalizeStatus(t) === 'COMPLETED').length;

  const filteredTasks = tasks.filter((task) => {
    const normState = normalizeStatus(task);
    if (filter === 'IN_PROGRESS') return normState === 'IN_PROGRESS';
    if (filter === 'PENDING_APPROVAL') return normState === 'PENDING_APPROVAL';
    if (filter === 'COMPLETED') return normState === 'COMPLETED';
    return true;
  });

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <Text style={styles.headerSubtitle}>Cập nhật tiến độ và ghi chép hằng ngày</Text>
      </View>
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {[
            ['ALL', `Tất cả (${tasks.length})`],
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
          const locationStr = valueOf(item.landPlotName, item.landPlotNames, item.landPlot?.name, item.logbookName, item.stageName);
          const stageOrPlan = valueOf(item.stageName, item.logbookName, item.planName, item.cropName);

          return (
            <View style={styles.card}>
              {stageOrPlan ? <Text style={styles.planSubTag}>📌 {stageOrPlan}</Text> : null}
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
              {locationStr ? (
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={14} color="#64748b" />
                  <Text style={styles.meta}>{locationStr}</Text>
                </View>
              ) : null}

              {/* Thành viên */}
              <View style={styles.memberRow}>
                <Feather name="users" size={14} color="#64748b" />
                <Text style={styles.memberLabel}>Thành viên nhóm</Text>
                {(() => {
                  const farmerList = item.assignments || item.assignees || item.assignedUsers || item.members || item.workers || [];
                  const leaderName = item.assignedLeaderName;
                  const rawLeaderAvatar = valueOf(
                    item.assignedLeaderAvatar, item.assignedLeaderAvatarUrl,
                    item.leaderAvatar, item.leaderAvatarUrl,
                    item.assignedLeader?.avatar, item.assignedLeader?.avatarUrl,
                    item.leader?.avatar, item.leader?.avatarUrl
                  );
                  const leaderAvatar = resolveAvatarUrl(rawLeaderAvatar, currentUserAvatar);
                  const memberList = [
                    ...(leaderName ? [{ fullName: leaderName, avatarUrl: leaderAvatar, isLeader: true }] : []),
                    ...farmerList.map((a) => ({
                      fullName: valueOf(a.fullName, a.farmerName, a.userName, a.name, '?'),
                      avatarUrl: resolveAvatarUrl(valueOf(
                        a.avatarUrl, a.avatar, a.imageUrl, a.photoUrl, a.photo, a.image,
                        a.user?.avatar, a.user?.avatarUrl, a.farmer?.avatar, a.farmer?.avatarUrl
                      )),
                      isLeader: a.role === 'FARM_LEADER' || a.isLeader,
                    })),
                  ];
                  const count = memberList.length || item.memberCount || item.assigneeCount || 0;
                  if (memberList.length === 0) {
                    return <Text style={styles.meta}>{count > 0 ? `${count} người` : '—'}</Text>;
                  }
                  const MAX_SHOW = 4;
                  const shown = memberList.slice(0, MAX_SHOW);
                  const remaining = count - shown.length;
                  return (
                    <View style={styles.avatarRow}>
                      {shown.map((a, i) => {
                        const name = valueOf(a.fullName, a.name, a.userName, '?');
                        const initial = (name || '?')[0].toUpperCase();
                        const isLeader = a.role === 'FARM_LEADER' || a.isLeader;
                        return (
                          <View key={i} style={[styles.miniAvatar, isLeader && styles.miniAvatarLeader, { marginLeft: i === 0 ? 0 : -6 }]}>
                            {a.avatarUrl ? (
                              <Image source={{ uri: a.avatarUrl }} style={styles.miniAvatarImg} />
                            ) : (
                              <Text style={styles.miniAvatarText}>{initial}</Text>
                            )}
                          </View>
                        );
                      })}
                      {remaining > 0 ? (
                        <View style={[styles.miniAvatar, { backgroundColor: '#e2e8f0', marginLeft: -6 }]}>
                          <Text style={[styles.miniAvatarText, { color: '#475569' }]}>+{remaining}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.meta, { marginLeft: 6 }]}>{count} người</Text>
                    </View>
                  );
                })()}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
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
                ) : state === 'PENDING_APPROVAL' ? (
                  <View style={[styles.logBtn, { backgroundColor: '#d97706' }]}>
                    <Feather name="clock" size={14} color="#fff" />
                    <Text style={styles.logBtnText}>Chờ duyệt</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Chưa có công việc</Text>
            <Text style={styles.emptySubtitle}>Bạn chưa được giao công việc nào trong kế hoạch canh tác.</Text>
          </View>
        }
      />

      {/* TaskDetailScreen – full screen modal */}
      {detailTask ? (
        <Modal visible animationType="slide" onRequestClose={() => setDetailTask(null)}>
          <TaskDetailScreen
            task={detailTask}
            onClose={() => setDetailTask(null)}
            onRefreshParent={handleDetailAction}
          />
        </Modal>
      ) : null}

      {/* DailyLogModal */}
      {dailyLogVisible && selectedTask ? (
        <DailyLogModal
          visible={dailyLogVisible}
          task={selectedTask}
          onClose={() => { setDailyLogVisible(false); setSelectedTask(null); }}
          onSuccess={() => { setDailyLogVisible(false); setSelectedTask(null); fetchTasks(); }}
        />
      ) : null}

      {/* Summary Modal */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const ds = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803d',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
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
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  infoCard: {
    flex: 1, backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  infoCardLabel: { fontSize: 11, color: '#16a34a', fontWeight: '600', marginBottom: 3 },
  infoCardValue: { fontSize: 13, color: '#15803d', fontWeight: '700' },
  detailGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12,
  },
  detailCell: {
    width: '47%', backgroundColor: '#fff', borderRadius: 10, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  detailCellIcon: { marginBottom: 4 },
  detailCellLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  detailCellValue: { fontSize: 13, color: '#1e293b', fontWeight: '700' },
  section: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  assigneeList: { gap: 10 },
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
    fontSize: 14, color: '#1e293b', minHeight: 90, marginBottom: 14,
    backgroundColor: '#fafafa',
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
  fullFormLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center',
  },
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
  bottomStickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1, borderTopColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  bottomSummaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 13,
  },
  bottomSummaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#15803d',
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  planSubTag: { fontSize: 11, color: '#15803d', fontWeight: '600', marginBottom: 8 },
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
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#15803d',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff',
    overflow: 'hidden',
  },
  miniAvatarLeader: { backgroundColor: '#1d4ed8' },
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
});

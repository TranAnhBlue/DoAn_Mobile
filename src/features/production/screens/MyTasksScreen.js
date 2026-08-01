import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthStore } from '../../../features/auth/store/authStore';
import { formatVietnamDateTime } from '../../../features/notifications/utils/dateTime';
import api from '../../../shared/api/client';
import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import DailyLogModal from '../components/DailyLogModal';

const BASE_API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.eapls.io.vn/api';
const API_ORIGIN = BASE_API_URL.replace(/\/api\/?$/, '');

const resolveAvatarUrl = (url, fallbackUrl = null) => {
  const raw = url || fallbackUrl;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return `${API_ORIGIN}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const normalizeStatus = (item) => {
  if (!item) return 'IN_PROGRESS';
  const val = valueOf(
    item.status?.name, item.status?.code, item.status?.statusName,
    item.status, item.taskStatus, item.state, item.approvalStatus
  );
  if (val === undefined || val === null || val === '') {
    if (item.completedAt || item.completedDate || item.progress === 100) return 'COMPLETED';
    return 'IN_PROGRESS';
  }
  const s = String(val).trim().toUpperCase();

  // Completed
  if (
    s === 'COMPLETED' || s === 'DONE' || s === 'FINISHED' || s === 'APPROVED' || s === '3' ||
    s.includes('HOÀN THÀNH') || s.includes('HOAN THANH') || s.includes('COMPLETED')
  ) {
    return 'COMPLETED';
  }

  // Waiting / Pending Approval
  if (
    s === 'WAITING_APPROVAL' || s === 'PENDING_APPROVAL' || s === 'SUBMITTED' || s === 'WAITING' || s === '2' ||
    s.includes('CHỜ DUYỆT') || s.includes('CHO DUYET') || s.includes('WAITING') || s.includes('PENDING')
  ) {
    return 'PENDING_APPROVAL';
  }

  // In Progress / Assigned / Active / Overdue
  if (
    s === 'IN_PROGRESS' || s === 'ASSIGNED' || s === 'DOING' || s === 'ACTIVE' || s === 'PLANNED' || s === 'OVERDUE' || s === 'PENDING' || s === '1' || s === '0' ||
    s.includes('ĐANG THỰC HIỆN') || s.includes('DANG THUC HIEN') || s.includes('ĐANG LÀM')
  ) {
    return 'IN_PROGRESS';
  }

  return 'IN_PROGRESS';
};

const STATUS = {
  PENDING: ['Chờ duyệt', '#d97706', '#fef3c7', '#b45309'],
  PENDING_APPROVAL: ['Chờ duyệt', '#d97706', '#fef3c7', '#b45309'],
  WAITING_APPROVAL: ['Chờ duyệt', '#d97706', '#fef3c7', '#b45309'],
  WAITING: ['Chờ duyệt', '#d97706', '#fef3c7', '#b45309'],
  SUBMITTED: ['Chờ duyệt', '#d97706', '#fef3c7', '#b45309'],
  PLANNED: ['Đã lên lịch', '#2563eb', '#dbeafe', '#1d4ed8'],
  IN_PROGRESS: ['Đang thực hiện', '#15803d', '#dcfce7', '#166534'],
  DOING: ['Đang thực hiện', '#15803d', '#dcfce7', '#166534'],
  COMPLETED: ['Hoàn thành', '#059669', '#dcfce7', '#166534'],
  DONE: ['Hoàn thành', '#059669', '#dcfce7', '#166534'],
  CANCELLED: ['Đã hủy', '#64748b', '#f1f5f9', '#475569'],
};

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const dateOf = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';
const dateTimeOf = (value) => formatVietnamDateTime(value, 'Chưa xác định');

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
        if (__DEV__) console.log('[DETAIL KEYS]', Object.keys(d).join(', '));
        if (__DEV__) console.log('[DETAIL MEMBER]', JSON.stringify({
          assignees: d.assignees,
          assignedUsers: d.assignedUsers,
          members: d.members,
          teamMembers: d.teamMembers,
          workers: d.workers,
          participants: d.participants,
          users: d.users,
          memberCount: d.memberCount,
          assigneeCount: d.assigneeCount,
        }));
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
    console.log(`[TaskDetail] taskId=${taskId} history found:`, found.length);
    setHistory(found);
    setLoadingHistory(false);
  }, [taskId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const d = data || task || {};
  const state = String(d.status || '').toUpperCase();
  const [statusLabel, statusColor, statusBg, statusText] = STATUS[state] || [d.status || 'Không rõ', '#64748b', '#f1f5f9', '#475569'];
  const canWriteLog = state === 'IN_PROGRESS' || state === 'DOING' || state === 'ACTIVE' || state === 'INPROGRESS' || state === 'PLANNED';
  const canSubmitSummary = state === 'COMPLETED' || state === 'DONE';
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

  // Check many possible member field names from different API responses
  // API trả về assignments (nông dân) + assignedLeaderName (leader)
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

  // Build unified assignees list for display
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

  // Inline form: submit daily log
  const submitInlineLog = useCallback(async () => {
    if (!logDesc.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập chi tiết công việc.'); return; }
    setLogSaving(true);
    const body = {
      cultivationTaskId: taskId,
      taskId,
      date: new Date().toISOString().split('T')[0],
      activityDate: new Date().toISOString(),
      description: logDesc.trim(),
      content: logDesc.trim(),
      notes: logDesc.trim(),
      fertilizers: [],
      pesticides: [],
      images: [],
    };
    const endpoints = [
      `/cultivation-tasks/${taskId}/daily-logs`,
      `/cultivation-tasks/${taskId}/logs`,
      '/cultivation-daily-logs',
      '/cultivation-logs',
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
      {/* Top bar – breadcrumb giống web */}
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

      {loadingData ? (
        <View style={ds.loadingHero}>
          <ActivityIndicator color="#15803d" size="large" />
          <Text style={ds.loadingText}>Đang tải chi tiết...</Text>
        </View>
      ) : (
        <ScrollView style={ds.scroll} contentContainerStyle={ds.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero block: tên + mô tả đầy đủ */}
          <View style={ds.heroBlock}>
            <Text style={ds.heroTitle}>{taskName}</Text>
            {description ? <Text style={ds.heroDesc}>{description}</Text> : null}
          </View>

          {/* Info cards: Kế hoạch + Giai đoạn */}
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

          {/* Detail grid 2x2 */}
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

          {/* Tab bar: Nội dung thực hiện | Lịch sử ghi chép */}
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

          {/* Tab: Nội dung thực hiện – inline form giống web (luôn hiển thị khung form) */}
          {activeTab === 'log' ? (
            <View style={ds.tabContent}>
              <View style={ds.inlineForm}>
                {/* Row: Ngày ghi nhận + Ảnh minh chứng */}
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

                {/* Chi tiết công việc */}
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

                {/* Phân bón section */}
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

                {/* Nông dược section */}
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

                {/* Submit & link button - only if active */}
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

          {/* Tab: Lịch sử ghi chép – giống cột phải trên web */}
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
                    const logDesc = valueOf(item.description, item.content, item.notes);
                    const updatedBy = valueOf(
                      item.createdByName, item.updatedByName, item.authorName, item.userName, 'Farm Leader'
                    );
                    const hasFert = item.fertilizers?.length > 0;
                    const hasPest = item.pesticides?.length > 0;
                    return (
                      <View key={idx} style={ds.historyItem}>
                        <View style={ds.historyDot} />
                        <View style={ds.historyBody}>
                          <Text style={ds.historyDate}>{dateTimeOf(logDate)}</Text>
                          <Text style={ds.historyUpdatedBy}>Cập nhật bởi: {updatedBy}</Text>
                          {logDesc ? <Text style={ds.historyDesc}>{logDesc}</Text> : null}
                          {(hasFert || hasPest) ? (
                            <View style={ds.historyMaterials}>
                              {hasFert ? (
                                <View style={ds.materialTag}>
                                  <Feather name="droplet" size={11} color="#15803d" />
                                  <Text style={ds.materialTagText}>
                                    {item.fertilizers.map((f) => valueOf(f.name, f.fertilizerName, 'Phân bón')).join(', ')}
                                  </Text>
                                </View>
                              ) : null}
                              {hasPest ? (
                                <View style={[ds.materialTag, { backgroundColor: '#fef3c7' }]}>
                                  <Feather name="shield" size={11} color="#d97706" />
                                  <Text style={[ds.materialTagText, { color: '#b45309' }]}>
                                    {item.pesticides.map((p) => valueOf(p.name, p.pesticideName, 'Thuốc')).join(', ')}
                                  </Text>
                                </View>
                              ) : null}
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

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function MyTasksScreen() {
  const currentUser = useAuthStore((state) => state.user);
  const currentUserAvatar = resolveAvatarUrl(currentUser?.avatarUrl || currentUser?.avatar);

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [entryMode, setEntryMode] = useState('daily');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('ALL');

  const fetchTasks = useCallback(async () => {
    setError('');
    try {
<<<<<<< Updated upstream:src/features/production/screens/MyTasksScreen.js
      const response = await api.get('/cultivation-tasks', { params: { PageIndex: 1, PageSize: 100 } });
      setTasks(extractItems(response.data));
=======
      let myTasksRaw = [];
      let logbookSummaries = [];
      let logbookTasks = [];

      // A. Fetch /cultivation-tasks/my-logbook-summaries (Logbooks assigned to logged in user)
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

      // B. For each of user's assigned logbooks, fetch tasks from /cultivation-tasks/logbook/{id}
      if (myLogbookIdSet.size > 0) {
        const taskPromises = Array.from(myLogbookIdSet).map(async (lbId) => {
          const lbObj = logbookSummaries.find((l) => String(getEntityId(l) || l.id || l.logbookId || '') === lbId);
          const lbName = valueOf(lbObj?.name, lbObj?.title, lbObj?.logbookName, lbObj?.planName);
          try {
            const rawBody = lbRes.data;
            const lbData = rawBody?.data ?? rawBody ?? {};
            let items = extractItems(lbData);
            if ((!items || items.length === 0) && lbData?.stages) {
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

      // C. Fetch /cultivation-tasks/my-tasks
      try {
        const res = await api.get('/cultivation-tasks/my-tasks', { params: { PageIndex: 1, PageSize: 100 } });
        myTasksRaw = extractItems(res.data);
      } catch (err) {
        console.log('[fetchTasks] /my-tasks err:', err?.message);
      }

      // Merge logbookTasks and myTasksRaw
      const mergedMap = new Map();

      // Put logbookTasks first (contains accurate logbook context & statuses)
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

        // STRICT LOGBOOK MATCH: Only include task if it belongs to user's assigned logbooks
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

      if (__DEV__) {
        console.log('[EXACT 9 LOGBOOK TASKS FILTERED]', cleanTasks.length, 'tasks');
        cleanTasks.forEach((t, i) => {
          console.log(`[TASK ${i + 1}] "${valueOf(t.taskName, t.name, t.title)}" -> rawStatus=${JSON.stringify(t.status)} normStatus=${normalizeStatus(t)} plan="${valueOf(t.planName, t.logbookName, t.cropName)}"`);
        });
      }
      setTasks(cleanTasks);
>>>>>>> Stashed changes:src/roles/farm-leader/screens/MyTasksScreen.js
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải công việc.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTasks(); }, [fetchTasks]));
<<<<<<< Updated upstream:src/features/production/screens/MyTasksScreen.js
=======

  const onRefresh = () => { setRefreshing(true); fetchTasks(); };
>>>>>>> Stashed changes:src/roles/farm-leader/screens/MyTasksScreen.js

  const openEntry = (task, mode) => {
    setSelectedTask(task);
    setEntryMode(mode);
<<<<<<< Updated upstream:src/features/production/screens/MyTasksScreen.js
    setDescription('');
=======
    if (mode === 'daily') { setDailyLogVisible(true); }
    else { setDescription(''); }
  };

  const handleDetailAction = (action, task) => {
    if (action === 'openLog') openEntry(task, 'daily');
    if (action === 'openSummary') openEntry(task, 'summary');
>>>>>>> Stashed changes:src/roles/farm-leader/screens/MyTasksScreen.js
  };

  useEffect(() => {
    const focusTaskId = route.params?.focusTaskId;
    if (!focusTaskId || !tasks.length) return;
    const focusedTask = tasks.find((task) => getEntityId(task) === focusTaskId);
    if (!focusedTask) return;

    const status = String(focusedTask.status || '').toUpperCase();
    if (['ACTIVE', 'IN_PROGRESS'].includes(status)) openEntry(focusedTask, 'daily');
    else if (status === 'COMPLETED') openEntry(focusedTask, 'summary');
    navigation.setParams({ focusTaskId: undefined });
  }, [navigation, route.params?.focusTaskId, tasks]);

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

  const completeTask = (task) => {
    Alert.alert('Gửi duyệt hoàn thành 📤', 'Xác nhận công việc này đã làm xong và gửi tới Farm Supervisor để phê duyệt?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gửi duyệt',
        onPress: async () => {
          try {
            const taskId = getEntityId(task);

            // Pre-check if task has daily logs recorded before completing
            try {
              const checkLogsRes = await api.get(`/cultivation-daily-logs/task/${taskId}`);
              const logs = extractItems(checkLogsRes.data) || (Array.isArray(checkLogsRes.data) ? checkLogsRes.data : []);
              if (!logs || logs.length === 0) {
                Alert.alert(
                  'Chưa thể gửi tổng hợp ⚠️',
                  'Cần có ít nhất một nhật ký hằng ngày trước khi gửi bản tổng hợp công việc.'
                );
                return;
              }
            } catch (errCheck) {
              // Proceed if check endpoint is unavailable
            }

            const endpoints = [
              `/cultivation-tasks/${taskId}/complete`,
              `/cultivation-tasks/${taskId}/submit`,
              `/cultivation-tasks/${taskId}/request-approval`,
              `/cultivation-tasks/${taskId}/status`,
              `/cultivation-tasks/${taskId}`,
            ];
            let success = false;
            let lastErr = null;
            for (const ep of endpoints) {
              try {
                if (ep.endsWith('/status')) { await api.patch(ep, { status: 'PENDING_APPROVAL' }); }
                else if (ep === `/cultivation-tasks/${taskId}`) { await api.put(ep, { ...task, status: 'PENDING_APPROVAL' }); }
                else { await api.post(ep, { status: 'PENDING_APPROVAL', completedAt: new Date().toISOString() }); }
                success = true; break;
              } catch (err) {
                lastErr = err;
                if (err?.response?.status === 400 || err?.response?.status === 422) {
                  throw err;
                }
                if (err?.response?.status !== 404) break;
              }
            }
            if (!success) throw lastErr || new Error('Không thể gửi duyệt.');
            Alert.alert('Đã gửi duyệt 🎉', 'Công việc đã được gửi tới Farm Supervisor.');
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
          }
        },
      },
    ]);
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
          // assignments = nông dân, assignedLeaderName = Farm Leader (đúng field API)
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
              {/* Thành viên – avatar + count giống web */}
              <View style={styles.memberRow}>
                <Feather name="users" size={14} color="#64748b" />
                <Text style={styles.memberLabel}>Thành viên nhóm</Text>
                {(() => {
                  // Dùng assignments (nông dân) + assignedLeaderName (leader) — đúng field API
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
                          <Text style={[styles.miniAvatarText, { color: '#64748b', fontSize: 9 }]}>+{remaining}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.memberCountText}>{count} người</Text>
                    </View>
                  );
                })()}
              </View>
              {/* Nút thao tác chuẩn web: "Ghi nhật ký hàng ngày" cho task đang thực hiện */}
              {canWriteLog ? (
                <View style={styles.cardActionsContainer}>
                  <TouchableOpacity style={styles.webLogBtn} onPress={() => setDetailTask(item)}>
                    <Feather name="file-text" size={16} color="#fff" />
                    <Text style={styles.webLogBtnText}>Ghi nhật ký hàng ngày</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.completeSubBtn} onPress={() => completeTask(item)}>
                    <Feather name="check-circle" size={14} color="#15803d" />
                    <Text style={styles.completeSubBtnText}>Hoàn thành công việc</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.detailBtn} onPress={() => setDetailTask(item)}>
                  <Feather name="eye" size={16} color="#15803d" />
                  <Text style={styles.detailBtnText}>Xem chi tiết</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="check-square" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Không có công việc</Text></View>}
      />

<<<<<<< Updated upstream:src/features/production/screens/MyTasksScreen.js
      <DailyLogModal
        visible={Boolean(selectedTask) && entryMode === 'daily'}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onSaved={fetchTasks}
      />
=======
      <DailyLogModal visible={dailyLogVisible} task={selectedTask} onClose={() => setDailyLogVisible(false)} onSaved={fetchTasks} />
>>>>>>> Stashed changes:src/roles/farm-leader/screens/MyTasksScreen.js

      <Modal visible={Boolean(selectedTask) && entryMode === 'summary'} transparent animationType="slide" onRequestClose={() => setSelectedTask(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tổng hợp công việc</Text>
            <Text style={styles.modalTask} numberOfLines={2}>{valueOf(selectedTask?.taskName, selectedTask?.name, selectedTask?.title)}</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Nội dung tổng hợp sau khi hoàn thành" multiline value={description} onChangeText={setDescription} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setSelectedTask(null)} disabled={saving}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={submitEntry} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Gửi tổng hợp</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(detailTask)} animationType="slide" onRequestClose={() => setDetailTask(null)}>
        {detailTask ? (
          <TaskDetailScreen task={detailTask} onClose={() => setDetailTask(null)}
            onRefreshParent={(action, task) => { setDetailTask(null); handleDetailAction(action, task); }} />
        ) : null}
      </Modal>
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  filtersContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 10 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1' },
  filterActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  filterText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  filterTextActive: { color: '#ffffff', fontWeight: '800' },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  planSubTag: { color: '#15803d', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: '#0f172a', fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  description: { color: '#475569', lineHeight: 20, marginTop: 9 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  meta: { flex: 1, color: '#64748b', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  action: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  logAction: { backgroundColor: '#2563eb' },
  completeAction: { backgroundColor: '#15803d' },
  summaryAction: { backgroundColor: '#7c3aed' },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, paddingVertical: 11, borderRadius: 10, backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#15803d' },
  detailBtnText: { color: '#15803d', fontWeight: '800', fontSize: 14 },
  cardActionsContainer: { marginTop: 14, gap: 8 },
  webLogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#15803d', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3 },
  webLogBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  completeSubBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  completeSubBtnText: { color: '#15803d', fontWeight: '700', fontSize: 13 },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  memberLabel: { color: '#64748b', fontSize: 13, marginRight: 4 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', overflow: 'hidden' },
  miniAvatarLeader: { backgroundColor: '#f59e0b' },
  miniAvatarImg: { width: 24, height: 24, borderRadius: 12 },
  miniAvatarText: { color: '#fff', fontWeight: '900', fontSize: 10 },
  memberCountText: { color: '#64748b', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  modalCard: { backgroundColor: '#fff', padding: 20, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  modalTask: { color: '#15803d', fontWeight: '700', marginTop: 5, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, color: '#0f172a' },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 12 },
  cancelButton: { backgroundColor: '#f1f5f9' },
  saveButton: { backgroundColor: '#15803d' },
  cancelText: { color: '#475569', fontWeight: '800' },
  saveText: { color: '#fff', fontWeight: '800' },
});

const ds = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#15803d', paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, gap: 12 },
  backBtn: { padding: 4 },
  topBarCenter: { flex: 1 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breadcrumbBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  breadcrumbDot: { width: 7, height: 7, borderRadius: 4 },
  breadcrumbText: { fontSize: 12, fontWeight: '800' },
  breadcrumbStage: { color: '#dcfce7', fontSize: 12, fontWeight: '600', flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loadingHero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontWeight: '600', marginTop: 8 },
  heroBlock: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  heroTitle: { color: '#0f172a', fontSize: 22, fontWeight: '900', lineHeight: 30 },
  heroDesc: { color: '#475569', fontSize: 14, lineHeight: 22, marginTop: 8 },
  infoRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 16, flexWrap: 'wrap' },
  infoCard: { flex: 1, minWidth: 140, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  infoCardLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  infoCardValue: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  detailCell: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  detailCellIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  detailCellLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  detailCellValue: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  section: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  sectionTitle: { color: '#0f172a', fontWeight: '900', fontSize: 14, marginBottom: 12 },
  assigneeList: { gap: 10 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  avatarLeader: { backgroundColor: '#1d4ed8' },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  assigneeName: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  assigneeRole: { color: '#64748b', fontSize: 12, marginTop: 1 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9 },
  tabActive: { backgroundColor: '#f0fdf4' },
  tabText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#15803d' },
  tabContent: { marginHorizontal: 16, marginTop: 12 },
  logPromptCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#15803d' },
  logPromptTitle: { color: '#15803d', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  logPromptDesc: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  logPromptBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#15803d', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  logPromptBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emptyTabContent: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTabText: { color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
  historyLoading: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  historyList: { gap: 0 },
  historyCount: { color: '#15803d', fontWeight: '800', fontSize: 13, marginBottom: 12 },
  historyItem: { flexDirection: 'row', gap: 12, paddingBottom: 16 },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#15803d', marginTop: 5, flexShrink: 0 },
  historyBody: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  historyDate: { color: '#15803d', fontWeight: '800', fontSize: 13 },
  historyUpdatedBy: { color: '#94a3b8', fontSize: 11, marginTop: 2, marginBottom: 6 },
  historyDesc: { color: '#334155', fontSize: 13, lineHeight: 20 },
  historyMaterials: { marginTop: 8, gap: 6 },
  materialTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  materialTagText: { color: '#15803d', fontSize: 11, fontWeight: '700', flexShrink: 1 },
  historyImgHint: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
  // ── Inline form styles ──────────────────────────────────────────
  inlineForm: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  inlineFormHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 4 },
  inlineFormHeaderText: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  formRow: { flexDirection: 'row', gap: 10 },
  formHalf: { flex: 1 },
  formLabel: { color: '#374151', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  dateDisplayBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  dateDisplayText: { color: '#64748b', fontSize: 13 },
  photoBox: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  photoBoxText: { color: '#94a3b8', fontSize: 12 },
  formTextarea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 96, fontSize: 14, color: '#0f172a' },
  formSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  formSectionTitle: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  addMaterialBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  addMaterialBtnText: { color: '#15803d', fontWeight: '700', fontSize: 12 },
  emptyMaterial: { backgroundColor: '#f8fafc', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  emptyMaterialText: { color: '#94a3b8', fontSize: 12 },
  submitLogBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#15803d', paddingVertical: 14, borderRadius: 12, marginTop: 6 },
  submitLogBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  fullFormLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  fullFormLinkText: { color: '#64748b', fontSize: 12 },
  readOnlyBadge: { marginLeft: 'auto', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  readOnlyBadgeText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  formTextareaDisabled: { backgroundColor: '#f1f5f9', color: '#64748b' },
  historyImageGallery: { marginTop: 10 },
  historyImageScroll: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  historyThumbImage: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#f1f5f9' },
  imagePreviewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  closePreviewBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullPreviewImage: { width: '92%', height: '82%' },
});

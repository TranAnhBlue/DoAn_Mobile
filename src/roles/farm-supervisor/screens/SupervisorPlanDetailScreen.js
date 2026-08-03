
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import { formatNumber, resolveAvatarUrl } from '../../../shared/utils/format';
import supervisorApi from '../api/supervisorApi';
import AssignmentModal from '../components/AssignmentModal';

const TABS = [
  ['tasks', 'Quản lý công việc', 'check-square'],
  ['history', 'Lịch sử ghi log', 'file-text'],
  ['close', 'Chốt nhật ký', 'check-circle'],
];

const STATUS = {
  PENDING: ['Chờ kích hoạt', '#64748b'],
  PLANNED: ['Đã lên lịch', '#2563eb'],
  ACTIVE: ['Đang hoạt động', '#2563eb'],
  IN_PROGRESS: ['Đang thực hiện', '#2563eb'],
  COMPLETED: ['Hoàn thành', '#15803d'],
  CANCELLED: ['Đã hủy', '#64748b'],
};

const LOG_STATUS = {
  APPROVED: ['Đã duyệt', '#059669', '#dcfce7'],
  REJECTED: ['Từ chối', '#dc2626', '#fee2e2'],
  PENDING: ['Chờ duyệt', '#d97706', '#fef3c7'],
};

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const dateLabel = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định');
const asArray = (body) => {
  const payload = unwrapPayload(body);
  if (Array.isArray(payload)) return payload;
  return extractItems(body);
};

export default function SupervisorPlanDetailScreen({ navigation, route }) {
  const planId = route.params?.planId;
  const [plan, setPlan] = useState(null);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [selectedTaskIdFilter, setSelectedTaskIdFilter] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [historyGroups, setHistoryGroups] = useState([]);
  const [summary, setSummary] = useState(null);
  const [officialLogs, setOfficialLogs] = useState([]);
  const [supervisorDescription, setSupervisorDescription] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [logModal, setLogModal] = useState({ visible: false, log: null, action: 'approve', comment: '' });
  const [approveCompletionModal, setApproveCompletionModal] = useState({ visible: false, quantity: '', unit: 'kg' });
  const [rejectCompletionModal, setRejectCompletionModal] = useState({ visible: false, reason: '' });
  const [imageViewer, setImageViewer] = useState({ visible: false, images: [], index: 0 });

  const fetchDetail = useCallback(async () => {
    if (!planId) return;
    setError('');
    try {
      const [planResult, stagesResult, usersResult] = await Promise.allSettled([
        supervisorApi.getPlan(planId),
        supervisorApi.getStages(planId),
        supervisorApi.getUsers(),
      ]);

      if (planResult.status === 'rejected') throw planResult.reason;
      if (stagesResult.status === 'rejected') throw stagesResult.reason;

      const nextPlan = unwrapPayload(planResult.value.data);
      const nextStages = asArray(stagesResult.value.data).sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
      setPlan(nextPlan);
      setStages(nextStages);
      setSelectedStageId((current) => (nextStages.some((stage) => getEntityId(stage) === current) ? current : getEntityId(nextStages[0])));
      if (usersResult.status === 'fulfilled') setUsers(extractItems(usersResult.value.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết kế hoạch.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  useFocusEffect(useCallback(() => { fetchDetail(); }, [fetchDetail]));

  const selectedStage = useMemo(() => stages.find((stage) => getEntityId(stage) === selectedStageId) || stages[0], [selectedStageId, stages]);
  const tasks = selectedStage?.tasks || [];

  const loadStageData = useCallback(() => {
    if (!selectedStageId || activeTab === 'tasks') return;
    setTabLoading(true);

    const request = activeTab === 'history'
      ? supervisorApi.getStageDailyLogs(selectedStageId).then((response) => {
        setHistoryGroups(asArray(response.data));
      })
      : Promise.all([
        supervisorApi.getStageSummary(selectedStageId),
        supervisorApi.getStageOfficialLogs(selectedStageId),
      ]).then(([summaryResponse, logsResponse]) => {
        const nextSummary = unwrapPayload(summaryResponse.data);
        setSummary(nextSummary);
        setOfficialLogs(asArray(logsResponse.data));
        setSupervisorDescription(nextSummary?.draftDescription || '');
      });

    request.catch((requestError) => {
      Alert.alert('Không thể tải dữ liệu', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    }).finally(() => {
      setTabLoading(false);
    });
  }, [activeTab, selectedStageId]);

  useEffect(() => {
    loadStageData();
  }, [loadStageData]);

  const saveAssignment = async (values) => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      await supervisorApi.updateTask(getEntityId(selectedTask), values);
      setSelectedTask(null);
      await fetchDetail();
      Alert.alert('Thành công', 'Đã cập nhật nhân sự cho công việc.');
    } catch (requestError) {
      Alert.alert('Không thể phân công', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const startTask = (task) => Alert.alert('Kích hoạt công việc', `Kích hoạt “${task.name}”?`, [
    { text: 'Hủy', style: 'cancel' },
    {
      text: 'Kích hoạt',
      onPress: async () => {
        try {
          await supervisorApi.startTask(getEntityId(task));
          fetchDetail();
        } catch (requestError) {
          Alert.alert('Không thể kích hoạt', getApiErrorMessage(requestError, 'Vui lòng kiểm tra trạng thái kế hoạch.'));
        }
      },
    },
  ]);

  const handleLogActionSubmit = async () => {
    const { log, action, comment } = logModal;
    if (!log) return;
    const logId = getEntityId(log) || log.id;
    setSaving(true);
    try {
      if (action === 'approve') {
        await supervisorApi.approveLog(logId, { comment: comment.trim() || undefined });
        Alert.alert('Đã phê duyệt 🎉', 'Nhật ký đã được duyệt thành công.');
      } else {
        if (!comment.trim()) {
          Alert.alert('Thiếu lý do ⚠️', 'Vui lòng nhập nhận xét/lý do từ chối.');
          setSaving(false);
          return;
        }
        await supervisorApi.rejectLog(logId, { comment: comment.trim() });
        Alert.alert('Đã từ chối', 'Nhật ký đã được chuyển về trạng thái từ chối.');
      }
      setLogModal({ visible: false, log: null, action: 'approve', comment: '' });
      loadStageData();
    } catch (requestError) {
      Alert.alert('Thao tác thất bại', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleApproveCompletionSubmit = async () => {
    const { quantity, unit } = approveCompletionModal;
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert('Số lượng không hợp lệ ⚠️', 'Vui lòng nhập số lượng sản phẩm lớn hơn 0.');
      return;
    }
    if (!unit.trim()) {
      Alert.alert('Thiếu đơn vị ⚠️', 'Vui lòng nhập đơn vị tính (kg, tấn...).');
      return;
    }
    setSaving(true);
    try {
      await supervisorApi.approveCompletion(planId, { quantity: Number(quantity), unit: unit.trim() });
      setApproveCompletionModal({ visible: false, quantity: '', unit: 'kg' });
      await fetchDetail();
      Alert.alert('Thành công 🎉', 'Đã phê duyệt đóng kế hoạch và khởi tạo lô sản phẩm thu hoạch!');
    } catch (requestError) {
      Alert.alert('Không thể phê duyệt', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRejectCompletionSubmit = async () => {
    const { reason } = rejectCompletionModal;
    if (!reason.trim()) {
      Alert.alert('Thiếu lý do ⚠️', 'Vui lòng nhập lý do từ chối yêu cầu chốt sổ.');
      return;
    }
    setSaving(true);
    try {
      await supervisorApi.rejectCompletion(planId, { reason: reason.trim() });
      setRejectCompletionModal({ visible: false, reason: '' });
      await fetchDetail();
      Alert.alert('Đã từ chối', 'Yêu cầu chốt sổ đã bị từ chối.');
    } catch (requestError) {
      Alert.alert('Không thể từ chối', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const saveOfficialLog = async () => {
    if (!supervisorDescription.trim()) {
      Alert.alert('Thiếu mô tả', 'Nhập mô tả tổng kết của Supervisor trước khi chốt giai đoạn.');
      return;
    }
    setSaving(true);
    try {
      await supervisorApi.saveOfficialLog(selectedStageId, supervisorDescription.trim());
      const [summaryResponse, logsResponse] = await Promise.all([
        supervisorApi.getStageSummary(selectedStageId),
        supervisorApi.getStageOfficialLogs(selectedStageId),
      ]);
      setSummary(unwrapPayload(summaryResponse.data));
      setOfficialLogs(asArray(logsResponse.data));
      Alert.alert('Thành công', 'Đã lưu nhật ký chính thức vào lịch sử.');
    } catch (requestError) {
      Alert.alert('Không thể chốt giai đoạn', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const submitCompletion = () => Alert.alert(
    'Gửi nhật ký lên Manager',
    'Gửi yêu cầu hoàn thành toàn bộ Logbook để Manager kiểm tra?',
    [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gửi yêu cầu',
        onPress: async () => {
          try {
            await supervisorApi.submitCompletion(planId);
            fetchDetail();
            Alert.alert('Đã gửi', 'Manager sẽ nhận được yêu cầu kiểm tra Logbook.');
          } catch (requestError) {
            Alert.alert('Chưa thể gửi', getApiErrorMessage(requestError, 'Cần hoàn tất các giai đoạn trước khi gửi.'));
          }
        },
      },
    ],
  );

  const renderStageSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageList}>
      {stages.map((stage, index) => {
        const selected = getEntityId(stage) === selectedStageId;
        return (
          <TouchableOpacity key={getEntityId(stage)} style={[styles.stageChip, selected && styles.stageChipActive]} onPress={() => setSelectedStageId(getEntityId(stage))}>
            <View style={[styles.stageNumber, selected && styles.stageNumberActive]}><Text style={[styles.stageNumberText, selected && styles.stageNumberTextActive]}>{stage.stageOrder || index + 1}</Text></View>
            <Text style={[styles.stageChipText, selected && styles.stageChipTextActive]} numberOfLines={2}>{stage.stageName}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderTaskManagement = () => (
    <>
      {selectedStage?.description || selectedStage?.note ? (
        <View style={styles.guide}><Feather name="info" size={20} color="#d97706" /><View style={styles.guideText}><Text style={styles.guideTitle}>Hướng dẫn giai đoạn</Text><Text style={styles.guideBody}>{selectedStage.description || selectedStage.note}</Text></View></View>
      ) : null}
      <Text style={styles.blockTitle}>Công việc ({tasks.length})</Text>
      {tasks.map((task) => {
        const state = String(task.status || '').toUpperCase();
        const [label, color] = STATUS[state] || [task.status || 'Không rõ', '#64748b'];
        const assignmentCount = (task.assignments || []).length;
        return (
          <TouchableOpacity key={getEntityId(task)} style={styles.taskCard} activeOpacity={0.8} onPress={() => navigation.navigate('SupervisorTaskDetail', { taskId: getEntityId(task), task })}>
            <View style={styles.taskTop}><Text style={styles.taskName}>{task.name}</Text><View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}><Text style={[styles.statusText, { color }]}>{label}</Text></View><Feather name="chevron-right" size={18} color="#94a3b8" /></View>
            {task.description ? <Text style={styles.taskDescription}>{task.description}</Text> : null}
            <View style={styles.assignmentLine}><Feather name="users" size={14} color="#15803d" /><Text style={styles.assignmentText}>{task.assignedLeaderName || 'Chưa có Farm Leader'}{assignmentCount ? ` · ${assignmentCount} nông dân` : ''}</Text></View>
            {!['COMPLETED', 'CANCELLED'].includes(state) || ['PENDING', 'PLANNED'].includes(state) ? (
              <View style={styles.taskActions}>
                {!['COMPLETED', 'CANCELLED'].includes(state) ? (
                  <TouchableOpacity style={[styles.taskButton, styles.assignButton]} onPress={(event) => { event.stopPropagation(); setSelectedTask(task); }}>
                    <Feather name="user-plus" size={15} color="#2563eb" />
                    <Text style={styles.assignText}>Phân công</Text>
                  </TouchableOpacity>
                ) : null}
                {['PENDING', 'PLANNED'].includes(state) ? (
                  <TouchableOpacity style={[styles.taskButton, styles.startButton]} onPress={(event) => { event.stopPropagation(); startTask(task); }}>
                    <Feather name="play" size={15} color="#fff" />
                    <Text style={styles.startText}>Kích hoạt</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
      {!tasks.length ? <Text style={styles.emptyText}>Giai đoạn chưa có công việc.</Text> : null}
    </>
  );

  const renderHistory = () => {
    const filteredGroups = selectedTaskIdFilter
      ? historyGroups.filter((g) => String(g.taskId) === String(selectedTaskIdFilter))
      : historyGroups;

    const totalLogsCount = historyGroups.reduce((acc, g) => acc + (g.logs?.length || 0), 0);

    return (
      <>
        <View style={styles.historyHeaderRow}>
          <Text style={styles.blockTitle}>CẤU TRÚC CÔNG VIỆC</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalLogsCount} bản ghi</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskFilterList}>
          <TouchableOpacity
            style={[styles.taskFilterChip, !selectedTaskIdFilter && styles.taskFilterChipActive]}
            onPress={() => setSelectedTaskIdFilter(null)}
          >
            <Text style={[styles.taskFilterText, !selectedTaskIdFilter && styles.taskFilterTextActive]}>Tất cả công việc</Text>
          </TouchableOpacity>

          {tasks.map((t) => {
            const tId = getEntityId(t);
            const isSel = String(selectedTaskIdFilter) === String(tId);
            return (
              <TouchableOpacity
                key={tId}
                style={[styles.taskFilterChip, isSel && styles.taskFilterChipActive]}
                onPress={() => setSelectedTaskIdFilter(isSel ? null : tId)}
              >
                <Text style={[styles.taskFilterText, isSel && styles.taskFilterTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredGroups.map((group, groupIndex) => {
          const logs = group.logs || [];
          return (
            <View key={group.taskId || groupIndex} style={styles.historyGroup}>
              <View style={styles.groupHeaderRow}>
                <Feather name="check-square" size={15} color="#15803d" />
                <Text style={styles.historyTask}>Lịch sử ghi nhận: {group.taskName || 'Công việc'}</Text>
              </View>

              {logs.map((log, logIndex) => {
                const creatorName = valueOf(
                  log.creatorName, log.createdByName, log.authorName,
                  log.user?.fullname, log.user?.fullName, log.createdUser?.fullName, log.workerName, 'Nguyễn Văn B'
                );

                const description = valueOf(log.description, log.notes, log.content, '');
                const fertilizers = log.fertilizers || log.dailyLogFertilizers || [];
                const pesticides = log.pesticides || log.dailyLogPesticides || [];
                const images = log.images || log.photoUrls || log.photos || [];

                return (
                  <View key={getEntityId(log) || logIndex} style={styles.webLogCard}>
                    <View style={styles.webLogHeader}>
                      <View style={styles.webLogDateRow}>
                        <Feather name="calendar" size={14} color="#16a34a" />
                        <Text style={styles.webLogDateText}>{dateLabel(valueOf(log.date, log.createdAt, log.performedAt))}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={styles.authorBadge}>
                          <Feather name="user" size={12} color="#64748b" />
                          <Text style={styles.authorText}>Cập nhật bởi: <Text style={styles.authorBold}>{creatorName}</Text></Text>
                        </View>
                      </View>
                    </View>

                    {description ? (
                      <View style={styles.webNoteBox}>
                        <Text style={styles.webNoteText}>{description}</Text>
                      </View>
                    ) : null}

                    {fertilizers.length > 0 ? (
                      <View style={styles.materialBox}>
                        <View style={styles.materialHeaderRow}>
                          <Feather name="droplet" size={13} color="#1d4ed8" />
                          <Text style={styles.materialTitle}>Phân bón sử dụng:</Text>
                        </View>
                        {fertilizers.map((f, fIdx) => (
                          <View key={fIdx} style={styles.materialRowInline}>
                            <Text style={styles.matName}>{valueOf(f.name, f.fertilizerName, f.materialName, 'Phân bón')}</Text>
                            <Text style={styles.matQty}>
                              {formatNumber(f.quantity || f.totalQuantity || 0)} {f.unit || 'kg'}
                              {f.area ? <Text style={styles.matArea}> ({formatNumber(f.area)} m²)</Text> : null}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {pesticides.length > 0 ? (
                      <View style={[styles.materialBox, { backgroundColor: '#faf5ff', borderColor: '#f3e8ff' }]}>
                        <View style={styles.materialHeaderRow}>
                          <Feather name="shield" size={13} color="#9333ea" />
                          <Text style={[styles.materialTitle, { color: '#7e22ce' }]}>Nông dược sử dụng:</Text>
                        </View>
                        {pesticides.map((p, pIdx) => (
                          <View key={pIdx} style={styles.materialRowInline}>
                            <Text style={styles.matName}>{valueOf(p.name, p.pesticideName, p.materialName, 'Nông dược')}</Text>
                            <Text style={[styles.matQty, { color: '#9333ea' }]}>
                              {formatNumber(p.quantity || p.totalQuantity || 0)} {p.unit || 'ml'}
                              {p.area ? <Text style={styles.matArea}> ({formatNumber(p.area)} m²)</Text> : null}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {images.length > 0 ? (
                      <View style={styles.proofSection}>
                        <Text style={styles.proofTitle}>Ảnh minh chứng:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                          {images.map((img, imgIdx) => {
                            const imgUrl = typeof img === 'string' ? resolveAvatarUrl(img) : resolveAvatarUrl(img.url || img.imageUrl);
                            if (!imgUrl) return null;
                            return (
                              <TouchableOpacity key={imgIdx} activeOpacity={0.8} onPress={() => setImageViewer({ visible: true, images: images.map(i => typeof i === 'string' ? resolveAvatarUrl(i) : resolveAvatarUrl(i.url || i.imageUrl)).filter(Boolean), index: imgIdx })}>
                                <Image source={{ uri: imgUrl }} style={styles.proofThumbImage} />
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    ) : null}

                  </View>
                );
              })}

              {!logs.length ? <Text style={styles.noLog}>Chưa có nhật ký cho công việc này.</Text> : null}
            </View>
          );
        })}

        {!filteredGroups.length ? <Text style={styles.emptyText}>Giai đoạn chưa có lịch sử ghi log.</Text> : null}
      </>
    );
  };

  const renderCloseLogbook = () => {
    const materials = summary?.materials || [];
    const images = summary?.images || [];
    const approved = summary?.approvedLogs || officialLogs || [];
    const planStatus = String(plan?.status || '').toUpperCase();
    const isClosing = ['CLOSING_REVIEW', 'WAITING_APPROVAL', 'PENDING_REVIEW', 'SUBMITTED'].includes(planStatus);
    const isCompleted = planStatus === 'COMPLETED';

    return (
      <>
        <Text style={styles.blockTitle}>{selectedStage?.stageName || 'Giai đoạn'}</Text>

        {isClosing ? (
          <View style={styles.closingBanner}>
            <Feather name="clock" size={20} color="#c2410c" />
            <View style={{ flex: 1 }}>
              <Text style={styles.closingBannerTitle}>Nhật ký đang chờ chốt sổ</Text>
              <Text style={styles.closingBannerSub}>Vui lòng kiểm tra tổng hợp vật tư & minh chứng trước khi phê duyệt đóng kế hoạch.</Text>
            </View>
          </View>
        ) : null}

        {isCompleted ? (
          <View style={[styles.closingBanner, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Feather name="check-circle" size={20} color="#16a34a" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.closingBannerTitle, { color: '#15803d' }]}>Kế hoạch đã đóng & hoàn thành</Text>
              <Text style={[styles.closingBannerSub, { color: '#166534' }]}>Lô sản phẩm thu hoạch đã được tạo thành công trên hệ thống.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.draftCardWrapper}>
          <Text style={styles.draftCardMainTitle}>Bản tổng hợp chờ biên soạn</Text>
          <View style={styles.draftCardDivider} />
          <Text style={styles.summaryTitle}>Bảng tổng hợp vật tư</Text>
          {materials.map((material, index) => (
            <View key={getEntityId(material) || index} style={styles.materialRow}>
              <Text style={styles.materialName}>{valueOf(material.name, material.materialName, 'Vật tư')}</Text>
              <Text style={styles.materialValue}>{formatNumber(valueOf(material.totalQuantity, material.quantity, 0))} {material.unit || ''}</Text>
            </View>
          ))}
          {!materials.length ? <Text style={styles.noLog}>Chưa có vật tư được ghi nhận.</Text> : null}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ảnh thực địa</Text>
          {images.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {images.map((item, index) => {
                const imgUrl = item.url || item.imageUrl;
                if (!imgUrl) return null;
                return (
                  <TouchableOpacity key={item.id || index} activeOpacity={0.8} onPress={() => setImageViewer({ visible: true, images: images.map(i => i.url || i.imageUrl).filter(Boolean), index })}>
                    <Image source={{ uri: imgUrl }} style={styles.summaryImage} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.noLog}>Chưa có ảnh minh chứng.</Text>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Mô tả và văn phong chuẩn</Text>
          <TextInput
            style={styles.summaryInput}
            value={supervisorDescription}
            onChangeText={setSupervisorDescription}
            placeholder="Tổng hợp tình hình thực hiện, vật tư sử dụng và vấn đề phát sinh..."
            placeholderTextColor="#64748b"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.officialButton} onPress={saveOfficialLog} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <><Feather name="save" size={17} color="#fff" /><Text style={styles.officialButtonText}>Lưu vào lịch sử</Text></>}
          </TouchableOpacity>
        </View>

        <View style={styles.stageLogWrapper}>
          <View style={styles.stageLogHeaderTitleRow}>
            <Feather name="book" size={16} color="#15803d" />
            <Text style={styles.stageLogMainTitle}>Nhật ký giai đoạn</Text>
            <View style={styles.stageLogCountBadge}><Text style={styles.stageLogCountText}>{approved.length} mục</Text></View>
          </View>
          
          {approved.map((log, index) => (
            <View key={getEntityId(log) || index} style={styles.stageLogCard}>
              <View style={styles.stageLogTopLine}>
                <View style={styles.stageLogIndexBox}><Text style={styles.stageLogIndexText}>{index + 1}</Text></View>
                <Text style={styles.stageLogStageName}>{selectedStage?.stageName}</Text>
                <View style={styles.stageLogStatusBadge}><Text style={styles.stageLogStatusText}>Đã duyệt</Text></View>
              </View>
              <Text style={styles.stageLogDateInfo}>Bắt đầu: {dateLabel(plan?.startDate)}   Kết thúc: {dateLabel(valueOf(log.createdAt, log.date))}</Text>
              <Text style={styles.stageLogDescLabel}>MÔ TẢ NHẬT KÝ:</Text>
              <Text style={styles.stageLogDescText}>{valueOf(log.supervisorDescription, log.description, 'Đã lưu nhật ký chính thức')}</Text>

              {log.materials && log.materials.length > 0 ? (
                <View style={styles.stageLogMaterialBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Feather name="box" size={13} color="#2563eb" />
                    <Text style={styles.stageLogMaterialLabel}>VẬT TƯ SỬ DỤNG:</Text>
                  </View>
                  {log.materials.map((m, mIdx) => (
                    <Text key={mIdx} style={styles.stageLogMaterialText}>
                      {valueOf(m.name, m.materialName, 'Vật tư')}: {formatNumber(m.quantity || m.totalQuantity || 0)} {m.unit || 'kg'}
                      {m.area ? `, diện tích ${formatNumber(m.area)} m2` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}

              {log.images && log.images.length > 0 ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.stageLogImageLabel}>Ảnh minh chứng:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {log.images.map((img, imgIdx) => {
                      const imgUrl = typeof img === 'string' ? resolveAvatarUrl(img) : resolveAvatarUrl(img.url || img.imageUrl);
                      if (!imgUrl) return null;
                      return (
                        <TouchableOpacity key={imgIdx} activeOpacity={0.8} onPress={() => setImageViewer({ visible: true, images: log.images.map(i => typeof i === 'string' ? resolveAvatarUrl(i) : resolveAvatarUrl(i.url || i.imageUrl)).filter(Boolean), index: imgIdx })}>
                          <Image source={{ uri: imgUrl }} style={styles.stageLogThumbImage} />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ))}
          {!approved.length ? <Text style={styles.emptyText}>Chưa có nhật ký chính thức.</Text> : null}
        </View>

        {isClosing ? (
          <View style={styles.completionActionRow}>
            <TouchableOpacity
              style={styles.approveCompletionBtn}
              onPress={() => setApproveCompletionModal({ visible: true, quantity: '', unit: 'kg' })}
            >
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.completionBtnText}>Phê duyệt đóng sổ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectCompletionBtn}
              onPress={() => setRejectCompletionModal({ visible: true, reason: '' })}
            >
              <Feather name="x-circle" size={18} color="#dc2626" />
              <Text style={styles.rejectCompletionBtnText}>Từ chối đóng sổ</Text>
            </TouchableOpacity>
          </View>
        ) : !isCompleted ? (
          <TouchableOpacity style={styles.submitCompletionButton} onPress={submitCompletion}>
            <Feather name="send" size={18} color="#fff" />
            <Text style={styles.submitCompletionText}>Gửi nhật ký lên Manager</Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;
  if (!plan) return <View style={styles.center}><Text style={styles.errorText}>{error || 'Không tìm thấy kế hoạch.'}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Chi tiết kế hoạch</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{plan.logbookName || plan.planName || plan.name || `Quy trình trồng ${plan.cropName || 'cây'}`}</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} colors={['#15803d']} />}>
        <View style={styles.planCard}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planTitle}>{plan.logbookName || plan.planName || plan.name || `Quy trình trồng ${plan.cropName || 'cây'}`}</Text>
          </View>
          <View style={styles.planMetaGrid}>
            <View style={styles.planMeta}><Feather name="tag" size={13} color="#64748b" /><Text style={styles.planMetaText}>Danh mục: <Text style={styles.metaBold}>{plan.cropCatalogName || 'Cây ăn quả'}</Text></Text></View>
            <View style={styles.planMeta}><Feather name="layers" size={13} color="#64748b" /><Text style={styles.planMetaText}>Cây trồng: <Text style={styles.metaBold}>{plan.cropName || 'Hồng Nam Đồng'}</Text></Text></View>
            <View style={styles.planMeta}><Feather name="map-pin" size={13} color="#64748b" /><Text style={styles.planMetaText}>Vùng trồng: <Text style={[styles.metaBold, { color: '#15803d' }]}>{plan.landPlotName || 'Chưa có vùng trồng'}</Text></Text></View>
            <View style={styles.planMeta}><Feather name="user" size={13} color="#64748b" /><Text style={styles.planMetaText}>Giám sát: <Text style={styles.metaBold}>{plan.supervisorName || 'Nguyễn Giám Sát'}</Text></Text></View>
            <View style={styles.planMeta}><Feather name="calendar" size={13} color="#64748b" /><Text style={styles.planMetaText}>Thời gian: <Text style={styles.metaBold}>{dateLabel(plan.startDate)} – {plan.expectedEndDate ? dateLabel(plan.expectedEndDate) : 'Chưa kết thúc'}</Text></Text></View>
          </View>
        </View>

        <View style={styles.tabs}>
          {TABS.map(([key, label, icon]) => (
            <TouchableOpacity key={key} style={[styles.tab, activeTab === key && styles.tabActive]} onPress={() => setActiveTab(key)}>
              <Feather name={icon} size={14} color={activeTab === key ? '#15803d' : '#64748b'} />
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {renderStageSelector()}

        <View style={styles.body}>
          {tabLoading ? <ActivityIndicator color="#15803d" style={styles.tabLoader} /> : null}
          {!tabLoading && activeTab === 'tasks' ? renderTaskManagement() : null}
          {!tabLoading && activeTab === 'history' ? renderHistory() : null}
          {!tabLoading && activeTab === 'close' ? renderCloseLogbook() : null}
        </View>
      </ScrollView>

      <AssignmentModal visible={Boolean(selectedTask)} task={selectedTask} users={users} saving={saving} onClose={() => setSelectedTask(null)} onSave={saveAssignment} />

      <Modal visible={logModal.visible} transparent animationType="fade" onRequestClose={() => setLogModal({ visible: false, log: null, action: 'approve', comment: '' })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{logModal.action === 'approve' ? 'Phê duyệt nhật ký' : 'Từ chối nhật ký'}</Text>
            <Text style={styles.modalSub}>
              {logModal.action === 'approve'
                ? 'Xác nhận duyệt ghi chép này từ Farm Leader?'
                : 'Nhập lý do từ chối để Farm Leader chỉnh sửa lại:'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={logModal.comment}
              onChangeText={(text) => setLogModal((prev) => ({ ...prev, comment: text }))}
              placeholder={logModal.action === 'approve' ? 'Nhận xét/ghi chú (tùy chọn)...' : 'Lý do từ chối (bắt buộc)...'}
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLogModal({ visible: false, log: null, action: 'approve', comment: '' })} disabled={saving}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, logModal.action === 'reject' && { backgroundColor: '#dc2626' }]}
                onPress={handleLogActionSubmit}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitBtnText}>{logModal.action === 'approve' ? 'Xác nhận duyệt' : 'Từ chối'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={approveCompletionModal.visible} transparent animationType="fade" onRequestClose={() => setApproveCompletionModal({ visible: false, quantity: '', unit: 'kg' })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Phê duyệt đóng kế hoạch 🎉</Text>
            <Text style={styles.modalSub}>Nhập số lượng & đơn vị sản phẩm thu hoạch để tự động khởi tạo Lô sản phẩm mới:</Text>

            <Text style={styles.inputLabel}>SỐ LƯỢNG THU HOẠCH *</Text>
            <TextInput
              style={styles.singleInput}
              value={approveCompletionModal.quantity}
              onChangeText={(text) => setApproveCompletionModal((prev) => ({ ...prev, quantity: text }))}
              placeholder="Ví dụ: 500"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>ĐƠN VỊ TÍNH *</Text>
            <TextInput
              style={styles.singleInput}
              value={approveCompletionModal.unit}
              onChangeText={(text) => setApproveCompletionModal((prev) => ({ ...prev, unit: text }))}
              placeholder="kg, tấn, bao..."
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setApproveCompletionModal({ visible: false, quantity: '', unit: 'kg' })} disabled={saving}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleApproveCompletionSubmit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitBtnText}>Tạo Lô & Đóng sổ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={rejectCompletionModal.visible} transparent animationType="fade" onRequestClose={() => setRejectCompletionModal({ visible: false, reason: '' })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: '#991b1b' }]}>Từ chối đóng kế hoạch ⚠️</Text>
            <Text style={styles.modalSub}>Vui lòng nhập lý do từ chối để chuyển yêu cầu về cho nhóm thực hiện:</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectCompletionModal.reason}
              onChangeText={(text) => setRejectCompletionModal((prev) => ({ ...prev, reason: text }))}
              placeholder="Lý do từ chối (bắt buộc)..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectCompletionModal({ visible: false, reason: '' })} disabled={saving}>
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: '#dc2626' }]} onPress={handleRejectCompletionSubmit} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSubmitBtnText}>Xác nhận từ chối</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={imageViewer.visible} transparent animationType="fade" onRequestClose={() => setImageViewer({ visible: false, images: [], index: 0 })}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }} onPress={() => setImageViewer({ visible: false, images: [], index: 0 })}>
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>
          {imageViewer.images[imageViewer.index] ? (
            <Image source={{ uri: imageViewer.images[imageViewer.index] }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          ) : null}
          {imageViewer.images.length > 1 && (
            <View style={{ position: 'absolute', bottom: 40, flexDirection: 'row', gap: 20 }}>
              <TouchableOpacity onPress={() => setImageViewer(prev => ({ ...prev, index: Math.max(0, prev.index - 1) }))} disabled={imageViewer.index === 0}>
                <Feather name="chevron-left" size={32} color={imageViewer.index === 0 ? '#475569' : '#fff'} />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 16, alignSelf: 'center' }}>{imageViewer.index + 1} / {imageViewer.images.length}</Text>
              <TouchableOpacity onPress={() => setImageViewer(prev => ({ ...prev, index: Math.min(prev.images.length - 1, prev.index + 1) }))} disabled={imageViewer.index === imageViewer.images.length - 1}>
                <Feather name="chevron-right" size={32} color={imageViewer.index === imageViewer.images.length - 1 ? '#475569' : '#fff'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fa' },
  header: { backgroundColor: '#15803d', paddingTop: 50, paddingHorizontal: 10, paddingBottom: 13, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  headerSubtitle: { color: '#dcfce7', fontSize: 12, marginTop: 2, maxWidth: '90%' },
  planCard: { margin: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  planTitle: { flex: 1, color: '#0f172a', fontSize: 18, fontWeight: '900' },
  progress: { color: '#15803d', fontSize: 17, fontWeight: '900' },
  planMetaGrid: { gap: 6 },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  planMetaText: { color: '#64748b', fontSize: 13 },
  metaBold: { color: '#1e293b', fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 14, backgroundColor: '#fff', borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 9 },
  tabActive: { backgroundColor: '#dcfce7' },
  tabText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#15803d', fontWeight: '900' },
  stageList: { paddingHorizontal: 14, paddingVertical: 13, gap: 9 },
  stageChip: { width: 190, minHeight: 62, padding: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  stageChipActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  stageNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  stageNumberActive: { backgroundColor: '#16a34a' },
  stageNumberText: { color: '#64748b', fontWeight: '900' },
  stageNumberTextActive: { color: '#fff' },
  stageChipText: { flex: 1, color: '#475569', fontSize: 12, fontWeight: '700' },
  stageChipTextActive: { color: '#15803d' },
  body: { paddingHorizontal: 14, paddingBottom: 40 },
  tabLoader: { paddingVertical: 50 },
  guide: { flexDirection: 'row', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 13, padding: 14, marginBottom: 15 },
  guideText: { flex: 1, marginLeft: 10 },
  guideTitle: { color: '#92400e', fontWeight: '900' },
  guideBody: { color: '#78350f', lineHeight: 19, marginTop: 4, fontSize: 13 },
  blockTitle: { color: '#0f172a', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  countBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  countBadgeText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  taskFilterList: { paddingBottom: 12, gap: 8 },
  taskFilterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  taskFilterChipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  taskFilterText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  taskFilterTextActive: { color: '#fff', fontWeight: '800' },
  taskCard: { backgroundColor: '#fff', borderRadius: 13, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  taskName: { flex: 1, color: '#1e293b', fontWeight: '900' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7 },
  statusText: { fontSize: 9, fontWeight: '900' },
  taskDescription: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 6 },
  assignmentLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9 },
  assignmentText: { flex: 1, color: '#15803d', fontSize: 11, fontWeight: '700' },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  taskButton: { flex: 1, minHeight: 39, borderRadius: 9, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  assignButton: { borderWidth: 1, borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  startButton: { backgroundColor: '#16a34a' },
  assignText: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  startText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  historyGroup: { marginBottom: 17 },
  groupHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  historyTask: { color: '#0f172a', fontWeight: '900', fontSize: 15 },
  webLogCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', elevation: 1 },
  webLogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  webLogDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  webLogDateText: { color: '#16a34a', fontWeight: '800', fontSize: 14 },
  authorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  authorText: { fontSize: 12, color: '#64748b' },
  authorBold: { color: '#1e293b', fontWeight: '700' },
  logStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  logStatusText: { fontSize: 10, fontWeight: '800' },
  webNoteBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10 },
  webNoteText: { color: '#334155', fontSize: 13, lineHeight: 20 },
  materialBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe', borderRadius: 10, padding: 12, marginBottom: 10 },
  materialHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  materialTitle: { color: '#1d4ed8', fontWeight: '800', fontSize: 12 },
  materialRowInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  matName: { color: '#1e293b', fontWeight: '700', fontSize: 13 },
  matQty: { color: '#1d4ed8', fontWeight: '800', fontSize: 13 },
  matArea: { color: '#64748b', fontWeight: '500', fontSize: 12 },
  proofSection: { marginTop: 4, marginBottom: 8 },
  proofTitle: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 6 },
  proofThumbImage: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#f1f5f9' },
  logActionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  logApproveBtn: { flex: 1, backgroundColor: '#16a34a', paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  logApproveBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  logRejectBtn: { flex: 1, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2', paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  logRejectBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  noLog: { color: '#94a3b8', fontSize: 12, paddingVertical: 10 },
  emptyText: { color: '#94a3b8', textAlign: 'center', paddingVertical: 35 },
  closingBanner: { flexDirection: 'row', backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5', borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 },
  closingBannerTitle: { color: '#c2410c', fontWeight: '800', fontSize: 14 },
  closingBannerSub: { color: '#ea580c', fontSize: 12, marginTop: 2, lineHeight: 17 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryTitle: { color: '#1e293b', fontWeight: '900', marginBottom: 10 },
  materialRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  materialName: { flex: 1, color: '#334155' },
  materialValue: { color: '#15803d', fontWeight: '800' },
  summaryImage: { width: 86, height: 86, borderRadius: 10, marginRight: 9, backgroundColor: '#f1f5f9' },
  summaryInput: { minHeight: 120, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 11, padding: 12, color: '#0f172a', lineHeight: 20 },
  officialButton: { alignSelf: 'flex-end', minHeight: 43, backgroundColor: '#16a34a', borderRadius: 9, paddingHorizontal: 15, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  officialButtonText: { color: '#fff', fontWeight: '900' },
  approvedCard: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 8 },
  draftCardWrapper: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#fde047' },
  draftCardMainTitle: { color: '#92400e', fontWeight: '900', fontSize: 14 },
  draftCardDivider: { height: 1, backgroundColor: '#fef08a', marginVertical: 12 },
  stageLogWrapper: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  stageLogHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  stageLogMainTitle: { color: '#15803d', fontWeight: '900', fontSize: 14 },
  stageLogCountBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  stageLogCountText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  stageLogCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 10, padding: 12, marginBottom: 10 },
  stageLogTopLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stageLogIndexBox: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center' },
  stageLogIndexText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  stageLogStageName: { flex: 1, color: '#0f172a', fontWeight: '800', fontSize: 14 },
  stageLogStatusBadge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stageLogStatusText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  stageLogDateInfo: { color: '#64748b', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  stageLogDescLabel: { color: '#15803d', fontSize: 11, fontWeight: '900', marginBottom: 4 },
  stageLogDescText: { color: '#334155', fontSize: 13, lineHeight: 20 },
  stageLogMaterialBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginTop: 12 },
  stageLogMaterialLabel: { color: '#2563eb', fontSize: 11, fontWeight: '900' },
  stageLogMaterialText: { color: '#334155', fontSize: 13, marginTop: 2 },
  stageLogImageLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  stageLogThumbImage: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 8 },
  completionActionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  approveCompletionBtn: { flex: 1.5, backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  completionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  rejectCompletionBtn: { flex: 1, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  rejectCompletionBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '800' },
  submitCompletionButton: { minHeight: 50, backgroundColor: '#16a34a', borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitCompletionText: { color: '#fff', fontWeight: '900' },
  errorText: { color: '#b91c1c', padding: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  modalSub: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 14, lineHeight: 18 },
  modalInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 13, color: '#1e293b', minHeight: 80, textAlignVertical: 'top', backgroundColor: '#f8fafc' },
  singleInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc', marginBottom: 12 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 4 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 14 },
  modalSubmitBtn: { flex: 1.5, backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  modalSubmitBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
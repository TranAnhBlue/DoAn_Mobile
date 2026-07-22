
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import supervisorApi from '../api/supervisorApi';
import AssignmentModal from '../components/AssignmentModal';

const TABS = [
  ['tasks', 'Quản lý việc', 'check-square'],
  ['history', 'Lịch sử log', 'file-text'],
  ['close', 'Chốt sổ', 'check-circle'],
];

const STATUS = {
  PENDING: ['Chờ kích hoạt', '#64748b'],
  PLANNED: ['Đã lên lịch', '#2563eb'],
  ACTIVE: ['Đang hoạt động', '#15803d'],
  IN_PROGRESS: ['Đang thực hiện', '#15803d'],
  COMPLETED: ['Hoàn thành', '#059669'],
  CANCELLED: ['Đã hủy', '#64748b'],
};

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';
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
      setSelectedStageId((current) => nextStages.some((stage) => getEntityId(stage) === current) ? current : getEntityId(nextStages[0]));
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

  useEffect(() => {
    if (!selectedStageId || activeTab === 'tasks') return;
    let active = true;
    setTabLoading(true);

    const request = activeTab === 'history'
      ? supervisorApi.getStageDailyLogs(selectedStageId).then((response) => {
        if (active) setHistoryGroups(asArray(response.data));
      })
      : Promise.all([
        supervisorApi.getStageSummary(selectedStageId),
        supervisorApi.getStageOfficialLogs(selectedStageId),
      ]).then(([summaryResponse, logsResponse]) => {
        if (!active) return;
        const nextSummary = unwrapPayload(summaryResponse.data);
        setSummary(nextSummary);
        setOfficialLogs(asArray(logsResponse.data));
        setSupervisorDescription(nextSummary?.draftDescription || '');
      });

    request.catch((requestError) => {
      if (active) Alert.alert('Không thể tải dữ liệu', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    }).finally(() => {
      if (active) setTabLoading(false);
    });

    return () => { active = false; };
  }, [activeTab, selectedStageId]);

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
            <View style={styles.taskActions}>
              <TouchableOpacity style={[styles.taskButton, styles.assignButton]} onPress={(event) => { event.stopPropagation(); setSelectedTask(task); }}><Feather name="user-plus" size={15} color="#2563eb" /><Text style={styles.assignText}>Phân công</Text></TouchableOpacity>
              {['PENDING', 'PLANNED'].includes(state) ? <TouchableOpacity style={[styles.taskButton, styles.startButton]} onPress={(event) => { event.stopPropagation(); startTask(task); }}><Feather name="play" size={15} color="#fff" /><Text style={styles.startText}>Kích hoạt</Text></TouchableOpacity> : null}
            </View>
          </TouchableOpacity>
        );
      })}
      {!tasks.length ? <Text style={styles.emptyText}>Giai đoạn chưa có công việc.</Text> : null}
    </>
  );

  const renderHistory = () => (
    <>
      <Text style={styles.blockTitle}>Lịch sử ghi nhận</Text>
      {historyGroups.map((group, groupIndex) => (
        <View key={group.taskId || groupIndex} style={styles.historyGroup}>
          <Text style={styles.historyTask}>{group.taskName || 'Công việc'}</Text>
          {(group.logs || []).map((log, logIndex) => (
            <View key={getEntityId(log) || logIndex} style={styles.logCard}>
              <View style={styles.logDate}><Feather name="calendar" size={14} color="#15803d" /><Text style={styles.logDateText}>{dateLabel(valueOf(log.date, log.createdAt, log.performedAt))}</Text></View>
              <Text style={styles.logDescription}>{valueOf(log.description, log.notes, 'Không có mô tả')}</Text>
              {log.progress !== undefined && log.progress !== null ? <Text style={styles.logProgress}>Tiến độ ghi nhận: {log.progress}%</Text> : null}
            </View>
          ))}
          {!group.logs?.length ? <Text style={styles.noLog}>Chưa có nhật ký cho công việc này.</Text> : null}
        </View>
      ))}
      {!historyGroups.length ? <Text style={styles.emptyText}>Giai đoạn chưa có lịch sử ghi log.</Text> : null}
    </>
  );

  const renderCloseLogbook = () => {
    const materials = summary?.materials || [];
    const images = summary?.images || [];
    const approved = summary?.approvedLogs || officialLogs || [];
    return (
      <>
        <Text style={styles.blockTitle}>Biên bản nhật ký: {selectedStage?.stageName}</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Bảng tổng hợp vật tư</Text>
          {materials.map((material, index) => (
            <View key={getEntityId(material) || index} style={styles.materialRow}><Text style={styles.materialName}>{valueOf(material.name, material.materialName, 'Vật tư')}</Text><Text style={styles.materialValue}>{valueOf(material.totalQuantity, material.quantity, 0)} {material.unit || ''}</Text></View>
          ))}
          {!materials.length ? <Text style={styles.noLog}>Chưa có vật tư được ghi nhận.</Text> : null}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Ảnh thực địa</Text>
          {images.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{images.map((item, index) => <Image key={item.id || index} source={{ uri: item.url || item.imageUrl }} style={styles.summaryImage} />)}</ScrollView> : <Text style={styles.noLog}>Chưa có ảnh minh chứng.</Text>}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Mô tả và văn phong chuẩn</Text>
          <TextInput style={styles.summaryInput} value={supervisorDescription} onChangeText={setSupervisorDescription} placeholder="Tổng hợp tình hình thực hiện, vật tư sử dụng và vấn đề phát sinh..." placeholderTextColor="#64748b" multiline textAlignVertical="top" />
          <TouchableOpacity style={styles.officialButton} onPress={saveOfficialLog} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <><Feather name="save" size={17} color="#fff" /><Text style={styles.officialButtonText}>Lưu vào lịch sử</Text></>}</TouchableOpacity>
        </View>

        <Text style={styles.blockTitle}>Nhật ký đã được Supervisor duyệt ({approved.length})</Text>
        {approved.map((log, index) => <View key={getEntityId(log) || index} style={styles.approvedCard}><Text style={styles.approvedDate}>{dateLabel(valueOf(log.createdAt, log.date))}</Text><Text style={styles.approvedText}>{valueOf(log.supervisorDescription, log.description, 'Đã lưu nhật ký chính thức')}</Text></View>)}
        {!approved.length ? <Text style={styles.emptyText}>Chưa có nhật ký chính thức.</Text> : null}

        <TouchableOpacity style={styles.submitCompletionButton} onPress={submitCompletion}><Feather name="send" size={18} color="#fff" /><Text style={styles.submitCompletionText}>Gửi nhật ký lên Manager</Text></TouchableOpacity>
      </>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;
  if (!plan) return <View style={styles.center}><Text style={styles.errorText}>{error || 'Không tìm thấy kế hoạch.'}</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity><View style={styles.headerText}><Text style={styles.headerTitle}>Chi tiết kế hoạch</Text><Text style={styles.headerSubtitle} numberOfLines={1}>{plan.planName}</Text></View><View style={styles.backButton} /></View>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} colors={['#15803d']} />}>
        <View style={styles.planCard}>
          <View style={styles.planTitleRow}><Text style={styles.planTitle}>{plan.planName}</Text><Text style={styles.progress}>{plan.actualProgressPercent || 0}%</Text></View>
          <View style={styles.planMeta}><Feather name="layers" size={14} color="#64748b" /><Text style={styles.planMetaText}>{plan.cropCatalogName || plan.cropName || 'Chưa có cây trồng'}</Text></View>
          <View style={styles.planMeta}><Feather name="map-pin" size={14} color="#64748b" /><Text style={styles.planMetaText}>{plan.landPlotName || 'Chưa có vùng trồng'}</Text></View>
          <View style={styles.planMeta}><Feather name="user" size={14} color="#64748b" /><Text style={styles.planMetaText}>{plan.supervisorName || 'Chưa có giám sát'}</Text></View>
          <View style={styles.planMeta}><Feather name="calendar" size={14} color="#64748b" /><Text style={styles.planMetaText}>{dateLabel(plan.startDate)} – {plan.expectedEndDate ? dateLabel(plan.expectedEndDate) : 'Chưa kết thúc'}</Text></View>
        </View>

        <View style={styles.tabs}>{TABS.map(([key, label, icon]) => <TouchableOpacity key={key} style={[styles.tab, activeTab === key && styles.tabActive]} onPress={() => setActiveTab(key)}><Feather name={icon} size={15} color={activeTab === key ? '#15803d' : '#64748b'} /><Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text></TouchableOpacity>)}</View>
        {renderStageSelector()}
        <View style={styles.body}>
          {tabLoading ? <ActivityIndicator color="#15803d" style={styles.tabLoader} /> : null}
          {!tabLoading && activeTab === 'tasks' ? renderTaskManagement() : null}
          {!tabLoading && activeTab === 'history' ? renderHistory() : null}
          {!tabLoading && activeTab === 'close' ? renderCloseLogbook() : null}
        </View>
      </ScrollView>

      <AssignmentModal visible={Boolean(selectedTask)} task={selectedTask} users={users} saving={saving} onClose={() => setSelectedTask(null)} onSave={saveAssignment} />
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
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  planMetaText: { flex: 1, color: '#475569', fontSize: 13 },
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
  blockTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900', marginBottom: 11, marginTop: 3 },
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
  historyTask: { color: '#15803d', fontWeight: '900', marginBottom: 8 },
  logCard: { backgroundColor: '#fff', borderRadius: 12, padding: 13, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  logDate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logDateText: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  logDescription: { color: '#334155', lineHeight: 19, marginTop: 7 },
  logProgress: { color: '#64748b', fontSize: 11, marginTop: 6 },
  noLog: { color: '#94a3b8', fontSize: 12, paddingVertical: 10 },
  emptyText: { color: '#94a3b8', textAlign: 'center', paddingVertical: 35 },
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
  approvedDate: { color: '#15803d', fontSize: 12, fontWeight: '800' },
  approvedText: { color: '#334155', lineHeight: 19, marginTop: 5 },
  submitCompletionButton: { minHeight: 50, backgroundColor: '#16a34a', borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  submitCompletionText: { color: '#fff', fontWeight: '900' },
  errorText: { color: '#b91c1c', padding: 20, textAlign: 'center' },
});
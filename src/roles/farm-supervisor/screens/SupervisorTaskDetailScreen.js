import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import { formatVietnamDateTime } from '../../../features/notifications/utils/dateTime';
import supervisorApi from '../api/supervisorApi';
import AssignmentModal from '../components/AssignmentModal';
import EditTaskModal from '../components/EditTaskModal';

const STATUS = {
  PENDING: ['Chờ kích hoạt', '#64748b'],
  PLANNED: ['Đã lên lịch', '#2563eb'],
  ASSIGNED: ['Đã phân công', '#2563eb'],
  ASSIGNED_LEADER: ['Đã phân công', '#2563eb'],
  ACTIVE: ['Đang thực hiện', '#15803d'],
  IN_PROGRESS: ['Đang thực hiện', '#15803d'],
  WAITING_APPROVAL: ['Chờ duyệt', '#d97706'],
  PENDING_APPROVAL: ['Chờ duyệt', '#d97706'],
  COMPLETED: ['Hoàn thành', '#059669'],
  CANCELLED: ['Đã hủy', '#64748b'],
};

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';
const assignmentUserId = (item) => item?.userId || item?.farmerId || item?.assignedUserId;

export default function SupervisorTaskDetailScreen({ navigation, route }) {
  const taskId = route.params?.taskId;
  const [task, setTask] = useState(route.params?.task || null);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(!route.params?.task);
  const [refreshing, setRefreshing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!taskId) return;
    setError('');
    const [taskResult, logsResult, usersResult] = await Promise.allSettled([
      supervisorApi.getTask(taskId),
      supervisorApi.getTaskDailyLogs(taskId),
      supervisorApi.getUsers(),
    ]);
    if (taskResult.status === 'fulfilled') setTask(unwrapPayload(taskResult.value.data));
    else setError(getApiErrorMessage(taskResult.reason, 'Không thể tải chi tiết công việc.'));
    if (logsResult.status === 'fulfilled') setLogs(extractItems(logsResult.value.data));
    if (usersResult.status === 'fulfilled') setUsers(extractItems(usersResult.value.data));
    setLoading(false);
    setRefreshing(false);
  }, [taskId]);

  useFocusEffect(useCallback(() => { fetchDetail(); }, [fetchDetail]));

  const saveAssignment = async (values) => {
    setSaving(true);
    try {
      await supervisorApi.updateTask(taskId, values);
      setAssigning(false);
      await fetchDetail();
      Alert.alert('Thành công', 'Đã cập nhật nhân sự cho công việc.');
    } catch (requestError) {
      Alert.alert('Không thể phân công', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const startTask = () => Alert.alert('Kích hoạt công việc', `Kích hoạt “${task?.name}”?`, [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Kích hoạt', onPress: async () => {
      try {
        await supervisorApi.startTask(taskId);
        fetchDetail();
      } catch (requestError) {
        Alert.alert('Không thể kích hoạt', getApiErrorMessage(requestError, 'Vui lòng kiểm tra trạng thái công việc.'));
      }
    } },
  ]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  const status = String(task?.status || '').toUpperCase();
  const [statusLabel, statusColor] = STATUS[status] || [task?.status || 'Không rõ', '#64748b'];
  const progress = Number(task?.progress || 0);
  const assignments = task?.assignments || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
        <View style={styles.headerText}><Text style={styles.headerTitle}>Chi tiết công việc</Text><Text style={styles.headerSubtitle} numberOfLines={1}>{task?.name || 'Công việc'}</Text></View>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} colors={['#15803d']} />}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.heroCard}>
          <View style={styles.titleRow}><View style={styles.taskIcon}><Feather name="check-square" size={23} color="#15803d" /></View><Text style={styles.taskName}>{task?.name || 'Công việc'}</Text><View style={[styles.status, { backgroundColor: `${statusColor}18` }]}><Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text></View></View>
          {task?.description ? <Text style={styles.description}>{task.description}</Text> : <Text style={styles.descriptionEmpty}>Chưa có mô tả công việc.</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin công việc</Text>
          <Info icon="calendar" label="Ngày bắt đầu" value={dateLabel(task?.startDate)} />
          <Info icon="check-circle" label="Ngày hoàn thành" value={task?.completedDate ? dateLabel(task.completedDate) : 'Chưa hoàn thành'} last />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Nhân sự thực hiện</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {!['COMPLETED', 'CANCELLED'].includes(status) ? (
              <TouchableOpacity style={styles.assignAction} onPress={() => setAssigning(true)}>
                <Feather name="user-plus" size={15} color="#2563eb" />
                <Text style={styles.assignActionText}>Phân công</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.assignAction, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]} onPress={() => setEditing(true)}>
              <Feather name="edit-3" size={15} color="#475569" />
              <Text style={[styles.assignActionText, { color: '#475569' }]}>Sửa</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.card}>
          <TouchableOpacity style={styles.personRow} disabled={!task?.assignedLeaderId} onPress={() => navigation.navigate('FarmerDetail', { userId: task.assignedLeaderId })}>
            <View style={styles.leaderIcon}><Feather name="user-check" size={18} color="#1d4ed8" /></View><View style={styles.personText}><Text style={styles.personRole}>Tổ trưởng</Text><Text style={styles.personName}>{task?.assignedLeaderName || 'Chưa phân công'}</Text></View>{task?.assignedLeaderId ? <Feather name="chevron-right" size={18} color="#94a3b8" /> : null}
          </TouchableOpacity>
          {assignments.map((assignment, index) => {
            const userId = assignmentUserId(assignment);
            return <TouchableOpacity key={getEntityId(assignment) || userId || index} style={styles.personRow} disabled={!userId} onPress={() => navigation.navigate('FarmerDetail', { userId })}><View style={styles.farmerIcon}><Feather name="user" size={18} color="#15803d" /></View><View style={styles.personText}><Text style={styles.personRole}>Nông dân</Text><Text style={styles.personName}>{valueOf(assignment.fullName, assignment.farmerName, assignment.userName, assignment.name, 'Nông dân được phân công')}</Text></View><Feather name="chevron-right" size={18} color="#94a3b8" /></TouchableOpacity>;
          })}
          {!assignments.length ? <Text style={styles.noAssignment}>Chưa có nông dân tham gia.</Text> : null}
        </View>

        {['PENDING', 'PLANNED'].includes(status) ? <TouchableOpacity style={styles.startButton} onPress={startTask}><Feather name="play" size={18} color="#fff" /><Text style={styles.startText}>Kích hoạt công việc</Text></TouchableOpacity> : null}

        <Text style={styles.sectionHeading}>Nhật ký hàng ngày ({logs.length})</Text>
        {logs.map((log, index) => (
          <View key={getEntityId(log) || index} style={styles.logCard}>
            <View style={styles.logTop}><View style={styles.logDate}><Feather name="calendar" size={14} color="#15803d" /><Text style={styles.logDateText}>{formatVietnamDateTime(valueOf(log.createdAt, log.logDate, log.performedAt), 'Không xác định')}</Text></View></View>
            <Text style={styles.logDescription}>{valueOf(log.description, log.notes, log.content, 'Không có mô tả')}</Text>
            {valueOf(log.createdByName, log.leaderName, log.farmerName) ? <Text style={styles.logAuthor}>Ghi bởi: {valueOf(log.createdByName, log.leaderName, log.farmerName)}</Text> : null}
          </View>
        ))}
        {!logs.length ? <Text style={styles.empty}>Công việc chưa có nhật ký hàng ngày.</Text> : null}
      </ScrollView>

      <AssignmentModal visible={assigning} task={task} users={users} saving={saving} onClose={() => setAssigning(false)} onSave={saveAssignment} />
      <EditTaskModal
        visible={editing}
        task={task}
        users={users}
        onClose={() => setEditing(false)}
        onSuccess={() => {
          setEditing(false);
          fetchDetail();
        }}
      />
    </View>
  );
}

function Info({ icon, label, value, last }) {
  return <View style={[styles.infoRow, last && styles.infoLast]}><Feather name={icon} size={17} color="#64748b" /><View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 50, paddingHorizontal: 10, paddingBottom: 13, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  headerSubtitle: { color: '#dcfce7', fontSize: 12, marginTop: 2, maxWidth: '90%' },
  content: { padding: 15, paddingBottom: 40 },
  error: { color: '#b91c1c', marginBottom: 12 },
  heroCard: { backgroundColor: '#fff', borderRadius: 16, padding: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  taskIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  taskName: { flex: 1, color: '#0f172a', fontSize: 17, fontWeight: '900' },
  status: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: '900' },
  description: { color: '#475569', lineHeight: 20, marginTop: 13 },
  descriptionEmpty: { color: '#94a3b8', fontStyle: 'italic', marginTop: 13 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  progressLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  progressValue: { color: '#15803d', fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: '#e2e8f0', marginTop: 7, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22c55e' },
  card: { backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 15, marginTop: 12 },
  sectionTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900', paddingTop: 14, paddingBottom: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLast: { borderBottomWidth: 0 },
  infoText: { flex: 1 },
  infoLabel: { color: '#94a3b8', fontSize: 11 },
  infoValue: { color: '#334155', fontWeight: '700', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: -3 },
  sectionHeading: { color: '#0f172a', fontSize: 15, fontWeight: '900', marginTop: 18, marginBottom: 9 },
  assignAction: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#eff6ff', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  assignActionText: { color: '#2563eb', fontSize: 11, fontWeight: '800' },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  leaderIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  farmerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  personText: { flex: 1 },
  personRole: { color: '#94a3b8', fontSize: 10 },
  personName: { color: '#334155', fontWeight: '800', marginTop: 2 },
  noAssignment: { color: '#94a3b8', textAlign: 'center', paddingVertical: 15 },
  startButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#16a34a', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  startText: { color: '#fff', fontWeight: '900' },
  logCard: { backgroundColor: '#fff', borderRadius: 13, padding: 13, marginBottom: 9, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logDate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logDateText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  logProgress: { color: '#15803d', fontWeight: '900' },
  logDescription: { color: '#334155', lineHeight: 19, marginTop: 8 },
  logAuthor: { color: '#94a3b8', fontSize: 11, marginTop: 7 },
  empty: { color: '#94a3b8', textAlign: 'center', paddingVertical: 28 },
});

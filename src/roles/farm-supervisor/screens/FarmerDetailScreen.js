import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import supervisorApi from '../api/supervisorApi';

const sameId = (a, b) => a != null && b != null && String(a).trim() === String(b).trim();
const assignmentUserId = (item) => {
  if (!item) return null;
  if (typeof item === 'string' || typeof item === 'number') return item;
  return item.userId || item.farmerId || item.assignedUserId || item.id || item.user?.id || item.farmer?.id;
};

const isUserAssignedToTask = (task, userId) => {
  if (!task || !userId) return false;
  const uId = String(userId).trim();
  if (sameId(task.assignedLeaderId, uId) || sameId(task.leaderId, uId) || sameId(task.assignedUserId, uId) || sameId(task.userId, uId)) return true;
  const list = task.assignments || task.assignees || task.farmers || task.members || task.workers || task.assignedUsers || [];
  if (Array.isArray(list) && list.some((item) => sameId(assignmentUserId(item), uId))) return true;
  const idList = task.farmerIds || task.assignedFarmerIds || task.userIds || [];
  if (Array.isArray(idList) && idList.some((id) => sameId(id, uId))) return true;
  return false;
};
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật';

const TASK_STATUS_MAP = {
  PENDING: 'Chờ kích hoạt',
  PLANNED: 'Đã lên lịch',
  ACTIVE: 'Đang hoạt động',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  DRAFT: 'Nháp',
};

const getStatusLabel = (status) => {
  if (!status) return 'Chưa xác định';
  const key = String(status).toUpperCase();
  return TASK_STATUS_MAP[key] || status;
};

export default function FarmerDetailScreen({ navigation, route }) {
  const userId = route.params?.userId;
  const [user, setUser] = useState(route.params?.user || null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(!route.params?.user);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!userId) return;
    setError('');
    try {
      const [userResponse, tasksResponse] = await Promise.all([
        supervisorApi.getUser(userId),
        supervisorApi.getTasks(),
      ]);
      setUser(unwrapPayload(userResponse.data));
      setTasks(extractItems(tasksResponse.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết nhân sự.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { fetchDetail(); }, [fetchDetail]));

  const assignedTasks = useMemo(() => tasks.filter((task) => isUserAssignedToTask(task, userId)), [tasks, userId]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  const roles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const avatar = user?.avatarUrl || user?.avatar;
  const name = user?.fullName || user?.fullname || user?.email || 'Nhân sự';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết nhân sự</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} colors={['#15803d']} />}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.profileCard}>
          {avatar ? <Image source={{ uri: avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>}
          <Text style={styles.name}>{name}</Text>
          <View style={styles.roles}>{roles.map((role) => <View key={role} style={styles.roleBadge}><Text style={styles.roleText}>{role === 'FARMER' ? 'Nông dân' : role === 'FARM_LEADER' ? 'Farm Leader' : role}</Text></View>)}</View>
          <View style={[styles.activeBadge, !user?.isActive && styles.inactiveBadge]}><Text style={[styles.activeText, !user?.isActive && styles.inactiveText]}>{user?.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          <InfoRow icon="mail" label="Email" value={user?.email} />
          <InfoRow icon="phone" label="Số điện thoại" value={user?.phoneNumber || user?.phone} />
          <InfoRow icon="calendar" label="Ngày sinh" value={dateLabel(user?.dateOfBirth)} />
          <InfoRow icon="user" label="Giới tính" value={user?.gender} />
          <InfoRow icon="briefcase" label="Vị trí" value={user?.position} />
          <InfoRow icon="map-pin" label="Địa chỉ" value={user?.address} last />
        </View>

        <Text style={styles.listTitle}>Công việc được giao ({assignedTasks.length})</Text>
        {assignedTasks.map((task) => (
          <TouchableOpacity key={getEntityId(task)} style={styles.taskCard} onPress={() => navigation.navigate('SupervisorTaskDetail', { taskId: getEntityId(task), task })}>
            <View style={styles.taskIcon}><Feather name="check-square" size={18} color="#15803d" /></View>
            <View style={styles.taskText}><Text style={styles.taskName}>{task.name}</Text><Text style={styles.taskMeta}>{getStatusLabel(task.status)}</Text></View>
            <Feather name="chevron-right" size={19} color="#94a3b8" />
          </TouchableOpacity>
        ))}
        {!assignedTasks.length ? <Text style={styles.empty}>Nhân sự này chưa được phân công công việc.</Text> : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, last }) {
  return <View style={[styles.infoRow, last && styles.infoRowLast]}><Feather name={icon} size={17} color="#64748b" /><View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 50, paddingHorizontal: 10, paddingBottom: 13, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', textAlign: 'center', fontSize: 19, fontWeight: '900' },
  content: { padding: 15, paddingBottom: 40 },
  error: { color: '#b91c1c', marginBottom: 12 },
  profileCard: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 17, padding: 20 },
  avatar: { width: 82, height: 82, borderRadius: 41 },
  avatarFallback: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#15803d', fontSize: 31, fontWeight: '900' },
  name: { color: '#0f172a', fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  roles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8 },
  roleBadge: { backgroundColor: '#dbeafe', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  roleText: { color: '#1d4ed8', fontSize: 11, fontWeight: '800' },
  activeBadge: { backgroundColor: '#dcfce7', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4, marginTop: 8 },
  inactiveBadge: { backgroundColor: '#f1f5f9' },
  activeText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  inactiveText: { color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginTop: 13 },
  sectionTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoRowLast: { borderBottomWidth: 0 },
  infoText: { flex: 1 },
  infoLabel: { color: '#94a3b8', fontSize: 11 },
  infoValue: { color: '#334155', fontSize: 14, fontWeight: '700', marginTop: 2 },
  listTitle: { color: '#0f172a', fontSize: 15, fontWeight: '900', marginTop: 18, marginBottom: 9 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 13, padding: 13, marginBottom: 9 },
  taskIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  taskText: { flex: 1 },
  taskName: { color: '#1e293b', fontWeight: '800' },
  taskMeta: { color: '#64748b', fontSize: 11, marginTop: 4 },
  empty: { color: '#94a3b8', textAlign: 'center', paddingVertical: 28 },
});

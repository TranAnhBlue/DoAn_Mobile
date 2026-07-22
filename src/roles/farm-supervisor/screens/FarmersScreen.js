import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { extractItems, getApiErrorMessage } from '../../../shared/api/response';
import supervisorApi from '../api/supervisorApi';

const rolesOf = (user) => (Array.isArray(user?.roles) ? user.roles : [user?.role]).map((role) => String(role || '').toUpperCase());
const assignmentUserId = (item) => item?.userId || item?.farmerId || item?.assignedUserId || item?.id;

export default function FarmersScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const [usersResponse, tasksResponse] = await Promise.all([supervisorApi.getUsers(), supervisorApi.getTasks()]);
      setUsers(extractItems(usersResponse.data));
      setTasks(extractItems(tasksResponse.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách nông dân.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const farmers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      const roles = rolesOf(user);
      const isWorker = roles.includes('FARMER') || roles.includes('FARM_LEADER');
      const matches = !keyword || `${user.fullName || ''} ${user.email || ''} ${user.phoneNumber || ''}`.toLowerCase().includes(keyword);
      return isWorker && matches;
    });
  }, [search, users]);

  const assignedCount = (userId) => tasks.filter((task) => (
    task.assignedLeaderId === userId
    || (task.assignments || []).some((assignment) => assignmentUserId(assignment) === userId)
  )).length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Quản lý nông dân</Text><Text style={styles.headerSubtitle}>Nhân sự có thể phân công vào công việc</Text></View>
      <View style={styles.searchWrap}><Feather name="search" size={18} color="#64748b" /><TextInput style={styles.search} value={search} onChangeText={setSearch} placeholder="Tìm theo tên, email, số điện thoại" placeholderTextColor="#64748b" /></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={farmers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#15803d']} />}
        renderItem={({ item }) => {
          const leader = rolesOf(item).includes('FARM_LEADER');
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('FarmerDetail', { userId: item.id, user: item })}
            >
              <View style={styles.avatar}><Text style={styles.avatarText}>{(item.fullName || item.email || 'N').charAt(0).toUpperCase()}</Text></View>
              <View style={styles.person}><Text style={styles.name}>{item.fullName || item.email}</Text><Text style={styles.contact}>{item.phoneNumber || item.email || 'Chưa có liên hệ'}</Text><View style={styles.tags}><View style={[styles.roleBadge, leader && styles.leaderBadge]}><Text style={[styles.roleText, leader && styles.leaderText]}>{leader ? 'Farm Leader' : 'Nông dân'}</Text></View><Text style={styles.taskCount}>{assignedCount(item.id)} việc được giao</Text></View></View>
              <View style={[styles.activeDot, !item.isActive && styles.inactiveDot]} />
              <Feather name="chevron-right" size={18} color="#94a3b8" style={styles.chevron} />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="users" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Không tìm thấy nông dân</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  headerSubtitle: { color: '#dcfce7', marginTop: 4, fontSize: 13 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, margin: 14, marginBottom: 4, paddingHorizontal: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12 },
  search: { flex: 1, minHeight: 46, color: '#0f172a' },
  list: { padding: 14, paddingBottom: 96 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#15803d', fontSize: 18, fontWeight: '900' },
  person: { flex: 1 },
  name: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  contact: { color: '#64748b', fontSize: 12, marginTop: 3 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  roleBadge: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  leaderBadge: { backgroundColor: '#dbeafe' },
  roleText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  leaderText: { color: '#1d4ed8' },
  taskCount: { color: '#15803d', fontSize: 11, fontWeight: '700' },
  activeDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e' },
  inactiveDot: { backgroundColor: '#cbd5e1' },
  chevron: { marginLeft: 8 },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingTop: 10 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
});

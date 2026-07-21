import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { extractItems, getApiErrorMessage, getEntityId } from '../../../shared/api/response';
import supervisorApi from '../api/supervisorApi';

const STATUS = {
  DRAFT: ['Nháp', '#64748b'],
  PENDING_REVIEW: ['Chờ duyệt', '#d97706'],
  PLANNED: ['Đã lên kế hoạch', '#2563eb'],
  IN_PROGRESS: ['Đang thực hiện', '#15803d'],
  COMPLETED: ['Hoàn thành', '#059669'],
  CANCELLED: ['Đã hủy', '#64748b'],
};

const dateLabel = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';

export default function SupervisorPlansScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPlans = useCallback(async () => {
    setError('');
    try {
      const response = await supervisorApi.getPlans();
      setPlans(extractItems(response.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải kế hoạch canh tác.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPlans(); }, [fetchPlans]));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kế hoạch & Nhật ký</Text>
        <Text style={styles.headerSubtitle}>Quản lý kế hoạch canh tác được giám sát</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={plans}
        keyExtractor={(item, index) => String(getEntityId(item) || index)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlans(); }} colors={['#15803d']} />}
        renderItem={({ item }) => {
          const status = String(item.status || '').toUpperCase();
          const [statusLabel, color] = STATUS[status] || [item.status || 'Không rõ', '#64748b'];
          return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('SupervisorPlanDetail', { planId: getEntityId(item) })}>
              <View style={styles.cardHeader}>
                <View style={styles.planIcon}><Feather name="clipboard" size={20} color="#15803d" /></View>
                <View style={styles.cardTitleWrap}><Text style={styles.planName}>{item.planName || item.name || 'Kế hoạch canh tác'}</Text><Text style={styles.crop}>{item.cropName || 'Chưa có cây trồng'}</Text></View>
                <Feather name="chevron-right" size={21} color="#94a3b8" />
              </View>
              <View style={styles.metaRow}><Feather name="user" size={14} color="#64748b" /><Text style={styles.meta}>{item.supervisorName || 'Chưa phân công giám sát'}</Text></View>
              <View style={styles.metaRow}><Feather name="calendar" size={14} color="#64748b" /><Text style={styles.meta}>{dateLabel(item.startDate)}</Text></View>
              <View style={[styles.badge, { backgroundColor: `${color}18` }]}><Text style={[styles.badgeText, { color }]}>{statusLabel}</Text></View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="clipboard" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Chưa có kế hoạch được phân công</Text></View>}
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
  list: { padding: 16, paddingBottom: 96 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 7 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 13 },
  planIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  cardTitleWrap: { flex: 1 },
  planName: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  crop: { color: '#15803d', fontSize: 12, fontWeight: '700', marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  meta: { color: '#64748b', fontSize: 13 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginTop: 12 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  error: { color: '#b91c1c', padding: 16, paddingBottom: 0 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
});

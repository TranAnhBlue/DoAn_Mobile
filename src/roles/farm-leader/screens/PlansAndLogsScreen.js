import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../../shared/api/client';
import { extractItems, getApiErrorMessage, getEntityId } from '../../../shared/api/response';

const STATUS = {
  DRAFT: ['Nháp', '#64748b'],
  PENDING_REVIEW: ['Chờ duyệt', '#d97706'],
  PLANNED: ['Đã lên kế hoạch', '#2563eb'],
  IN_PROGRESS: ['Đang thực hiện', '#15803d'],
  COMPLETED: ['Hoàn thành', '#059669'],
  CANCELLED: ['Đã hủy', '#64748b'],
  APPROVED: ['Đã duyệt', '#15803d'],
  REJECTED: ['Từ chối', '#dc2626'],
};

const textOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const dateOf = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';

export default function PlansAndLogsScreen() {
  const [section, setSection] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const [plansResponse, logsResponse] = await Promise.all([
        api.get('/cultivation-logbooks', { params: { PageIndex: 1, PageSize: 100 } }),
        api.get('/cultivation-logs', { params: { PageIndex: 1, PageSize: 100 } }),
      ]);
      setPlans(extractItems(plansResponse.data));
      setLogs(extractItems(logsResponse.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải kế hoạch và ghi chép.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const data = section === 'plans' ? plans : logs;

  const renderPlan = ({ item }) => {
    const state = String(item.status || '').toUpperCase();
    const [label, color] = STATUS[state] || [item.status || 'Không rõ', '#64748b'];
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{textOf(item.planName, item.name, item.title, 'Kế hoạch canh tác')}</Text>
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>
        <Text style={styles.highlight}>{textOf(item.cropName, item.crop?.name, 'Chưa có cây trồng')}</Text>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={15} color="#64748b" />
          <Text style={styles.meta}>{textOf(item.landPlotName, item.landPlot?.name, 'Chưa có vùng trồng')}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="calendar" size={15} color="#64748b" />
          <Text style={styles.meta}>{dateOf(textOf(item.startDate, item.plannedStartDate, item.createdAt))}</Text>
        </View>
      </View>
    );
  };

  const renderLog = ({ item }) => {
    const state = String(item.status || item.approvalStatus || '').toUpperCase();
    const [label, color] = STATUS[state] || [item.status || item.approvalStatus || 'Đã ghi nhận', '#2563eb'];
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{textOf(item.activityName, item.title, item.taskName, 'Ghi chép canh tác')}</Text>
          <View style={[styles.badge, { backgroundColor: `${color}18` }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
          </View>
        </View>
        <Text style={styles.description}>{textOf(item.description, item.notes, 'Không có mô tả')}</Text>
        <View style={styles.metaRow}>
          <Feather name="clock" size={15} color="#64748b" />
          <Text style={styles.meta}>{dateOf(textOf(item.performedAt, item.date, item.createdAt))}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kế hoạch & ghi chép</Text>
        <Text style={styles.headerSubtitle}>Theo dõi hoạt động canh tác</Text>
      </View>
      <View style={styles.segment}>
        {[['plans', 'Kế hoạch'], ['logs', 'Ghi chép']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.segmentButton, section === key && styles.segmentActive]} onPress={() => setSection(key)}>
            <Text style={[styles.segmentText, section === key && styles.segmentTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={data}
        renderItem={section === 'plans' ? renderPlan : renderLog}
        keyExtractor={(item, index) => String(getEntityId(item) || index)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#15803d']} />}
        ListEmptyComponent={<View style={styles.empty}><Feather name="inbox" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Chưa có dữ liệu</Text></View>}
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
  segment: { flexDirection: 'row', margin: 16, padding: 4, backgroundColor: '#e2e8f0', borderRadius: 12 },
  segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { color: '#64748b', fontWeight: '700' },
  segmentTextActive: { color: '#15803d' },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: '#0f172a', fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  highlight: { color: '#15803d', fontWeight: '700', marginTop: 8, marginBottom: 10 },
  description: { color: '#475569', lineHeight: 20, marginTop: 8, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  meta: { flex: 1, color: '#64748b', fontSize: 13 },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
});

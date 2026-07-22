import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import api from '../../../shared/api/client';
import { extractItems, getApiErrorMessage, getEntityId } from '../../../shared/api/response';

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

export default function LandPlotsScreen() {
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPlots = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/land-plots', { params: { PageIndex: 1, PageSize: 100 } });
      setPlots(extractItems(response.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải danh sách vùng trồng.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPlots(); }, [fetchPlots]));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vùng trồng</Text>
        <Text style={styles.headerSubtitle}>Danh sách thửa đất được phân quyền</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={plots}
        keyExtractor={(item, index) => String(getEntityId(item) || index)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlots(); }} colors={['#15803d']} />}
        renderItem={({ item }) => {
          const status = String(item.status || '').toUpperCase();
          const active = ['ACTIVE', 'AVAILABLE', 'IN_USE'].includes(status);
          return (
            <View style={styles.card}>
              <View style={styles.titleRow}>
                <View style={styles.icon}><Feather name="map-pin" size={20} color="#15803d" /></View>
                <View style={styles.titleContent}>
                  <Text style={styles.title}>{valueOf(item.name, item.landPlotName, item.plotName, item.code, 'Thửa đất')}</Text>
                  <Text style={styles.code}>{valueOf(item.code, item.landPlotCode, 'Chưa có mã')}</Text>
                </View>
                {status ? <View style={[styles.badge, active && styles.badgeActive]}><Text style={[styles.badgeText, active && styles.badgeTextActive]}>{active ? 'Hoạt động' : status}</Text></View> : null}
              </View>
              <View style={styles.details}>
                <Text style={styles.detail}>Diện tích: <Text style={styles.detailValue}>{valueOf(item.area, item.totalArea, item.actualArea, '--')} ha</Text></Text>
                <Text style={styles.detail}>Loại đất: <Text style={styles.detailValue}>{valueOf(item.soilTypeName, item.soilType?.name, '--')}</Text></Text>
                <Text style={styles.detail}>Địa chỉ: <Text style={styles.detailValue}>{valueOf(item.address, item.location, '--')}</Text></Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="map" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Chưa có vùng trồng</Text></View>}
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
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  titleContent: { flex: 1 },
  title: { color: '#0f172a', fontSize: 16, fontWeight: '800' },
  code: { color: '#64748b', fontSize: 12, marginTop: 2 },
  badge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeText: { color: '#64748b', fontSize: 10, fontWeight: '900' },
  badgeTextActive: { color: '#15803d' },
  details: { borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 14, paddingTop: 10, gap: 6 },
  detail: { color: '#64748b', fontSize: 13 },
  detailValue: { color: '#334155', fontWeight: '700' },
  error: { color: '#b91c1c', padding: 16, paddingBottom: 0 },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
});

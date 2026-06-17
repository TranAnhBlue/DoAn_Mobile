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
import api from '../api/api';

const STATUS_COLORS = {
  DRAFT: '#94a3b8',
  PENDING_REVIEW: '#f59e0b',
  PLANNED: '#3b82f6',
  IN_PROGRESS: '#16a34a',
  COMPLETED: '#10b981',
  CANCELLED: '#64748b',
};

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  PLANNED: 'Đã lập kế hoạch',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function ProductionPlansScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await api.get('/production-plans');
      if (response.data?.success) {
        setPlans(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch Production Plans Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [fetchPlans])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
  };

  const renderPlan = ({ item }) => (
    <TouchableOpacity
      style={styles.planCard}
      onPress={() => navigation.navigate('ProductionPlanDetail', { planId: item.id })}
    >
      <View style={styles.planHeader}>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.planName}>{item.planName}</Text>
      {item.cropName && (
        <Text style={styles.cropName}>Cây trồng: {item.cropName}</Text>
      )}

      <View style={styles.planMeta}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={14} color="#64748b" />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.landPlotName || 'Chưa xác định'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={14} color="#64748b" />
          <Text style={styles.metaText}>
            {new Date(item.plannedStartDate).toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>

      {item.actualArea && (
        <View style={styles.areaContainer}>
          <Feather name="layout" size={14} color="#16a34a" />
          <Text style={styles.areaText}>Diện tích: {item.actualArea} ha</Text>
        </View>
      )}

      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Tiến độ</Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${item.completionPercentage || 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{item.completionPercentage || 0}%</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kế hoạch sản xuất</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={plans}
        renderItem={renderPlan}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="calendar" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có kế hoạch sản xuất</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fbf7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6fbf7',
  },
  header: {
    backgroundColor: '#27c65a',
    paddingTop: 42,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  cropName: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '700',
    marginBottom: 12,
  },
  planMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  areaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  areaText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '900',
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
});

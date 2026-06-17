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
  PENDING: '#f59e0b',
  APPROVED: '#16a34a',
  REJECTED: '#ef4444',
  COMPLETED: '#10b981',
  CANCELLED: '#64748b',
};

const STATUS_LABELS = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function PurchaseRequisitionsScreen({ navigation }) {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRequisitions = useCallback(async () => {
    try {
      const response = await api.get('/purchase-requisitions');
      if (response.data?.success) {
        setRequisitions(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch Purchase Requisitions Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchRequisitions();
    }, [fetchRequisitions])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequisitions();
  };

  const renderRequisition = ({ item }) => (
    <TouchableOpacity
      style={styles.requisitionCard}
      onPress={() => navigation.navigate('PurchaseRequisitionDetail', { requisitionId: item.id })}
    >
      <View style={styles.requisitionHeader}>
        <Text style={styles.requisitionCode}>#{item.requisitionNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.requisitionMeta}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={14} color="#64748b" />
          <Text style={styles.metaText}>
            {new Date(item.requestDate).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="user" size={14} color="#64748b" />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.requesterName || 'N/A'}
          </Text>
        </View>
      </View>

      {item.items && item.items.length > 0 && (
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsLabel}>Vật tư yêu cầu:</Text>
          {item.items.slice(0, 3).map((prItem, index) => (
            <View key={index} style={styles.itemRow}>
              <Feather name="package" size={12} color="#16a34a" />
              <Text style={styles.itemText} numberOfLines={1}>
                {prItem.materialName} - {prItem.quantity} {prItem.unit}
              </Text>
            </View>
          ))}
          {item.items.length > 3 && (
            <Text style={styles.moreItems}>+{item.items.length - 3} vật tư khác</Text>
          )}
        </View>
      )}

      {item.totalEstimatedCost && (
        <View style={styles.costContainer}>
          <Text style={styles.costLabel}>Tổng ước tính:</Text>
          <Text style={styles.costValue}>
            {item.totalEstimatedCost.toLocaleString('vi-VN')} đ
          </Text>
        </View>
      )}
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
        <Text style={styles.headerTitle}>Yêu cầu mua hàng</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreatePurchaseRequisition')}
          style={styles.addButton}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={requisitions}
        renderItem={renderRequisition}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="shopping-cart" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có yêu cầu mua hàng</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreatePurchaseRequisition')}
            >
              <Text style={styles.emptyButtonText}>Tạo yêu cầu mới</Text>
            </TouchableOpacity>
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  requisitionCard: {
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
  requisitionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requisitionCode: {
    fontSize: 15,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 0.5,
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
  requisitionMeta: {
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
  itemsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748b',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
  },
  moreItems: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
    marginTop: 4,
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  costLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#16a34a',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptyButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});

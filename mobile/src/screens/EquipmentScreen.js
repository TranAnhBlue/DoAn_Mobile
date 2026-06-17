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
  AVAILABLE: '#16a34a',
  IN_USE: '#3b82f6',
  MAINTENANCE: '#f59e0b',
  RETIRED: '#64748b',
};

const STATUS_LABELS = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang sử dụng',
  MAINTENANCE: 'Bảo trì',
  RETIRED: 'Ngừng sử dụng',
};

export default function EquipmentScreen({ navigation }) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEquipment = useCallback(async () => {
    try {
      const response = await api.get('/equipment');
      if (response.data?.success) {
        setEquipment(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch Equipment Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEquipment();
    }, [fetchEquipment])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const renderEquipment = ({ item }) => (
    <TouchableOpacity
      style={styles.equipmentCard}
      onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}
    >
      <View style={styles.equipmentHeader}>
        <View style={styles.iconContainer}>
          <Feather name="tool" size={24} color="#16a34a" />
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.equipmentName}>{item.name}</Text>
      {item.code && (
        <Text style={styles.equipmentCode}>Mã: {item.code}</Text>
      )}

      <View style={styles.equipmentMeta}>
        {item.manufacturer && (
          <View style={styles.metaItem}>
            <Feather name="tag" size={14} color="#64748b" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.manufacturer}
            </Text>
          </View>
        )}
        {item.purchaseDate && (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={14} color="#64748b" />
            <Text style={styles.metaText}>
              {new Date(item.purchaseDate).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        )}
      </View>

      {item.currentAssigneeName && (
        <View style={styles.assigneeContainer}>
          <Feather name="user" size={14} color="#3b82f6" />
          <Text style={styles.assigneeText}>Đang sử dụng: {item.currentAssigneeName}</Text>
        </View>
      )}

      {item.totalOperationHours !== undefined && (
        <View style={styles.hoursContainer}>
          <Feather name="clock" size={14} color="#16a34a" />
          <Text style={styles.hoursText}>
            Giờ vận hành: {item.totalOperationHours} giờ
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
        <Text style={styles.headerTitle}>Thiết bị</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={equipment}
        renderItem={renderEquipment}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="tool" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có thiết bị</Text>
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
  equipmentCard: {
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
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
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
  equipmentName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  equipmentCode: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 12,
  },
  equipmentMeta: {
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    marginBottom: 8,
  },
  assigneeText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '700',
    flex: 1,
  },
  hoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hoursText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '700',
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

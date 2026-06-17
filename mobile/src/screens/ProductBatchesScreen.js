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

export default function ProductBatchesScreen({ navigation }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await api.get('/product-batches');
      if (response.data?.success) {
        setBatches(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch Product Batches Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBatches();
    }, [fetchBatches])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatches();
  };

  const renderBatch = ({ item }) => (
    <TouchableOpacity
      style={styles.batchCard}
      onPress={() => navigation.navigate('ProductBatchDetail', { batchId: item.id })}
    >
      <View style={styles.batchHeader}>
        <Text style={styles.batchCode}>{item.batchCode}</Text>
        {item.qrGenerated && (
          <View style={styles.qrBadge}>
            <Feather name="check-circle" size={14} color="#16a34a" />
            <Text style={styles.qrText}>QR</Text>
          </View>
        )}
      </View>

      <Text style={styles.productName}>{item.productName}</Text>

      <View style={styles.batchMeta}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={14} color="#64748b" />
          <Text style={styles.metaText}>
            {new Date(item.harvestDate).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="package" size={14} color="#64748b" />
          <Text style={styles.metaText}>
            {item.quantity} {item.unit}
          </Text>
        </View>
      </View>

      {item.farmName && (
        <View style={styles.farmContainer}>
          <Feather name="home" size={14} color="#16a34a" />
          <Text style={styles.farmText} numberOfLines={1}>
            {item.farmName}
          </Text>
        </View>
      )}

      {item.certification && (
        <View style={styles.certBadge}>
          <Feather name="award" size={12} color="#ca8a04" />
          <Text style={styles.certText}>{item.certification}</Text>
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
        <Text style={styles.headerTitle}>Lô sản phẩm</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={batches}
        renderItem={renderBatch}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="box" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có lô sản phẩm</Text>
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
  batchCard: {
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
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchCode: {
    fontSize: 15,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 0.5,
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
  },
  qrText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#16a34a',
  },
  productName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  batchMeta: {
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
  },
  farmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  farmText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '700',
    flex: 1,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fefce8',
    borderRadius: 8,
    marginTop: 4,
  },
  certText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ca8a04',
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

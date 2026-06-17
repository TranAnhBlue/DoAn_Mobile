import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../api/api';

export default function ProductBatchDetailScreen({ route, navigation }) {
  const { batchId } = route.params;
  const [batch, setBatch] = useState(null);
  const [traceability, setTraceability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

  const fetchBatchDetail = useCallback(async () => {
    try {
      const [batchRes, traceRes] = await Promise.all([
        api.get(`/product-batches/${batchId}`),
        api.get(`/product-batches/${batchId}/traceability`).catch(() => ({ data: null })),
      ]);

      if (batchRes.data?.success) {
        setBatch(batchRes.data.data);
      }
      if (traceRes.data?.success) {
        setTraceability(traceRes.data.data);
      }
    } catch (error) {
      console.error('Fetch Batch Detail Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  useFocusEffect(
    useCallback(() => {
      fetchBatchDetail();
    }, [fetchBatchDetail])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatchDetail();
  };

  const handleGenerateQR = async () => {
    setGeneratingQR(true);
    try {
      const response = await api.post(`/qr-codes/generate/${batchId}`);
      if (response.data?.success) {
        Alert.alert('Thành công', 'Đã tạo mã QR truy xuất!');
        fetchBatchDetail();
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo mã QR');
    } finally {
      setGeneratingQR(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!batch) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết lô sản phẩm</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Không tìm thấy lô sản phẩm</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết lô</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
      >
        {/* Batch Code */}
        <View style={styles.section}>
          <Text style={styles.batchCode}>{batch.batchCode}</Text>
          {batch.qrGenerated && (
            <View style={styles.qrGeneratedBadge}>
              <Feather name="check-circle" size={16} color="#16a34a" />
              <Text style={styles.qrGeneratedText}>QR đã tạo</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin sản phẩm</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="package" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Sản phẩm:</Text>
              <Text style={styles.infoValue}>{batch.productName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="layers" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Số lượng:</Text>
              <Text style={styles.infoValue}>
                {batch.quantity} {batch.unit}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Ngày thu hoạch:</Text>
              <Text style={styles.infoValue}>
                {new Date(batch.harvestDate).toLocaleDateString('vi-VN')}
              </Text>
            </View>
            {batch.farmName && (
              <View style={styles.infoRow}>
                <Feather name="home" size={16} color="#16a34a" />
                <Text style={styles.infoLabel}>Nông trại:</Text>
                <Text style={styles.infoValue}>{batch.farmName}</Text>
              </View>
            )}
            {batch.certification && (
              <View style={styles.infoRow}>
                <Feather name="award" size={16} color="#ca8a04" />
                <Text style={styles.infoLabel}>Chứng nhận:</Text>
                <Text style={[styles.infoValue, { color: '#ca8a04' }]}>
                  {batch.certification}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* QR Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mã truy xuất</Text>
          {batch.traceCode ? (
            <View style={styles.qrCard}>
              {batch.qrImageUrl && (
                <Image source={{ uri: batch.qrImageUrl }} style={styles.qrImage} />
              )}
              <Text style={styles.traceCode}>{batch.traceCode}</Text>
              <TouchableOpacity
                style={styles.viewTraceButton}
                onPress={() =>
                  navigation.navigate('TraceDetail', { traceCode: batch.traceCode })
                }
              >
                <Feather name="eye" size={18} color="#fff" />
                <Text style={styles.viewTraceButtonText}>Xem thông tin truy xuất</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noQrCard}>
              <Feather name="grid" size={48} color="#cbd5e1" />
              <Text style={styles.noQrText}>Chưa có mã QR truy xuất</Text>
              <TouchableOpacity
                style={[styles.generateQRButton, generatingQR && styles.generateQRButtonDisabled]}
                onPress={handleGenerateQR}
                disabled={generatingQR}
              >
                {generatingQR ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="grid" size={18} color="#fff" />
                    <Text style={styles.generateQRButtonText}>Tạo mã QR</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Traceability Summary */}
        {traceability && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tóm tắt truy xuất</Text>
            <View style={styles.traceCard}>
              <View style={styles.traceStat}>
                <Feather name="activity" size={24} color="#3b82f6" />
                <Text style={styles.traceStatValue}>{traceability.totalActivities || 0}</Text>
                <Text style={styles.traceStatLabel}>Hoạt động</Text>
              </View>
              <View style={styles.traceStat}>
                <Feather name="eye" size={24} color="#16a34a" />
                <Text style={styles.traceStatValue}>{traceability.scanCount || 0}</Text>
                <Text style={styles.traceStatLabel}>Lượt quét</Text>
              </View>
            </View>
          </View>
        )}

        {/* Notes */}
        {batch.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ghi chú</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{batch.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  batchCode: {
    fontSize: 24,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 1,
    textAlign: 'center',
  },
  qrGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    alignSelf: 'center',
  },
  qrGeneratedText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16a34a',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  traceCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: 1,
  },
  viewTraceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewTraceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  noQrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  noQrText: {
    marginTop: 12,
    marginBottom: 20,
    fontSize: 15,
    color: '#94a3b8',
    fontWeight: '600',
  },
  generateQRButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  generateQRButtonDisabled: {
    opacity: 0.6,
  },
  generateQRButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  traceCard: {
    flexDirection: 'row',
    gap: 16,
  },
  traceStat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  traceStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginTop: 8,
  },
  traceStatLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});

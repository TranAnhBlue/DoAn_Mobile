import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../api/api';

export default function TraceDetailScreen({ route, navigation }) {
  const { qrCode } = route.params;
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTraceData = async () => {
      try {
        const res = await api.get(`/journals/qr/${qrCode}`);
        if (res.data?.success) {
          setJournal(res.data.data);
        } else {
          Alert.alert('Lỗi', 'Không tìm thấy thông tin truy xuất.');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể kết nối máy chủ để truy xuất.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchTraceData();
  }, [navigation, qrCode]);

  const entrySummary = useMemo(() => {
    if (!journal?.schemaId?.tables) return [];
    const entries = journal.entries || journal.data || {};

    return journal.schemaId.tables.map((table) => {
      const tableData = entries[table.tableName];
      const rows = Array.isArray(tableData) ? tableData : (tableData ? [tableData] : []);
      return {
        tableName: table.tableName,
        fields: table.fields || [],
        rows,
      };
    });
  }, [journal]);

  const formatValue = (value, field) => {
    if (value === undefined || value === null || value === '') return 'Chưa cập nhật';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    if (field?.type === 'date' || String(field?.label || '').toLowerCase().includes('ngày')) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('vi-VN');
    }
    return String(value);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!journal) return null;

  const schema = journal.schemaId || {};
  const producer = journal.userId || {};
  const htx = journal.htxJournalId?.htxId;
  const isVerified = ['Verified', 'Locked'].includes(journal.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Truy xuất nguồn gốc</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.verifyCard}>
          <View style={[styles.verifyIcon, { backgroundColor: isVerified ? '#dcfce7' : '#fff7ed' }]}>
            <Feather name={isVerified ? 'check-circle' : 'clock'} size={34} color={isVerified ? '#16a34a' : '#f97316'} />
          </View>
          <Text style={styles.verifyTitle}>
            {isVerified ? 'Sản phẩm đã được xác minh' : 'Nhật ký đang chờ xác minh'}
          </Text>
          <Text style={styles.verifySub} numberOfLines={2}>Mã truy xuất hợp lệ trên hệ thống EBookFarm</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{schema.name || 'Nhật ký sản xuất'}</Text>
          {!!schema.description && <Text style={styles.cardDescription}>{schema.description}</Text>}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã QR</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{journal.qrCode || qrCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Người sản xuất</Text>
            <Text style={styles.infoValue}>{producer.fullname || producer.username || 'Chưa cập nhật'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>HTX</Text>
            <Text style={styles.infoValue}>{htx?.organization || htx?.fullname || 'Nhật ký cá nhân'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ngày tạo</Text>
            <Text style={styles.infoValue}>{new Date(journal.createdAt).toLocaleDateString('vi-VN')}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lượt xem</Text>
            <Text style={styles.infoValue}>{journal.viewCount || 0}</Text>
          </View>
        </View>

        {producer.avatar || producer.province || producer.address ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin đơn vị sản xuất</Text>
            <View style={styles.producerRow}>
              {producer.avatar ? (
                <Image source={{ uri: producer.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{(producer.fullname || producer.username || 'U')[0].toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.producerName}>{producer.fullname || producer.username}</Text>
                <Text style={styles.producerAddress} numberOfLines={2}>
                  {[producer.address, producer.ward, producer.province].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quá trình sản xuất</Text>
          {entrySummary.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có dữ liệu nhật ký.</Text>
          ) : (
            entrySummary.map((table, tableIndex) => (
              <View key={`${table.tableName}-${tableIndex}`} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{table.tableName}</Text>
                  {table.rows.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có thông tin.</Text>
                  ) : (
                    table.rows.map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.entryBox}>
                        {table.rows.length > 1 && <Text style={styles.rowIndex}>Dòng #{rowIndex + 1}</Text>}
                        {table.fields.map((field) => (
                          <View key={field.name} style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>{field.label}</Text>
                            <Text style={styles.fieldValue}>{formatValue(row[field.name], field)}</Text>
                          </View>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {(journal.images || []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Hình ảnh thực tế</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {journal.images.map((image, index) => (
                <Image key={image._id || index} source={{ uri: image.url }} style={styles.traceImage} />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  content: { padding: 16, paddingBottom: 28 },
  verifyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  verifyIcon: { width: 62, height: 62, borderRadius: 31, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  verifyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  verifySub: { fontSize: 13, color: '#64748b', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  cardTitle: { fontSize: 19, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  cardDescription: { fontSize: 13, color: '#64748b', lineHeight: 19, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  infoLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  infoValue: { flex: 1, marginLeft: 12, textAlign: 'right', fontSize: 13, color: '#1e293b', fontWeight: '700' },
  producerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  producerName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  producerAddress: { fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 17 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#16a34a', marginTop: 5, marginRight: 12 },
  timelineContent: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 14 },
  timelineTitle: { fontSize: 15, fontWeight: '800', color: '#166534', marginBottom: 8 },
  entryBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8 },
  rowIndex: { fontSize: 12, fontWeight: '800', color: '#2563eb', marginBottom: 8 },
  fieldRow: { marginBottom: 8 },
  fieldLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  fieldValue: { fontSize: 13, color: '#111827', marginTop: 2, lineHeight: 18 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  traceImage: { width: 132, height: 100, borderRadius: 12, marginRight: 10, backgroundColor: '#f1f5f9' },
});

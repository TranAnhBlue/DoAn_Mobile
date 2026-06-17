import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
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

export default function ProductionPlanDetailScreen({ route, navigation }) {
  const { planId } = route.params;
  const [plan, setPlan] = useState(null);
  const [stages, setStages] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlanDetail = useCallback(async () => {
    try {
      const [planRes, logsRes] = await Promise.all([
        api.get(`/production-plans/${planId}`),
        api.get(`/production-plans/${planId}/logs`),
      ]);

      if (planRes.data?.success) {
        setPlan(planRes.data.data);
        setStages(planRes.data.data.stages || []);
      }
      if (logsRes.data?.success) {
        setLogs(logsRes.data.data || []);
      }
    } catch (error) {
      console.error('Fetch Plan Detail Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      fetchPlanDetail();
    }, [fetchPlanDetail])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlanDetail();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kế hoạch sản xuất</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>Không tìm thấy kế hoạch</Text>
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
        <Text style={styles.headerTitle}>Chi tiết kế hoạch</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
      >
        {/* Status Badge */}
        <View style={styles.section}>
          <View
            style={[
              styles.statusBadgeLarge,
              { backgroundColor: `${STATUS_COLORS[plan.status]}20` },
            ]}
          >
            <Text style={[styles.statusTextLarge, { color: STATUS_COLORS[plan.status] }]}>
              {STATUS_LABELS[plan.status]}
            </Text>
          </View>
        </View>

        {/* Plan Info */}
        <View style={styles.section}>
          <Text style={styles.planName}>{plan.planName}</Text>
          {plan.description && (
            <Text style={styles.planDescription}>{plan.description}</Text>
          )}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="package" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Cây trồng:</Text>
              <Text style={styles.infoValue}>{plan.cropName || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Thửa đất:</Text>
              <Text style={styles.infoValue}>{plan.landPlotName || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="layout" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Diện tích:</Text>
              <Text style={styles.infoValue}>{plan.actualArea || 0} ha</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Bắt đầu:</Text>
              <Text style={styles.infoValue}>
                {new Date(plan.plannedStartDate).toLocaleDateString('vi-VN')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={16} color="#16a34a" />
              <Text style={styles.infoLabel}>Kết thúc:</Text>
              <Text style={styles.infoValue}>
                {new Date(plan.plannedEndDate).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến độ thực hiện</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${plan.completionPercentage || 0}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{plan.completionPercentage || 0}%</Text>
          </View>
        </View>

        {/* Stages */}
        {stages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Các giai đoạn</Text>
            {stages.map((stage, index) => (
              <View key={index} style={styles.stageCard}>
                <View style={styles.stageHeader}>
                  <Text style={styles.stageName}>{stage.name}</Text>
                  <View
                    style={[
                      styles.stageStatusDot,
                      { backgroundColor: stage.isCompleted ? '#16a34a' : '#94a3b8' },
                    ]}
                  />
                </View>
                {stage.description && (
                  <Text style={styles.stageDescription}>{stage.description}</Text>
                )}
                <View style={styles.stageMeta}>
                  <Text style={styles.stageMetaText}>
                    Ngày {index + 1}: {new Date(stage.startDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nhật ký liên quan ({logs.length})</Text>
            {logs.slice(0, 5).map((log) => (
              <TouchableOpacity
                key={log.id}
                style={styles.logCard}
                onPress={() => navigation.navigate('Journals')}
              >
                <Feather name="book-open" size={16} color="#16a34a" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.logActivity}>{log.activityType}</Text>
                  <Text style={styles.logDate}>
                    {new Date(log.activityDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
            {logs.length > 5 && (
              <TouchableOpacity
                style={styles.viewMoreButton}
                onPress={() => navigation.navigate('Journals')}
              >
                <Text style={styles.viewMoreText}>
                  Xem tất cả {logs.length} nhật ký
                </Text>
              </TouchableOpacity>
            )}
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
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  planName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
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
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 18,
    color: '#16a34a',
    fontWeight: '900',
    textAlign: 'center',
  },
  stageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  stageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stageName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    flex: 1,
  },
  stageStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stageDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  stageMeta: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stageMetaText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  logActivity: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  logDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  viewMoreButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 4,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
});

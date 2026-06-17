import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import api from '../api/api';
import { useAuthStore } from '../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 32;

export default function ReportsScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard stats
  const [stats, setStats] = useState(null);
  
  // Chart data
  const [statusData, setStatusData] = useState([]);
  const [activityData, setActivityData] = useState([]);

  const fetchData = async () => {
    try {
      const [statsRes, statusRes, activityRes] = await Promise.all([
        api.get('/reports/dashboard-stats'),
        api.get('/reports/journal-status'),
        api.get('/reports/activity-timeline'),
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      if (statusRes.data.success) {
        setStatusData(statusRes.data.data);
      }

      if (activityRes.data.success) {
        setActivityData(activityRes.data.data);
      }
    } catch (error) {
      console.error('Fetch reports error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Đang tải báo cáo...</Text>
      </View>
    );
  }

  // Prepare pie chart data
  const pieColors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
  const pieChartData = statusData.map((item, index) => ({
    name: item.name,
    population: item.value,
    color: pieColors[index % pieColors.length],
    legendFontColor: '#64748b',
    legendFontSize: 12,
  }));

  // Prepare line chart data
  const lineChartData = {
    labels: activityData.map((item) => item.name),
    datasets: [
      {
        data: activityData.map((item) => item.hoat_dong),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: '#f1f5f9',
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: 11,
    },
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Báo cáo & Thống kê</Text>
          <Text style={styles.headerSub}>
            {user?.fullname || user?.username}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Feather
            name="refresh-cw"
            size={20}
            color="#16a34a"
            style={refreshing && styles.rotating}
          />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard
            icon="book"
            label="Tổng sổ"
            value={stats.totalJournals || 0}
            color="#3b82f6"
          />
          <StatCard
            icon="check-circle"
            label="Đã duyệt"
            value={stats.completedJournals || 0}
            color="#10b981"
          />
          <StatCard
            icon="clock"
            label="Chờ duyệt"
            value={stats.pendingJournals || 0}
            color="#f59e0b"
          />
          <StatCard
            icon="users"
            label="Nông dân"
            value={stats.totalUsers || 0}
            color="#8b5cf6"
          />
          
          {/* HTX specific stats */}
          {stats.totalArea !== undefined && (
            <StatCard
              icon="map"
              label="Diện tích"
              value={`${(stats.totalArea / 10000).toFixed(1)} ha`}
              color="#06b6d4"
            />
          )}
          {stats.activeSchedules !== undefined && (
            <StatCard
              icon="calendar"
              label="Lịch hoạt động"
              value={stats.activeSchedules || 0}
              color="#f43f5e"
            />
          )}
        </View>
      )}

      {/* Journal Status Chart */}
      {pieChartData.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Feather name="pie-chart" size={20} color="#16a34a" />
            <Text style={styles.chartTitle}>Trạng thái sổ nhật ký</Text>
          </View>
          <PieChart
            data={pieChartData}
            width={CHART_WIDTH}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute
            hasLegend={true}
          />
        </View>
      )}

      {/* Activity Timeline Chart */}
      {activityData.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Feather name="trending-up" size={20} color="#16a34a" />
            <Text style={styles.chartTitle}>
              Hoạt động 6 tháng gần đây
            </Text>
          </View>
          <LineChart
            data={lineChartData}
            width={CHART_WIDTH}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.lineChart}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            withDots={true}
            withShadow={false}
            fromZero={true}
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Hành động nhanh</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('JournalList')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
            <Feather name="book" size={20} color="#3b82f6" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Xem sổ nhật ký</Text>
            <Text style={styles.actionDesc}>
              Quản lý {stats?.totalJournals || 0} sổ
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
            <Feather name="package" size={20} color="#f59e0b" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Kho vật tư</Text>
            <Text style={styles.actionDesc}>Quản lý vật tư sản xuất</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Supply')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
            <Feather name="shopping-cart" size={20} color="#10b981" />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Cung ứng</Text>
            <Text style={styles.actionDesc}>Yêu cầu vật tư & tiêu thụ</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  content: {
    padding: 16,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSub: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotating: {
    transform: [{ rotate: '180deg' }],
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },

  /* Chart Cards */
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },

  /* Actions Card */
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

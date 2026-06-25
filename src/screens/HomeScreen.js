import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../api/api';
import { useAuthStore } from '../store/authStore';

const FARM_DARK = '#27c65a';
const FARM = '#27c65a';

const ROLE_LABELS = {
  Admin:   'Quản trị viên', ADMIN:   'Quản trị viên',
  Farmer:  'Nông dân',      FARMER:  'Nông dân',
  HTX:     'Hợp tác xã',   Htx:     'Hợp tác xã',
  User:    'Thành viên',   USER:    'Thành viên',
};

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [weatherInfo, setWeatherInfo] = useState({
    temp: '--',
    humidity: '--',
    wind: '--',
    condition: 'Đang cập nhật',
    updatedAt: '--:--',
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = useAuthStore((state) => state.user);

  const fetchWeather = useCallback(async () => {
    try {
      const location = encodeURIComponent(user?.province || 'Hanoi');
      const response = await fetch(`https://wttr.in/${location}?format=j1&lang=vi`);
      const data = await response.json();
      const current = data?.current_condition?.[0];
      const condition = current?.lang_vi?.[0]?.value || current?.weatherDesc?.[0]?.value || 'Có mây';

      setWeatherInfo({
        temp: current?.temp_C || '--',
        humidity: current?.humidity || '--',
        wind: current?.windspeedKmph || '--',
        condition,
        updatedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (error) {
      setWeatherInfo((prev) => ({ ...prev, condition: 'Có mây' }));
    }
  }, [user?.province]);

  const fetchData = useCallback(async () => {
    try {
      // Gọi từng API riêng để 1 lỗi 403 không block toàn bộ
      const [statsResult, unreadResult] = await Promise.allSettled([
        api.get('/dashboard/overview'),
        api.get('/notifications/unread'),
      ]);

      if (statsResult.status === 'fulfilled' && statsResult.value.data?.success) {
        setStats(statsResult.value.data.data);
      }

      if (unreadResult.status === 'fulfilled' && unreadResult.value.data?.success) {
        const unreadList = unreadResult.value.data.data;
        setUnreadCount(Array.isArray(unreadList) ? unreadList.length : (unreadResult.value.data.unreadCount || 0));
      }
    } catch (error) {
      console.error('Home Screen Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchWeather();
    }, [fetchData, fetchWeather])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Lấy role từ field role hoặc roles[] (API trả về cả hai)
  const userRole = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : user?.roles) || '';
  const roleLabel = ROLE_LABELS[userRole] || userRole || 'Thành viên';
  const normalizedStats = useMemo(() => ({
    totalJournals: stats?.totalJournals || 0,
    pendingJournals: stats?.pendingJournals ?? stats?.pendingApprovalsCount ?? 0,
    verifiedJournals: stats?.verifiedJournals ?? stats?.completedJournals ?? 0,
    inventoryCount: stats?.inventoryCount || 0,
  }), [stats]);

  const todayText = useMemo(() => (
    new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  ), []);

  const sensors = [
    { id: 'soilMoisture', label: 'Độ ẩm đất', value: '42%', status: 'Tốt', icon: 'droplet', color: '#3b82f6', bg: '#eff6ff' },
    { id: 'soilTemp', label: 'Nhiệt độ đất', value: '24°C', status: 'Ổn định', icon: 'sun', color: '#f97316', bg: '#fff7ed' },
    { id: 'drone', label: 'Drone phun thuốc', value: 'Sẵn sàng', status: 'Online', icon: 'wind', color: '#16a34a', bg: '#dcfce7' },
  ];

  const sections = [
    {
      title: 'Công việc hàng ngày',
      items: [
        {
          id: 'myTasks',
          title: 'Công việc của tôi',
          icon: 'check-circle',
          route: 'MyTasks',
          color: '#2563eb',
          iconBg: '#eff6ff',
        },
        {
          id: 'journals',
          title: 'Nhật ký canh tác',
          icon: 'book-open',
          route: 'Journals',
          color: '#16a34a',
          iconBg: '#dcfce7',
          badge: String(normalizedStats.totalJournals),
        },
        {
          id: 'productionPlans',
          title: 'Kế hoạch sản xuất',
          icon: 'calendar',
          route: 'ProductionPlans',
          color: '#7c3aed',
          iconBg: '#f5f3ff',
        },
        {
          id: 'productBatches',
          title: 'Lô sản phẩm',
          icon: 'box',
          route: 'ProductBatches',
          color: '#ea580c',
          iconBg: '#fff7ed',
        },
      ],
    },
    {
      title: 'Quản lý vật tư',
      items: [
        {
          id: 'inventory',
          title: 'Kho vật tư',
          icon: 'package',
          route: 'Inventory',
          color: '#0891b2',
          iconBg: '#ecfeff',
          badge: String(normalizedStats.inventoryCount),
        },
        {
          id: 'purchaseRequisitions',
          title: 'Yêu cầu mua hàng',
          icon: 'shopping-cart',
          route: 'PurchaseRequisitions',
          color: '#dc2626',
          iconBg: '#fef2f2',
        },
        {
          id: 'equipment',
          title: 'Thiết bị',
          icon: 'tool',
          route: 'Equipment',
          color: '#ca8a04',
          iconBg: '#fefce8',
        },
      ],
    },
    {
      title: 'Hỗ trợ và thông tin',
      items: [
        {
          id: 'notifications',
          title: 'Thông báo',
          icon: 'bell',
          route: 'Notifications',
          color: '#f59e0b',
          iconBg: '#fff7ed',
          badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : '',
        },
        {
          id: 'trace',
          title: 'Truy xuất QR',
          icon: 'grid',
          route: 'Scanner',
          color: '#16a34a',
          iconBg: '#ddfbea',
        },
        {
          id: 'ai',
          title: 'Hỏi AI',
          icon: 'cpu',
          route: 'AI',
          color: '#9333ea',
          iconBg: '#faf5ff',
        },
        {
          id: 'reports',
          title: 'Báo cáo',
          icon: 'bar-chart-2',
          route: 'Reports',
          color: '#8b5cf6',
          iconBg: '#faf5ff',
        },
      ],
    },
  ];

  const renderCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.featureCard}
      activeOpacity={0.84}
      onPress={() => navigation.navigate(item.route)}
    >
      {!!item.badge && (
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{item.badge}</Text>
        </View>
      )}
      <View style={[styles.featureIcon, { backgroundColor: item.iconBg }]}>
        <Feather name={item.icon} size={26} color={item.color} />
      </View>
      <Text style={styles.featureTitle} numberOfLines={2}>{item.title}</Text>
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
        <View style={styles.profileRow}>
          <View style={styles.avatarFrame}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {(user?.fullname || user?.username || 'U')[0].toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.profileText}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.fullname || user?.username || 'EBookFarm'}
            </Text>
            <Text style={styles.org} numberOfLines={1}>
              {user?.organization || roleLabel}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerBell}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Feather name="bell" size={23} color="#fff" />
            {unreadCount > 0 && <View style={styles.headerBellDot} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
      >
        <View style={styles.overview}>
          <Text style={styles.overviewTitle} numberOfLines={1}>
            Theo dõi nông trại hôm nay
          </Text>
          <Text style={styles.todayText}>{todayText}</Text>

          <View style={styles.weatherCard}>
            <View style={styles.weatherTop}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Trực tiếp</Text>
              </View>
              <Text style={styles.weatherUpdated}>Cập nhật {weatherInfo.updatedAt}</Text>
            </View>
            <View style={styles.weatherBody}>
              <View style={styles.weatherMain}>
                <Feather name="cloud" size={38} color="#60a5fa" />
                <View>
                  <Text style={styles.weatherTemp}>{weatherInfo.temp}°</Text>
                  <Text style={styles.weatherCondition} numberOfLines={1}>{weatherInfo.condition}</Text>
                </View>
              </View>
              <View style={styles.weatherStats}>
                <View style={styles.weatherMini}>
                  <Feather name="droplet" size={14} color="#3b82f6" />
                  <Text style={styles.weatherMiniLabel}>Độ ẩm</Text>
                  <Text style={styles.weatherMiniValue}>{weatherInfo.humidity}%</Text>
                </View>
                <View style={styles.weatherMini}>
                  <Feather name="wind" size={14} color="#16a34a" />
                  <Text style={styles.weatherMiniLabel}>Gió</Text>
                  <Text style={styles.weatherMiniValue}>{weatherInfo.wind} km/h</Text>
                </View>
              </View>
            </View>

            <Text style={styles.sensorTitle}>Trạm cảm biến IoT</Text>
            <View style={styles.sensorGrid}>
              {sensors.map((sensor) => (
                <View key={sensor.id} style={styles.sensorCard}>
                  <View style={[styles.sensorIcon, { backgroundColor: sensor.bg }]}>
                    <Feather name={sensor.icon} size={15} color={sensor.color} />
                  </View>
                  <Text style={styles.sensorLabel} numberOfLines={1}>{sensor.label}</Text>
                  <Text style={styles.sensorValue} numberOfLines={1}>{sensor.value}</Text>
                  <Text style={styles.sensorStatus}>{sensor.status}</Text>
                </View>
              ))}
            </View>
          </View>

        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.items.map(renderCard)}
            </View>
          </View>
        ))}
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
  header: {
    backgroundColor: FARM_DARK,
    paddingHorizontal: 20,
    paddingTop: 42,
    paddingBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarFrame: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 13,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: FARM_DARK,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 23,
  },
  org: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  headerBell: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  headerBellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 96,
  },
  overview: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  overviewTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  todayText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 12,
  },
  weatherCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dcfce7',
    shadowColor: '#bbf7d0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 2,
  },
  weatherTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  liveText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  weatherUpdated: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
  weatherBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  weatherMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  weatherTemp: {
    color: '#111827',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  weatherCondition: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 115,
  },
  weatherStats: {
    width: 112,
    gap: 8,
  },
  weatherMini: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  weatherMiniLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  weatherMiniValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 1,
  },
  sensorTitle: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sensorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sensorCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 13,
    padding: 9,
    minWidth: 0,
  },
  sensorIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  sensorLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  sensorValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  sensorStatus: {
    color: '#16a34a',
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    marginHorizontal: 22,
    marginBottom: 10,
    color: '#159447',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  featureCard: {
    width: '48%',
    minHeight: 116,
    backgroundColor: '#fff',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#a7c7b1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 3,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    color: '#343b4a',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: FARM,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
});

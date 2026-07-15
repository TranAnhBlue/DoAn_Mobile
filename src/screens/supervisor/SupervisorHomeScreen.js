import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {useFocusEffect} from '@react-navigation/native';
import {apiClient} from '../../services/apiClient';
import {colors} from '../../theme/colors';

export default function SupervisorHomeScreen({navigation, route}) {
  const [currentUser, setCurrentUser] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [pendingReports, setPendingReports] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const userId = route.params?.userId;

  const fetchData = useCallback(async () => {
    try {
      const data = await apiClient.bootstrap();
      const users = data.users || [];
      const allSeasons = data.seasons || [];
      const reports = data.farmerDailyReports || [];

      const user = users.find(u => u.id === userId);
      setCurrentUser(user);

      const supervisorSeasons = allSeasons.filter(
        s => s.supervisorId === userId && !s.deletedAt,
      );
      setSeasons(supervisorSeasons);

      const seasonIds = new Set(supervisorSeasons.map(s => s.id));
      const pending = reports.filter(
        r => seasonIds.has(r.seasonId) && !r.deletedAt,
      ).length;
      setPendingReports(pending);

      setUnreadNotifications(0);
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const menuItems = [
    {
      id: 'weather',
      title: 'Thời tiết',
      subtitle: 'Theo dõi thời tiết',
      icon: 'cloud',
      color: '#3b82f6',
      bg: '#dbeafe',
      route: 'Weather',
    },
    {
      id: 'seasons',
      title: 'Vùng trồng',
      subtitle: `${seasons.length} mùa vụ`,
      icon: 'map-pin',
      color: '#10b981',
      bg: '#d1fae5',
      route: 'SeasonManagement',
    },
    {
      id: 'plan',
      title: 'Kế hoạch',
      subtitle: 'Quản lý công việc',
      icon: 'clipboard',
      color: '#8b5cf6',
      bg: '#ede9fe',
      route: 'PlanManagement',
    },
    {
      id: 'notifications',
      title: 'Thông báo',
      subtitle: `${unreadNotifications} tin mới`,
      icon: 'bell',
      color: '#ef4444',
      bg: '#fee2e2',
      route: 'Notifications',
      badge: unreadNotifications > 0 ? String(unreadNotifications) : null,
    },
    {
      id: 'reports',
      title: 'Báo cáo',
      subtitle: `${pendingReports} chờ xử lý`,
      icon: 'bar-chart-2',
      color: '#f59e0b',
      bg: '#fef3c7',
      route: 'ReportManagement',
      badge: pendingReports > 0 ? String(pendingReports) : null,
    },
    {
      id: 'farmers',
      title: 'Nông dân',
      subtitle: 'Quản lý nhân sự',
      icon: 'users',
      color: '#06b6d4',
      bg: '#cffafe',
      route: 'FarmerManagement',
    },
    {
      id: 'diary',
      title: 'Nhật ký đồng',
      subtitle: 'Ghi chép chi tiết',
      icon: 'book-open',
      color: '#ec4899',
      bg: '#fce7f3',
      route: 'FieldDiary',
    },
    {
      id: 'analytics',
      title: 'Thống kê',
      subtitle: 'Phân tích dữ liệu',
      icon: 'trending-up',
      color: '#6366f1',
      bg: '#e0e7ff',
      route: 'Analytics',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Quản lý nông trại</Text>
          <Text style={styles.userName}>
            {currentUser?.fullName || 'Giám sát viên'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() =>
            navigation.navigate('Profile', {
              userId,
              userName: currentUser?.fullName,
            })
          }>
          <Feather name="user" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.purple600]}
          />
        }>
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{seasons.length}</Text>
            <Text style={styles.statLabel}>Mùa vụ</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pendingReports}</Text>
            <Text style={styles.statLabel}>Báo cáo chờ</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{unreadNotifications}</Text>
            <Text style={styles.statLabel}>Thông báo</Text>
          </View>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuCard}
              onPress={() =>
                navigation.navigate(item.route, {
                  userId,
                  userName: currentUser?.fullName,
                })
              }
              activeOpacity={0.7}>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <View style={[styles.menuIconContainer, {backgroundColor: item.bg}]}>
                <Feather name={item.icon} size={32} color={item.color} />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray50,
  },
  loadingText: {
    fontSize: 16,
    color: colors.gray600,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.purple600,
  },
  greeting: {
    fontSize: 14,
    color: colors.purple100,
    fontWeight: '600',
  },
  userName: {
    fontSize: 24,
    color: colors.white,
    fontWeight: '900',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.purple700,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.purple600,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray600,
    fontWeight: '600',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.gray200,
    marginHorizontal: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    marginTop: 20,
  },
  menuCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    margin: '1.5%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.red500,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  menuIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: '600',
    textAlign: 'center',
  },
});

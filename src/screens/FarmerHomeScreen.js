import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { farmerRepository } from '../repositories/farmerRepository';
import { useSyncManager } from '../hooks/useSyncManager';
import { MenuCard } from '../components/MenuCard';
import { StatCard } from '../components/StatCard';

export default function FarmerHomeScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState({
    assignedSeasons: 0,
    pendingReports: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const { pendingCount, syncStatus } = useSyncManager();

  const fetchData = useCallback(async () => {
    try {
      const seasons = await farmerRepository.getAssignedSeasons(user?.id);
      const pending = await farmerRepository.getPendingReports(user?.id);

      setStats({
        assignedSeasons: seasons.length,
        pendingReports: pending.length,
      });
    } catch (error) {
      console.error('Farmer home fetch error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />
      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.userName}>{user?.fullname || 'Nông dân'}</Text>
          </View>
          <View style={styles.syncBadge}>
            {syncStatus === 'syncing' ? (
              <Icon name="refresh-cw" size={20} color="#fff" />
            ) : pendingCount > 0 ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>{pendingCount}</Text>
              </View>
            ) : (
              <Icon name="check-circle" size={20} color="#fff" />
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
      >
        <View style={styles.statsSection}>
          <StatCard
            icon={<Icon name="calendar" size={32} color="#16a34a" />}
            label="Mùa vụ được giao"
            value={stats.assignedSeasons}
            color="#16a34a"
          />
          <StatCard
            icon={<Icon name="clock" size={32} color="#f59e0b" />}
            label="Báo cáo chưa đồng bộ"
            value={stats.pendingReports}
            color="#f59e0b"
          />
        </View>

        <Text style={styles.sectionTitle}>CHỨC NĂNG</Text>

        <View style={styles.menuGrid}>
          <MenuCard
            icon="check-square"
            label="Báo cáo hàng ngày"
            color="#16a34a"
            onPress={() => navigation.navigate('MyTasks')}
          />
          <MenuCard
            icon="calendar"
            label="Kế hoạch công việc"
            color="#3b82f6"
            onPress={() => navigation.navigate('ProductionPlans')}
          />
          <MenuCard
            icon="map"
            label="Vùng trồng"
            color="#8b5cf6"
            onPress={() => Alert.alert('Thông báo', 'Chức năng đang phát triển')}
          />
          <MenuCard
            icon="cloud"
            label="Thời tiết"
            color="#06b6d4"
            onPress={() => Alert.alert('Thông báo', 'Chức năng đang phát triển')}
          />
          <MenuCard
            icon="bell"
            label="Thông báo"
            color="#f59e0b"
            badge={0}
            onPress={() => navigation.navigate('Notifications')}
          />
          <MenuCard
            icon="user"
            label="Hồ sơ"
            color="#64748b"
            onPress={() => navigation.navigate('Profile')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dcfce7',
  },
  userName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
  },
  syncBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    backgroundColor: '#dc2626',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pendingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#6b7280',
    letterSpacing: 1,
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

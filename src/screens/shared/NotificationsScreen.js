import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {useFocusEffect} from '@react-navigation/native';
import {colors} from '../../theme/colors';

export default function NotificationsScreen({navigation, route}) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const userId = route.params?.userId;

  const fetchNotifications = useCallback(async () => {
    try {
      const mockNotifications = [
        {
          id: '1',
          type: 'REPORT_SUBMITTED',
          title: 'Báo cáo mới từ nông dân',
          message: 'Nguyễn Văn A đã gửi báo cáo canh tác ngày 15/07/2026',
          createdAt: new Date().toISOString(),
          isRead: false,
          icon: 'file-text',
          color: '#3b82f6',
        },
        {
          id: '2',
          type: 'WEATHER_ALERT',
          title: 'Cảnh báo thời tiết',
          message: 'Có mưa lớn trong 2 ngày tới, cần chuẩn bị thoát nước',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          isRead: false,
          icon: 'cloud-rain',
          color: '#ef4444',
        },
        {
          id: '3',
          type: 'TASK_REMINDER',
          title: 'Nhắc nhở công việc',
          message: 'Đến thời gian phun thuốc sâu cho vùng A',
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          isRead: true,
          icon: 'clock',
          color: '#f59e0b',
        },
        {
          id: '4',
          type: 'SYSTEM',
          title: 'Cập nhật hệ thống',
          message: 'Phiên bản mới đã có, vui lòng cập nhật để sử dụng tính năng mới',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          isRead: true,
          icon: 'info',
          color: '#8b5cf6',
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông báo');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? {...n, isRead: true} : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    Alert.alert('Thành công', 'Đã đánh dấu tất cả là đã đọc');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}>
      <View style={[styles.iconContainer, {backgroundColor: `${item.color}15`}]}>
        <Feather name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.gray900} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Thông báo</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}>
          <Feather
            name="check-circle"
            size={24}
            color={unreadCount > 0 ? colors.green600 : colors.gray300}
          />
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="bell-off" size={64} color={colors.gray300} />
          <Text style={styles.emptyText}>Chưa có thông báo</Text>
          <Text style={styles.emptySubtext}>
            Các thông báo mới sẽ hiển thị ở đây
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.green600]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  headerBadge: {
    backgroundColor: colors.red500,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
  markAllButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green600,
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 20,
    marginBottom: 8,
  },
  time: {
    fontSize: 12,
    color: colors.gray400,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
});

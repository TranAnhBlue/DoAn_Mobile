import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/api';

export default function NotificationsScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data.data || [];
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getNotificationIcon = (type) => {
    const normalizedType = String(type || '').toLowerCase();
    if (normalizedType.includes('journal')) return 'book';
    if (normalizedType.includes('verified') || normalizedType.includes('approved')) {
        return 'check-circle';
    }
    if (normalizedType.includes('rejected') || normalizedType.includes('revision')) return 'x-circle';
    if (normalizedType.includes('system')) return 'bell';
    if (normalizedType.includes('news')) return 'file-text';
    return 'info';
  };

  const getNotificationColor = (type) => {
    const normalizedType = String(type || '').toLowerCase();
    if (normalizedType.includes('journal')) return '#3b82f6';
    if (normalizedType.includes('verified') || normalizedType.includes('approved')) return '#22c55e';
    if (normalizedType.includes('rejected') || normalizedType.includes('revision')) return '#ef4444';
    if (normalizedType.includes('system')) return '#f59e0b';
    if (normalizedType.includes('news')) return '#8b5cf6';
    return '#6b7280';
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || notifications.length === 0}
        >
          <Feather name="check-circle" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22c55e']} />
        }
      >
        {notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <TouchableOpacity
              key={notification._id || index}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.notificationUnread,
              ]}
              onPress={() => {
                if (!notification.isRead && notification._id) {
                  markAsReadMutation.mutate(notification._id);
                }
              }}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${getNotificationColor(notification.type)}15` },
                ]}
              >
                <Feather
                  name={getNotificationIcon(notification.type)}
                  size={24}
                  color={getNotificationColor(notification.type)}
                />
              </View>

              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
                <Text style={styles.notificationTime}>
                  {formatTime(notification.createdAt)}
                </Text>
              </View>

              {!notification.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
            <Text style={styles.emptySubtext}>
              Các thông báo mới sẽ hiển thị ở đây
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerAction: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationUnread: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});

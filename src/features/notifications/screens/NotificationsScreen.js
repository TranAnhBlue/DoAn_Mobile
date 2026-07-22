import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import api from '../../../shared/api/client';
import { extractItems, getEntityId } from '../../../shared/api/response';
import { formatVietnamDateTime } from '../utils/dateTime';

export default function NotificationsScreen({ navigation }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: async () => {
      try {
        const response = await api.get('/notifications/mine', { params: { PageIndex: 1, PageSize: 100 } });
        return extractItems(response.data);
      } catch (err) {
        if (err?.response?.status === 404) {
          const fallbackRes = await api.get('/notifications', { params: { PageIndex: 1, PageSize: 100 } });
          return extractItems(fallbackRes.data);
        }
        throw err;
      }
    },
  });

  const refreshNotifications = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({ mutationFn: (id) => api.post(`/notifications/${id}/read`), onSuccess: refreshNotifications });
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: refreshNotifications });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Thông báo</Text>
          <Text style={styles.headerSubtitle}>Cập nhật dành riêng cho bạn</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => markAll.mutate()}
          disabled={!query.data?.length || markAll.isPending}
          accessibilityLabel="Đánh dấu tất cả đã đọc"
        >
          <Feather name="check-circle" size={21} color="#fff" />
        </TouchableOpacity>
      </View>
      {query.isError ? <Text style={styles.error}>Không thể tải thông báo. Kéo xuống để thử lại.</Text> : null}
      <FlatList
        data={query.data || []}
        keyExtractor={(item, index) => String(getEntityId(item) || index)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={query.refetch} colors={['#15803d']} />}
        renderItem={({ item }) => {
          const unread = !(item.isRead ?? item.read);
          const id = getEntityId(item);
          return (
            <TouchableOpacity
              style={[styles.card, unread && styles.unread]}
              activeOpacity={0.8}
              onPress={() => {
                if (unread && id) markRead.mutate(id);
                navigation.navigate('NotificationDetail', { notification: item });
              }}
            >
              <View style={styles.icon}>
                <Feather name={unread ? 'bell' : 'check'} size={20} color={unread ? '#15803d' : '#94a3b8'} />
              </View>
              <View style={styles.content}>
                <Text style={styles.title}>{item.title || 'Thông báo'}</Text>
                <Text style={styles.message} numberOfLines={2}>{item.message || item.content || ''}</Text>
                <Text style={styles.date}>{formatVietnamDateTime(item.createdAt || item.sentAt, 'Vừa xong')}</Text>
              </View>
              {unread ? <View style={styles.dot} /> : <Feather name="chevron-right" size={18} color="#cbd5e1" />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!query.isLoading ? (
          <View style={styles.empty}>
            <Feather name="bell-off" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Chưa có thông báo</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  headerSubtitle: { color: '#dcfce7', marginTop: 4, fontSize: 13 },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 96 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 11, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 },
  unread: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  content: { flex: 1 },
  title: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  message: { color: '#475569', lineHeight: 19, marginTop: 4 },
  date: { color: '#94a3b8', fontSize: 11, marginTop: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginLeft: 8 },
  error: { color: '#b91c1c', padding: 16, paddingBottom: 0 },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
});

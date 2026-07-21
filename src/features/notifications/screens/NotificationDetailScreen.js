import { Feather } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import api from '../../../shared/api/client';
import { getEntityId } from '../../../shared/api/response';
import { formatVietnamDateTime } from '../utils/dateTime';

export default function NotificationDetailScreen({ navigation, route }) {
  const notification = route.params?.notification || {};
  const queryClient = useQueryClient();
  const id = getEntityId(notification);
  const unread = !(notification.isRead ?? notification.read);

  useEffect(() => {
    if (!unread || !id) return;

    api.post(`/notifications/${id}/read`)
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
      .catch(() => {});
  }, [id, queryClient, unread]);

  const type = notification.type || notification.notificationType;
  const content = notification.message || notification.content || notification.body || 'Thông báo này không có nội dung.';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()} accessibilityLabel="Quay lại">
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết thông báo</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Feather name="bell" size={28} color="#15803d" />
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{notification.title || 'Thông báo'}</Text>
            {unread ? <View style={styles.newBadge}><Text style={styles.newBadgeText}>Mới</Text></View> : null}
          </View>

          <View style={styles.dateRow}>
            <Feather name="clock" size={15} color="#64748b" />
            <Text style={styles.date}>{formatVietnamDateTime(notification.createdAt || notification.sentAt, 'Không xác định')}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.contentLabel}>Nội dung</Text>
          <Text style={styles.message}>{content}</Text>

          {type ? (
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Loại thông báo</Text>
              <Text style={styles.metaValue}>{type}</Text>
            </View>
          ) : null}

          {notification.senderName || notification.createdByName ? (
            <View style={styles.metaBox}>
              <Text style={styles.metaLabel}>Người gửi</Text>
              <Text style={styles.metaValue}>{notification.senderName || notification.createdByName}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 52, paddingHorizontal: 12, paddingBottom: 15, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, color: '#0f172a', fontSize: 21, lineHeight: 28, fontWeight: '900' },
  newBadge: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  newBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  date: { color: '#64748b', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },
  contentLabel: { color: '#334155', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  message: { color: '#1e293b', fontSize: 16, lineHeight: 25 },
  metaBox: { backgroundColor: '#f8fafc', borderRadius: 11, padding: 12, marginTop: 16 },
  metaLabel: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  metaValue: { color: '#1e293b', fontSize: 14, fontWeight: '700', marginTop: 4 },
});

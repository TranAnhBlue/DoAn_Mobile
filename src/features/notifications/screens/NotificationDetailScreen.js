import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import api from '../../../shared/api/client';
import { getEntityId, unwrapPayload } from '../../../shared/api/response';
import { valueOf } from '../../../shared/utils/data';
import { formatVietnamDateTime } from '../utils/dateTime';

import { useAuthStore } from '../../auth/store/authStore';
import { hasNotificationTarget, navigateToNotificationTarget } from '../utils/notificationRouter';

export default function NotificationDetailScreen({ navigation, route }) {
  const initialNotification = route.params?.notification || {};
  const [notification, setNotification] = useState(initialNotification);

  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || user?.roles?.[0];
  const queryClient = useQueryClient();

  const id = getEntityId(notification) || route.params?.notificationId || route.params?.id;
  const unread = !(notification.isRead ?? notification.read);

  useEffect(() => {
    if (!id) return;

    if (unread) {
      api.post(`/notifications/${id}/read`)
        .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
        .catch(() => {});
    }

    // Fetch latest notification detail if needed
    api.get(`/notifications/${id}`)
      .then((res) => {
        const d = unwrapPayload(res.data) || res.data?.data || res.data;
        if (d && typeof d === 'object') {
          setNotification((prev) => ({ ...prev, ...d }));
        }
      })
      .catch(() => {});
  }, [id, queryClient, unread]);

  const title = valueOf(notification.title, notification.subject, notification.header, 'Thông báo');
  const content = valueOf(
    notification.message,
    notification.content,
    notification.body,
    notification.description,
    notification.text,
    'Thông báo này không có nội dung chi tiết.'
  );
  const senderName = valueOf(
    notification.senderName,
    notification.createdByName,
    notification.sender,
    notification.author,
    notification.createdByUser?.fullName,
    notification.createdByUser?.name,
    notification.creatorName
  );
  const dateStr = formatVietnamDateTime(
    valueOf(notification.createdAt, notification.sentAt, notification.date, notification.createdDate),
    'Vừa xong'
  );

  const hasTarget = hasNotificationTarget(notification);

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
            <Feather name="bell" size={26} color="#15803d" />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {unread ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>Mới</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.dateRow}>
            <Feather name="clock" size={14} color="#64748b" />
            <Text style={styles.date}>{dateStr}</Text>
          </View>

          {senderName ? (
            <View style={styles.metaBox}>
              <Feather name="user" size={14} color="#15803d" />
              <View style={{ flex: 1 }}>
                <Text style={styles.metaLabel}>Người gửi</Text>
                <Text style={styles.metaValue}>{senderName}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.contentLabel}>Nội dung thông báo</Text>
          <Text style={styles.message}>{content}</Text>

          {hasTarget ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigateToNotificationTarget(notification, navigation, userRole)}
            >
              <Feather name="external-link" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Xem chi tiết mục liên quan</Text>
            </TouchableOpacity>
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
  iconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, color: '#0f172a', fontSize: 20, lineHeight: 26, fontWeight: '800' },
  newBadge: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  newBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  date: { color: '#64748b', fontSize: 13 },
  metaBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  metaLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  metaValue: { color: '#0f172a', fontSize: 14, fontWeight: '700', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 18 },
  contentLabel: { color: '#334155', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  message: { color: '#1e293b', fontSize: 15, lineHeight: 24 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#15803d',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 24,
    elevation: 2,
    shadowColor: '#15803d',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});


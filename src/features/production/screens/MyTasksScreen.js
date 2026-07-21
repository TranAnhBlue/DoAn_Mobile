import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../../shared/api/client';
import { extractItems, getApiErrorMessage, getEntityId } from '../../../shared/api/response';
import DailyLogModal from '../components/DailyLogModal';

const STATUS = {
  PENDING: ['Chờ thực hiện', '#64748b'],
  PLANNED: ['Đã lên lịch', '#2563eb'],
  IN_PROGRESS: ['Đang thực hiện', '#15803d'],
  COMPLETED: ['Hoàn thành', '#059669'],
  CANCELLED: ['Đã hủy', '#64748b'],
};

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const dateOf = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa xác định';

export default function MyTasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [entryMode, setEntryMode] = useState('daily');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTasks = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/cultivation-tasks', { params: { PageIndex: 1, PageSize: 100 } });
      setTasks(extractItems(response.data));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải công việc.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTasks(); }, [fetchTasks]));

  const openEntry = (task, mode) => {
    setSelectedTask(task);
    setEntryMode(mode);
    setDescription('');
  };

  const resetEntry = () => {
    Keyboard.dismiss();
    setSelectedTask(null);
    setDescription('');
  };

  const cancelEntry = () => {
    if (saving) return;

    if (!description.trim()) {
      resetEntry();
      return;
    }

    Keyboard.dismiss();
    Alert.alert(
      'Hủy ghi chép?',
      'Nội dung bạn đang nhập sẽ không được lưu.',
      [
        { text: 'Tiếp tục nhập', style: 'cancel' },
        { text: 'Bỏ nội dung', style: 'destructive', onPress: resetEntry },
      ],
    );
  };

  const submitEntry = async () => {
    if (!description.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập nội dung tổng hợp công việc.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/cultivation-tasks/${getEntityId(selectedTask)}/summary`, {
        totalFertilizers: [],
        totalPesticides: [],
        images: [],
        descriptionSummary: description.trim(),
        completedAt: new Date().toISOString(),
      });
      resetEntry();
      Alert.alert('Thành công', 'Đã gửi tổng hợp công việc.');
      fetchTasks();
    } catch (requestError) {
      Alert.alert('Không thể lưu', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const completeTask = (task) => {
    Alert.alert('Hoàn thành công việc', 'Xác nhận công việc này đã hoàn thành?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        onPress: async () => {
          try {
            await api.post(`/cultivation-tasks/${getEntityId(task)}/complete`);
            fetchTasks();
          } catch (requestError) {
            Alert.alert('Không thể hoàn thành', getApiErrorMessage(requestError, 'Vui lòng thử lại.'));
          }
        },
      },
    ]);
  };

  const filteredTasks = filter === 'ALL'
    ? tasks
    : tasks.filter((task) => String(task.status || '').toUpperCase() === filter);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <Text style={styles.headerSubtitle}>Cập nhật tiến độ và ghi chép hằng ngày</Text>
      </View>
      <View style={styles.filters}>
        {[['ALL', 'Tất cả'], ['PLANNED', 'Đã lên lịch'], ['IN_PROGRESS', 'Đang làm'], ['COMPLETED', 'Xong']].map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.filter, filter === key && styles.filterActive]} onPress={() => setFilter(key)}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item, index) => String(getEntityId(item) || index)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} colors={['#15803d']} />}
        renderItem={({ item }) => {
          const state = String(item.status || '').toUpperCase();
          const [label, color] = STATUS[state] || [item.status || 'Không rõ', '#64748b'];
          const canWriteLog = state === 'IN_PROGRESS';
          const canSubmitSummary = state === 'COMPLETED';
          return (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{valueOf(item.taskName, item.name, item.title, 'Công việc canh tác')}</Text>
                <View style={[styles.badge, { backgroundColor: `${color}18` }]}><Text style={[styles.badgeText, { color }]}>{label}</Text></View>
              </View>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              <View style={styles.metaRow}><Feather name="calendar" size={14} color="#64748b" /><Text style={styles.meta}>{dateOf(valueOf(item.dueDate, item.endDate, item.plannedEndDate))}</Text></View>
              <View style={styles.metaRow}><Feather name="map-pin" size={14} color="#64748b" /><Text style={styles.meta}>{valueOf(item.landPlotName, item.landPlot?.name, item.logbookName, 'Chưa có vùng trồng')}</Text></View>
              {canWriteLog || canSubmitSummary ? (
                <View style={styles.actions}>
                  {canWriteLog ? <TouchableOpacity style={[styles.action, styles.logAction]} onPress={() => openEntry(item, 'daily')}><Feather name="edit-3" size={15} color="#fff" /><Text style={styles.actionText}>Ghi chép</Text></TouchableOpacity> : null}
                  {canWriteLog ? <TouchableOpacity style={[styles.action, styles.completeAction]} onPress={() => completeTask(item)}><Feather name="check" size={16} color="#fff" /><Text style={styles.actionText}>Hoàn thành</Text></TouchableOpacity> : null}
                  {canSubmitSummary ? <TouchableOpacity style={[styles.action, styles.logAction]} onPress={() => openEntry(item, 'summary')}><Feather name="file-text" size={15} color="#fff" /><Text style={styles.actionText}>Gửi tổng hợp</Text></TouchableOpacity> : null}
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="check-square" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Không có công việc</Text></View>}
      />

      <DailyLogModal
        visible={Boolean(selectedTask) && entryMode === 'daily'}
        task={selectedTask}
        onClose={resetEntry}
        onSaved={fetchTasks}
      />

      <Modal visible={Boolean(selectedTask) && entryMode === 'summary'} transparent animationType="slide" onRequestClose={cancelEntry}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={cancelEntry} accessibilityLabel="Đóng form ghi chép" />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tổng hợp công việc</Text>
              <TouchableOpacity style={styles.closeButton} onPress={cancelEntry} disabled={saving} accessibilityLabel="Hủy ghi chép">
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTask} numberOfLines={2}>{valueOf(selectedTask?.taskName, selectedTask?.name, selectedTask?.title)}</Text>
            <TextInput style={[styles.input, styles.textarea]} placeholder="Nội dung tổng hợp sau khi hoàn thành" placeholderTextColor="#64748b" multiline value={description} onChangeText={setDescription} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={cancelEntry} disabled={saving}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={submitEntry} disabled={saving}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Gửi tổng hợp</Text>}</TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 52, paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  headerSubtitle: { color: '#dcfce7', marginTop: 4, fontSize: 13 },
  filters: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12, gap: 6 },
  filter: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  filterText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: '#0f172a', fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  description: { color: '#475569', lineHeight: 20, marginTop: 9 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8 },
  meta: { flex: 1, color: '#64748b', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  action: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 10, borderRadius: 10 },
  logAction: { backgroundColor: '#2563eb' },
  completeAction: { backgroundColor: '#15803d' },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 64 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0008' },
  modalCard: { backgroundColor: '#fff', padding: 20, paddingBottom: 30, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  modalTitle: { flex: 1, color: '#0f172a', fontSize: 20, fontWeight: '900' },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalTask: { color: '#15803d', fontWeight: '700', marginTop: 5, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, color: '#0f172a' },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 12 },
  cancelButton: { backgroundColor: '#f1f5f9' },
  saveButton: { backgroundColor: '#15803d' },
  cancelText: { color: '#475569', fontWeight: '800' },
  saveText: { color: '#fff', fontWeight: '800' },
});

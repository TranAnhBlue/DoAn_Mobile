import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import api from '../../../shared/api/client';
import { extractItems, getApiErrorMessage, getEntityId } from '../../../shared/api/response';

const STATUS = {
  PENDING: ['Chờ kích hoạt', '#64748b'],
  PLANNED: ['Chờ kích hoạt', '#64748b'],
  ACTIVE: ['Đang thực hiện', '#15803d'],
  IN_PROGRESS: ['Đang thực hiện', '#15803d'],
  COMPLETED: ['Hoàn thành', '#059669'],
  CANCELLED: ['Đã hủy', '#64748b'],
};

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : null;

export default function PlansAndLogsScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [stages, setStages] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setError('');
    const [tasksResult, stagesResult] = await Promise.allSettled([
      api.get('/cultivation-tasks', { params: { PageIndex: 1, PageSize: 100 } }),
      api.get('/cultivation-stages', { params: { PageIndex: 1, PageSize: 100 } }),
    ]);

    if (tasksResult.status === 'fulfilled') {
      const nextTasks = extractItems(tasksResult.value.data);
      setTasks(nextTasks);
      setExpanded((current) => {
        const next = { ...current };
        nextTasks.forEach((task) => { next[task.cultivationStageId || 'unassigned'] ??= true; });
        return next;
      });
    } else {
      setError(getApiErrorMessage(tasksResult.reason, 'Không thể tải các công việc được giao.'));
    }

    if (stagesResult.status === 'fulfilled') setStages(extractItems(stagesResult.value.data));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const groups = useMemo(() => {
    const stageMap = new Map(stages.map((stage) => [getEntityId(stage), stage]));
    const grouped = new Map();

    tasks.forEach((task) => {
      const stageId = task.cultivationStageId || 'unassigned';
      const stage = stageMap.get(stageId);
      if (!grouped.has(stageId)) {
        grouped.set(stageId, {
          id: stageId,
          name: valueOf(stage?.stageName, task.stageName, stageId === 'unassigned' ? 'Công việc chưa phân giai đoạn' : 'Giai đoạn canh tác'),
          order: stageId === 'unassigned' ? -1 : valueOf(stage?.stageOrder, task.stageOrder, 9999),
          startDate: valueOf(stage?.startDate, task.stageStartDate),
          endDate: valueOf(stage?.endDate, task.stageEndDate),
          tasks: [],
        });
      }
      grouped.get(stageId).tasks.push(task);
    });

    return [...grouped.values()].sort((a, b) => Number(a.order) - Number(b.order));
  }, [stages, tasks]);

  const openTask = (task) => {
    const status = String(task.status || '').toUpperCase();
    if (!['ACTIVE', 'IN_PROGRESS', 'COMPLETED'].includes(status)) return;
    navigation.navigate('MyTasks', { focusTaskId: getEntityId(task) });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Feather name="edit" size={22} color="#16a34a" />
          <Text style={styles.headerTitle}>Công việc của tôi</Text>
        </View>
        <View style={styles.titleUnderline} />
        <View style={styles.headerSubtitleRow}><Feather name="clock" size={15} color="#16a34a" /><Text style={styles.headerSubtitle}>Các giai đoạn và công việc được giao</Text></View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={groups}
        keyExtractor={(group) => String(group.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} colors={['#15803d']} />}
        renderItem={({ item: group, index }) => {
          const isExpanded = expanded[group.id] !== false;
          const range = [dateLabel(group.startDate), dateLabel(group.endDate)].filter(Boolean).join(' – ') || '—';
          return (
            <View style={styles.groupCard}>
              <TouchableOpacity style={styles.groupHeader} onPress={() => setExpanded((current) => ({ ...current, [group.id]: !isExpanded }))}>
                <View style={styles.groupNumber}><Text style={styles.groupNumberText}>{group.order >= 0 && group.order < 9999 ? group.order : index + 1}</Text></View>
                <View style={styles.groupText}><Text style={styles.groupName}>{group.name}</Text><Text style={styles.groupDate}>{range}</Text></View>
                <View style={styles.countBadge}><Text style={styles.countText}>{group.tasks.length} công việc</Text></View>
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#475569" />
              </TouchableOpacity>

              {isExpanded ? <View style={styles.taskList}>{group.tasks.map((task) => {
                const status = String(task.status || '').toUpperCase();
                const [statusLabel, color] = STATUS[status] || [task.status || 'Không rõ', '#64748b'];
                const canOpen = ['ACTIVE', 'IN_PROGRESS', 'COMPLETED'].includes(status);
                return (
                  <TouchableOpacity key={getEntityId(task)} style={[styles.taskRow, canOpen && styles.taskRowOpen]} activeOpacity={canOpen ? 0.7 : 1} onPress={() => openTask(task)} disabled={!canOpen}>
                    <View style={[styles.taskIcon, canOpen && styles.taskIconOpen]}><Feather name={status === 'COMPLETED' ? 'check' : 'clock'} size={15} color={canOpen ? '#15803d' : '#64748b'} /></View>
                    <View style={styles.taskText}><Text style={styles.taskName}>{valueOf(task.name, task.taskName, 'Công việc')}</Text><Text style={styles.taskDescription} numberOfLines={2}>{valueOf(task.description, 'Chưa có mô tả')}</Text></View>
                    <View style={styles.taskActions}>
                      <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}><Text style={[styles.statusText, { color }]}>{statusLabel}</Text></View>
                      <View style={[styles.openBadge, !canOpen && styles.openBadgeDisabled]}><Text style={[styles.openText, !canOpen && styles.openTextDisabled]}>{canOpen ? 'Mở' : 'Chưa mở'}</Text></View>
                    </View>
                  </TouchableOpacity>
                );
              })}</View> : null}
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="check-square" size={48} color="#cbd5e1" /><Text style={styles.emptyText}>Chưa có công việc được giao</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fa' },
  header: { backgroundColor: '#f6f8fa', paddingTop: 52, paddingHorizontal: 18, paddingBottom: 14 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: '#16a34a', fontSize: 23, fontWeight: '900' },
  titleUnderline: { width: 208, height: 1, backgroundColor: '#dfe5e1', marginTop: 10 },
  headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17 },
  headerSubtitle: { color: '#1e293b', fontSize: 13, fontWeight: '800' },
  list: { paddingHorizontal: 14, paddingBottom: 96 },
  groupCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 13, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f2f3', elevation: 1, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  groupNumber: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  groupNumberText: { color: '#15803d', fontWeight: '900' },
  groupText: { flex: 1 },
  groupName: { color: '#1e293b', fontSize: 14, fontWeight: '900' },
  groupDate: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  countBadge: { backgroundColor: '#dbeafe', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8 },
  countText: { color: '#2563eb', fontSize: 10, fontWeight: '800' },
  taskList: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingHorizontal: 10, paddingBottom: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  taskRowOpen: { backgroundColor: '#fbfffc' },
  taskIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  taskIconOpen: { backgroundColor: '#dcfce7' },
  taskText: { flex: 1, marginRight: 7 },
  taskName: { color: '#0f172a', fontSize: 13, fontWeight: '900' },
  taskDescription: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 3 },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  statusText: { fontSize: 9, fontWeight: '800' },
  openBadge: { borderWidth: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  openBadgeDisabled: { borderColor: '#d1d5db', backgroundColor: '#f8fafc' },
  openText: { color: '#15803d', fontSize: 9, fontWeight: '900' },
  openTextDisabled: { color: '#94a3b8' },
  error: { color: '#b91c1c', paddingHorizontal: 16, paddingTop: 12 },
  empty: { alignItems: 'center', paddingTop: 70 },
  emptyText: { color: '#94a3b8', marginTop: 12, fontWeight: '600' },
});

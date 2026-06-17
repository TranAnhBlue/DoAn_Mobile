import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../api/api';

const PRIORITY_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  URGENT: '#dc2626',
};

const PRIORITY_LABELS = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};

const STATUS_COLORS = {
  PENDING: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  COMPLETED: '#16a34a',
  CANCELLED: '#64748b',
};

const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function MyTasksScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, IN_PROGRESS, COMPLETED

  const fetchTasks = useCallback(async () => {
    try {
      const response = await api.get('/tasks/my-tasks');
      if (response.data?.success) {
        setTasks(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch My Tasks Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const handleStartTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/start`);
      fetchTasks();
    } catch (error) {
      console.error('Start Task Error:', error);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/complete`);
      fetchTasks();
    } catch (error) {
      console.error('Complete Task Error:', error);
    }
  };

  const filteredTasks = filter === 'ALL' 
    ? tasks 
    : tasks.filter(task => task.status === filter);

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[item.priority]}20` }]}>
          <Text style={[styles.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>
            {PRIORITY_LABELS[item.priority]}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[item.status]}20` }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.taskTitle}>{item.title}</Text>
      {item.description && (
        <Text style={styles.taskDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.taskMeta}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={14} color="#64748b" />
          <Text style={styles.metaText}>
            {new Date(item.dueDate).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        {item.landPlotName && (
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={14} color="#64748b" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.landPlotName}
            </Text>
          </View>
        )}
      </View>

      {item.status === 'PENDING' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.startButton]}
          onPress={() => handleStartTask(item.id)}
        >
          <Feather name="play" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Bắt đầu</Text>
        </TouchableOpacity>
      )}

      {item.status === 'IN_PROGRESS' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => handleCompleteTask(item.id)}
        >
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Hoàn thành</Text>
        </TouchableOpacity>
      )}
    </View>
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.filterContainer}>
        {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterButton, filter === status && styles.filterButtonActive]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.filterTextActive]}>
              {status === 'ALL' ? 'Tất cả' : STATUS_LABELS[status]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Không có công việc nào</Text>
          </View>
        }
      />
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
    backgroundColor: '#27c65a',
    paddingTop: 42,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startButton: {
    backgroundColor: '#3b82f6',
  },
  completeButton: {
    backgroundColor: '#16a34a',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
});

import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/api';
import {
  CATEGORY_GROUPS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  getCategoryGroup,
  getFullCategoryName
} from '../constants/categories';
import { useAuthStore } from '../store/authStore';

const STATUS_CONFIG = {
  Draft:    { label: 'Lưu nháp',   color: '#3b82f6', bg: '#eff6ff' },
  Submitted:{ label: 'Chờ duyệt',  color: '#f97316', bg: '#fff7ed' },
  Verified: { label: 'Đã duyệt',   color: '#16a34a', bg: '#f0fdf4' },
  Locked:   { label: 'Đã khóa',    color: '#6b7280', bg: '#f9fafb' },
};

function StatusBadge({ status, feedback }) {
  // "Cần sửa" nếu có feedback và đang nháp
  if (feedback && (status === 'Draft')) {
    return (
      <View style={[styles.badge, { backgroundColor: '#fef2f2' }]}>
        <Feather name="alert-circle" size={11} color="#ef4444" />
        <Text style={[styles.badgeText, { color: '#ef4444' }]}>CẦN SỬA LẠI</Text>
      </View>
    );
  }
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Draft;
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
    </View>
  );
}

export default function JournalListScreen({ navigation }) {
  const user = useAuthStore((state) => state.user);

  // ─── Category State ───
  const [activeGroup, setActiveGroup]     = useState('vietgap');
  const [activeCategory, setActiveCategory] = useState('trongtrot');

  // ─── Data State ───
  const [journals, setJournals]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // ─── Filter State ───
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy]         = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Modal State ───
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailJournal, setDetailJournal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Schemas for creating new journal ───
  const [schemas, setSchemas]             = useState([]);
  const [schemaModal, setSchemaModal]     = useState(false);

  const fetchJournals = async () => {
    try {
      const params = {};
      if (activeCategory && activeCategory !== 'all') {
        params.category = activeCategory;
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      // Add sorting
      const sortOption = SORT_OPTIONS.find(s => s.key === sortBy);
      if (sortOption) {
        params.sortBy = sortOption.field;
        params.sortOrder = sortOption.order;
      }

      const { data } = await api.get('/journals', { params });
      if (data.success) setJournals(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSchemas = async () => {
    try {
      const params = {};
      if (activeCategory && activeCategory !== 'all') {
        params.category = activeCategory;
      }
      const { data } = await api.get('/schemas', { params });
      if (data.success) setSchemas(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [activeCategory, statusFilter, sortBy]);

  useEffect(() => {
    fetchSchemas();
  }, [activeCategory]);

  const onRefresh = () => { setRefreshing(true); fetchJournals(); };

  // ─── Helper Functions ───
  const handleGroupChange = (groupKey) => {
    setActiveGroup(groupKey);
    const group = Object.values(CATEGORY_GROUPS).find(g => g.key === groupKey);
    if (group && group.categories.length > 0) {
      setActiveCategory(group.categories[0].key);
    }
  };

  const cycleSortOption = () => {
    const currentIndex = SORT_OPTIONS.findIndex(s => s.key === sortBy);
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    setSortBy(SORT_OPTIONS[nextIndex].key);
  };

  // ─── Filter ───
  const filtered = journals.filter(j => {
    const name  = (j.schemaId?.name || '').toLowerCase();
    const qr    = (j.qrCode || '').toLowerCase();
    const sText = search.toLowerCase();
    if (search && !name.includes(sText) && !qr.includes(sText)) return false;
    return true;
  });

  // ─── Open Detail ───
  const openDetail = async (id) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const { data } = await api.get(`/journals/${id}`);
      if (data.success) setDetailJournal(data.data);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải chi tiết nhật ký');
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Submit for approval ───
  const handleSubmit = async (id) => {
    Alert.alert('Xác nhận', 'Gửi nhật ký lên để duyệt?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gửi duyệt', style: 'default',
        onPress: async () => {
          try {
            await api.put(`/journals/${id}`, { status: 'Submitted' });
            Alert.alert('Thành công', 'Đã gửi nhật ký để duyệt!');
            fetchJournals();
          } catch (e) {
            Alert.alert('Lỗi', e.response?.data?.message || 'Không thể gửi duyệt');
          }
        }
      }
    ]);
  };

  // ─── Navigate to create new journal ───
  const handleCreate = (schemaId) => {
    setSchemaModal(false);
    navigation.navigate('JournalEntry', { 
      schemaId,
      category: activeCategory,
      group: activeGroup
    });
  };

  const renderJournal = ({ item }) => {
    const group = getCategoryGroup(item.schemaId?.category);
    const categoryName = getFullCategoryName(item.schemaId?.category);
    const groupColor = group?.color || '#16a34a';
    
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item._id)} activeOpacity={0.85}>
        {/* Left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: groupColor }]} />

        <View style={styles.cardBody}>
          {/* Header row with icon */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardIcon, { backgroundColor: `${groupColor}18` }]}>
              <Feather name={group?.icon || 'book'} size={20} color={groupColor} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardSchemaName} numberOfLines={2}>
                {item.schemaId?.name || 'Nhật ký'}
              </Text>
              <Text style={styles.cardCategory}>{categoryName}</Text>
            </View>
            <StatusBadge status={item.status} feedback={item.feedback} />
          </View>

          {/* Meta */}
          <View style={styles.metaRow}>
            <Feather name={item.htxJournalId ? 'users' : 'user'} size={12} color="#94a3b8" />
            <Text style={styles.metaText}>
              {item.htxJournalId ? 'Sổ HTX' : 'Sổ cá nhân'}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Feather name="calendar" size={12} color="#94a3b8" />
            <Text style={styles.metaText}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>

          {/* Feedback warning */}
          {item.feedback && item.status === 'Draft' && (
            <View style={styles.feedbackBox}>
              <Feather name="alert-triangle" size={12} color="#ef4444" />
              <Text style={styles.feedbackText} numberOfLines={2}>{item.feedback}</Text>
            </View>
          )}

          {/* Progress bar */}
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${item.progress || 0}%`, backgroundColor: groupColor }]} />
            </View>
            <Text style={styles.progressLabel}>{item.progress || 0}%</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            {item.status === 'Draft' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#dbeafe' }]}
                  onPress={() => navigation.navigate('JournalEntry', { 
                    journalId: item._id, 
                    schemaId: item.schemaId?._id,
                    category: item.schemaId?.category
                  })}
                >
                  <Feather name="edit-3" size={13} color="#3b82f6" />
                  <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Viết</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#fef3c7' }]}
                  onPress={() => handleSubmit(item._id)}
                >
                  <Feather name="send" size={13} color="#d97706" />
                  <Text style={[styles.actionBtnText, { color: '#d97706' }]}>Gửi duyệt</Text>
                </TouchableOpacity>
              </>
            )}
            {(item.status === 'Verified' || item.status === 'Locked') && item.qrCode && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f0fdf4' }]}
                onPress={() => navigation.navigate('TraceDetail', { qrCode: item.qrCode })}
              >
                <Feather name="maximize" size={13} color="#16a34a" />
                <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>QR Code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#f1f5f9' }]}
              onPress={() => openDetail(item._id)}
            >
              <Feather name="eye" size={13} color="#64748b" />
              <Text style={[styles.actionBtnText, { color: '#64748b' }]}>Chi tiết</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Sổ nhật ký sản xuất</Text>
          <Text style={styles.headerSub}>{filtered.length} sổ · {user?.fullname || user?.username}</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setSchemaModal(true)}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Category Group Tabs */}
      <View style={styles.groupTabsContainer}>
        {Object.values(CATEGORY_GROUPS).map(group => {
          const isActive = activeGroup === group.key;
          return (
            <TouchableOpacity
              key={group.key}
              style={[
                styles.groupTab,
                isActive && { borderBottomColor: group.color, borderBottomWidth: 3 }
              ]}
              onPress={() => handleGroupChange(group.key)}
            >
              <Feather name={group.icon} size={18} color={isActive ? group.color : '#9ca3af'} />
              <Text style={[
                styles.groupTabText,
                isActive && { color: group.color, fontWeight: '700' }
              ]}>
                {group.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Category Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryChipsScroll}
        contentContainerStyle={styles.categoryChipsContent}
      >
        {CATEGORY_GROUPS[activeGroup].categories.map(cat => {
          const isActive = activeCategory === cat.key;
          const group = CATEGORY_GROUPS[activeGroup];
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                isActive && { 
                  backgroundColor: `${group.color}20`,
                  borderColor: group.color 
                }
              ]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={[
                styles.categoryChipText,
                isActive && { color: group.color, fontWeight: '700' }
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search + Filter Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên sổ, mã QR..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Feather name="filter" size={18} color="#6b7280" />
            <Text style={styles.filterButtonText}>Lọc</Text>
            {statusFilter !== 'all' && <View style={styles.filterBadge} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={cycleSortOption}
          >
            <Feather name="arrow-down" size={18} color="#6b7280" />
            <Text style={styles.filterButtonText}>
              {SORT_OPTIONS.find(s => s.key === sortBy)?.label || 'Sắp xếp'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters Panel (Collapsible) */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filtersPanelTitle}>Trạng thái</Text>
          <View style={styles.statusFilters}>
            {STATUS_OPTIONS.map(status => (
              <TouchableOpacity
                key={status.key}
                style={[
                  styles.statusChip,
                  statusFilter === status.key && {
                    backgroundColor: `${status.color}20`,
                    borderColor: status.color
                  }
                ]}
                onPress={() => setStatusFilter(status.key)}
              >
                <Text style={[
                  styles.statusChipText,
                  statusFilter === status.key && { 
                    color: status.color,
                    fontWeight: '700'
                  }
                ]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          renderItem={renderJournal}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Feather name="book" size={48} color="#e2e8f0" />
              <Text style={styles.emptyText}>Chưa có sổ nhật ký nào</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setSchemaModal(true)}>
                <Text style={styles.emptyBtnText}>Tạo sổ đầu tiên</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Schema picker modal ── */}
      <Modal visible={schemaModal} animationType="slide" transparent onRequestClose={() => setSchemaModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn loại sổ nhật ký</Text>
              <TouchableOpacity onPress={() => setSchemaModal(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={schemas}
              keyExtractor={s => s._id}
              renderItem={({ item: s }) => {
                const group = getCategoryGroup(s.category);
                const groupColor = group?.color || '#16a34a';
                const categoryLabel = getFullCategoryName(s.category);
                
                return (
                  <TouchableOpacity
                    style={styles.schemaItem}
                    onPress={() => handleCreate(s._id)}
                  >
                    <View style={[styles.schemaIcon, { backgroundColor: `${groupColor}18` }]}>
                      <Feather name={group?.icon || 'file-text'} size={20} color={groupColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.schemaName}>{s.name}</Text>
                      <Text style={styles.schemaCat}>{categoryLabel || 'Quy trình canh tác'}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color="#cbd5e1" />
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 30 }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: '#94a3b8', marginTop: 30 }}>
                  Không có mẫu quy trình nào.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── Detail modal ── */}
      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết nhật ký</Text>
              <TouchableOpacity onPress={() => { setDetailVisible(false); setDetailJournal(null); }}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            {detailLoading ? (
              <ActivityIndicator size="large" color="#16a34a" style={{ margin: 40 }} />
            ) : detailJournal ? (
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                {/* Status */}
                <StatusBadge status={detailJournal.status} feedback={detailJournal.feedback} />

                {/* Info rows */}
                {[
                  { label: 'Quy trình', value: detailJournal.schemaId?.name },
                  { label: 'Mã QR', value: detailJournal.qrCode },
                  { label: 'Ngày tạo', value: new Date(detailJournal.createdAt).toLocaleDateString('vi-VN') },
                  { label: 'Số lần sửa', value: `${detailJournal.editCount || 0} lần` },
                  { label: 'Tiến độ', value: `${detailJournal.progress || 0}%` },
                ].map(row => (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value || '---'}</Text>
                  </View>
                ))}

                {/* Feedback */}
                {detailJournal.feedback && (
                  <View style={styles.feedbackBoxLarge}>
                    <Feather name="alert-circle" size={16} color="#ef4444" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: 4 }}>Phản hồi từ Admin:</Text>
                      <Text style={{ color: '#dc2626' }}>{detailJournal.feedback}</Text>
                    </View>
                  </View>
                )}

                {/* Edit and Submit buttons if Draft */}
                {detailJournal.status === 'Draft' && (
                  <>
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={() => { 
                        setDetailVisible(false); 
                        navigation.navigate('JournalEntry', { 
                          journalId: detailJournal._id, 
                          schemaId: detailJournal.schemaId?._id 
                        }); 
                      }}
                    >
                      <Feather name="edit-3" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>Chỉnh sửa nhật ký</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={() => { setDetailVisible(false); handleSubmit(detailJournal._id); }}
                    >
                      <Feather name="send" size={16} color="#fff" />
                      <Text style={styles.submitBtnText}>Gửi duyệt nhật ký</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* QR trace button if verified */}
                {(detailJournal.status === 'Verified' || detailJournal.status === 'Locked') && detailJournal.qrCode && (
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#3b82f6' }]}
                    onPress={() => { setDetailVisible(false); navigation.navigate('TraceDetail', { qrCode: detailJournal.qrCode }); }}
                  >
                    <Feather name="maximize" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Xem truy xuất QR</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  /* Header */
  header: {
    padding: 20, paddingTop: 50, backgroundColor: '#fff',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  headerSub:   { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  createBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },

  /* Category Group Tabs */
  groupTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  groupTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  groupTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },

  /* Category Chips */
  categoryChipsScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryChipsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },

  /* Filter Bar */
  filterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 10, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1e293b' },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginLeft: 4,
  },

  /* Filters Panel */
  filtersPanel: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filtersPanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },

  /* Card */
  list: { padding: 14 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 14,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: 14 },
  cardHeaderRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    marginBottom: 8 
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  cardSchemaName: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#1e293b',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },

  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: 'bold', marginLeft: 3 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metaText: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  metaDot:  { fontSize: 12, color: '#cbd5e1', marginHorizontal: 6 },

  feedbackBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fef2f2',
    borderRadius: 8, padding: 8, marginBottom: 8,
  },
  feedbackText: { fontSize: 12, color: '#ef4444', marginLeft: 6, flex: 1, fontStyle: 'italic' },

  progressRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  progressTrack:{ flex: 1, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginRight: 8 },
  progressFill: { height: 4, borderRadius: 2 },
  progressLabel:{ fontSize: 11, color: '#94a3b8', fontWeight: '600', width: 30, textAlign: 'right' },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyBox:    { alignItems: 'center', marginTop: 60 },
  emptyText:   { color: '#94a3b8', fontSize: 15, marginTop: 12 },
  emptyBtn:    { marginTop: 16, backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText:{ color: '#fff', fontWeight: 'bold' },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },

  schemaItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  schemaIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  schemaName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  schemaCat:  { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  /* Detail */
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  detailLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#1e293b', fontWeight: 'bold', textAlign: 'right', flex: 1, marginLeft: 16 },

  feedbackBoxLarge: {
    flexDirection: 'row', backgroundColor: '#fef2f2', borderRadius: 12, padding: 14, marginTop: 16,
  },
  submitBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#16a34a', borderRadius: 14, padding: 16, marginTop: 16,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 8 },
});

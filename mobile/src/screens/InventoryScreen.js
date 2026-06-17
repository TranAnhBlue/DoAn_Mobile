import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
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

const CATEGORIES = ['Phân bón', 'Thuốc BVTV', 'Thuốc thú y', 'Thuốc thủy sản', 'Giống', 'Thức ăn', 'Khác'];
const UNITS = ['kg', 'lít', 'bao', 'gói', 'lọ', 'viên', 'chai'];

function StockTag({ qty, min = 10 }) {
  if (qty === 0)  return <View style={[styles.stockTag, { backgroundColor: '#fef2f2' }]}><Text style={[styles.stockText, { color: '#ef4444' }]}>Hết hàng</Text></View>;
  if (qty <= min) return <View style={[styles.stockTag, { backgroundColor: '#fff7ed' }]}><Text style={[styles.stockText, { color: '#f97316' }]}>Sắp hết</Text></View>;
  return           <View style={[styles.stockTag, { backgroundColor: '#f0fdf4' }]}><Text style={[styles.stockText, { color: '#16a34a' }]}>Sẵn có</Text></View>;
}

export default function InventoryScreen() {
  const [inventory, setInventory]       = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [tab, setTab]                   = useState('stock'); // 'stock' | 'history'
  const [search, setSearch]             = useState('');
  const [addModal, setAddModal]         = useState(false);

  // Form fields for adding external supply
  const [form, setForm] = useState({ name: '', category: '', unit: '', quantity: '', minQuantity: '10' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    try {
      const [invRes, txRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/inventory/transactions'),
      ]);
      if (invRes.data.success)  setInventory(invRes.data.data || []);
      if (txRes.data.success)   setTransactions(txRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const filtered = inventory.filter(i =>
    (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalItems   = inventory.length;
  const lowStockItems = inventory.filter(i => i.quantity <= (i.minQuantity || 10)).length;

  // Submit declare external supply
  const handleAddExternal = async () => {
    if (!form.name || !form.category || !form.unit || !form.quantity) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ tên, phân loại, đơn vị và số lượng.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory/add', {
        name: form.name,
        category: form.category,
        unit: form.unit,
        quantity: Number(form.quantity),
        minQuantity: Number(form.minQuantity || 10),
        note: 'Tự mua ngoài / Tự túc (Nông dân độc lập)',
      });
      Alert.alert('Thành công', 'Đã thêm vật tư vào kho!');
      setAddModal(false);
      setForm({ name: '', category: '', unit: '', quantity: '', minQuantity: '10' });
      fetchAll();
    } catch (e) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể thêm vật tư');
    } finally {
      setSubmitting(false);
    }
  };

  const txTypeConfig = {
    Import:     { label: 'Nhập kho',        color: '#3b82f6', icon: 'arrow-down',  sign: '+' },
    Distribute: { label: 'HTX cấp phát',    color: '#8b5cf6', icon: 'arrow-down',  sign: '+' },
    Export:     { label: 'Đã sử dụng',      color: '#f97316', icon: 'arrow-up',    sign: '-' },
  };

  const renderStock = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardIconBox}>
        <Feather
          name={item.category === 'Phân bón' ? 'droplet' : 'box'}
          size={22}
          color="#16a34a"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCat}>{item.category}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.itemQty}>{item.quantity} <Text style={styles.itemUnit}>{item.unit}</Text></Text>
        <StockTag qty={item.quantity} min={item.minQuantity} />
      </View>
    </View>
  );

  const renderTx = ({ item }) => {
    const cfg = txTypeConfig[item.type] || { label: item.type, color: '#6b7280', sign: '', icon: 'activity' };
    const isPos = item.type !== 'Export';
    return (
      <View style={styles.txCard}>
        <View style={[styles.txIcon, { backgroundColor: cfg.color + '18' }]}>
          <Feather name={cfg.icon} size={16} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.txItem}>{item.itemId?.name || '---'}</Text>
          <Text style={styles.txType}>{cfg.label}</Text>
          <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Text style={[styles.txQty, { color: isPos ? '#16a34a' : '#f97316' }]}>
          {cfg.sign}{item.quantity} {item.itemId?.unit}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kho vật tư sản xuất</Text>
          <Text style={styles.headerSub}>Quản lý vật tư canh tác của bạn</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
          <Feather name="package" size={20} color="#16a34a" />
          <Text style={styles.statNum}>{totalItems}</Text>
          <Text style={styles.statLbl}>Loại vật tư</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
          <Feather name="alert-triangle" size={20} color="#f97316" />
          <Text style={[styles.statNum, { color: '#f97316' }]}>{lowStockItems}</Text>
          <Text style={styles.statLbl}>Sắp hết</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'stock' && styles.tabBtnActive]} onPress={() => setTab('stock')}>
          <Feather name="package" size={14} color={tab === 'stock' ? '#16a34a' : '#94a3b8'} />
          <Text style={[styles.tabText, tab === 'stock' && styles.tabTextActive]}>Tồn kho</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]} onPress={() => setTab('history')}>
          <Feather name="clock" size={14} color={tab === 'history' ? '#16a34a' : '#94a3b8'} />
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>Lịch sử</Text>
        </TouchableOpacity>
      </View>

      {/* Search (stock tab only) */}
      {tab === 'stock' && (
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm vật tư..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      )}

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
      ) : tab === 'stock' ? (
        <FlatList
          data={filtered}
          keyExtractor={i => i._id}
          renderItem={renderStock}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="package" size={44} color="#e2e8f0" />
              <Text style={styles.emptyText}>Kho trống, chưa có vật tư nào</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={i => i._id}
          renderItem={renderTx}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="clock" size={44} color="#e2e8f0" />
              <Text style={styles.emptyText}>Chưa có lịch sử giao dịch</Text>
            </View>
          }
        />
      )}

      {/* ── Add External Supply Modal ── */}
      <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Khai báo vật tư mua ngoài</Text>
                <TouchableOpacity onPress={() => setAddModal(false)}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {/* Name */}
                <Text style={styles.formLabel}>Tên vật tư</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="VD: Phân NPK 20-20-15..."
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                />

                {/* Category */}
                <Text style={styles.formLabel}>Phân loại</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.selectChip, form.category === cat && styles.selectChipActive]}
                      onPress={() => setForm(f => ({ ...f, category: cat }))}
                    >
                      <Text style={[styles.selectChipText, form.category === cat && styles.selectChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Unit */}
                <Text style={styles.formLabel}>Đơn vị tính</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {UNITS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.selectChip, form.unit === u && styles.selectChipActive]}
                      onPress={() => setForm(f => ({ ...f, unit: u }))}
                    >
                      <Text style={[styles.selectChipText, form.unit === u && styles.selectChipTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Quantity */}
                <Text style={styles.formLabel}>Số lượng mua</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Nhập số lượng..."
                  keyboardType="numeric"
                  value={form.quantity}
                  onChangeText={v => setForm(f => ({ ...f, quantity: v }))}
                />

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleAddExternal}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <><Feather name="check" size={18} color="#fff" /><Text style={styles.submitBtnText}>Lưu vào kho</Text></>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    padding: 20, paddingTop: 50, backgroundColor: '#fff',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  headerSub:   { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#16a34a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },

  statsRow:    { flexDirection: 'row', padding: 14, gap: 14 },
  statCard:    { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  statNum:     { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginTop: 6 },
  statLbl:     { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '500' },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 16,
  },
  tabBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#16a34a' },
  tabText:      { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  tabTextActive:{ color: '#16a34a' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9',
    borderRadius: 10, marginHorizontal: 14, marginTop: 12, marginBottom: 4, paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1e293b' },

  list: { padding: 14 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
  },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  itemCat:  { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemQty:  { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
  itemUnit: { fontSize: 12, color: '#94a3b8', fontWeight: 'normal' },

  stockTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  stockText:{ fontSize: 11, fontWeight: 'bold' },

  txCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  txIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  txItem: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  txType: { fontSize: 12, color: '#64748b', marginTop: 2 },
  txDate: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  txQty:  { fontSize: 15, fontWeight: 'bold' },

  empty:     { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 14, marginTop: 12 },

  /* Modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },

  formLabel: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  formInput: {
    backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#1e293b', marginBottom: 14,
  },

  selectChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', marginRight: 8,
  },
  selectChipActive:     { backgroundColor: '#16a34a' },
  selectChipText:       { fontSize: 13, color: '#64748b', fontWeight: '600' },
  selectChipTextActive: { color: '#fff' },

  submitBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#16a34a', borderRadius: 14, padding: 16, marginTop: 8, gap: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

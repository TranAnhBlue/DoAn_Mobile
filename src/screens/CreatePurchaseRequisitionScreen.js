import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../api/api';

export default function CreatePurchaseRequisitionScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await api.get('/materials');
      if (response.data?.success) {
        setMaterials(response.data.data || []);
      }
    } catch (error) {
      console.error('Fetch Materials Error:', error);
    }
  };

  const addItem = (material) => {
    if (selectedItems.find(item => item.materialId === material.id)) {
      Alert.alert('Thông báo', 'Vật tư này đã được thêm vào danh sách');
      return;
    }
    setSelectedItems([
      ...selectedItems,
      {
        materialId: material.id,
        materialName: material.name,
        unit: material.unit,
        quantity: '1',
        estimatedPrice: '',
      },
    ]);
  };

  const removeItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index, quantity) => {
    const updated = [...selectedItems];
    updated[index].quantity = quantity;
    setSelectedItems(updated);
  };

  const updateItemPrice = (index, price) => {
    const updated = [...selectedItems];
    updated[index].estimatedPrice = price;
    setSelectedItems(updated);
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một vật tư');
      return;
    }

    const invalidItems = selectedItems.filter(
      item => !item.quantity || parseFloat(item.quantity) <= 0
    );
    if (invalidItems.length > 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số lượng hợp lệ cho tất cả vật tư');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        items: selectedItems.map(item => ({
          materialId: item.materialId,
          quantity: parseFloat(item.quantity),
          estimatedPrice: item.estimatedPrice ? parseFloat(item.estimatedPrice) : 0,
        })),
        notes: notes || undefined,
      };

      await api.post('/purchase-requisitions', payload);
      Alert.alert('Thành công', 'Đã tạo yêu cầu mua hàng!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEstimate = selectedItems.reduce((sum, item) => {
    const price = parseFloat(item.estimatedPrice) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return sum + (price * qty);
  }, 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo yêu cầu mua hàng</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Selected Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danh sách vật tư yêu cầu</Text>
          {selectedItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={32} color="#cbd5e1" />
              <Text style={styles.emptyText}>Chưa có vật tư nào được chọn</Text>
            </View>
          ) : (
            selectedItems.map((item, index) => (
              <View key={index} style={styles.selectedItem}>
                <View style={styles.selectedItemHeader}>
                  <Text style={styles.selectedItemName}>{item.materialName}</Text>
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <Feather name="x" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.selectedItemInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Số lượng</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={item.quantity}
                      onChangeText={(text) => updateItemQuantity(index, text)}
                    />
                    <Text style={styles.inputUnit}>{item.unit}</Text>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Giá ước tính</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={item.estimatedPrice}
                      onChangeText={(text) => updateItemPrice(index, text)}
                    />
                    <Text style={styles.inputUnit}>đ</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Add Materials */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thêm vật tư</Text>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm vật tư..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {filteredMaterials.map((material) => (
            <TouchableOpacity
              key={material.id}
              style={styles.materialItem}
              onPress={() => addItem(material)}
            >
              <View style={styles.materialIcon}>
                <Feather name="package" size={20} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.materialName}>{material.name}</Text>
                <Text style={styles.materialCategory}>{material.category}</Text>
              </View>
              <Feather name="plus-circle" size={24} color="#16a34a" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Nhập ghi chú (tùy chọn)..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Summary */}
        {selectedItems.length > 0 && (
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng số vật tư:</Text>
              <Text style={styles.summaryValue}>{selectedItems.length} loại</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tổng ước tính:</Text>
              <Text style={[styles.summaryValue, styles.totalAmount]}>
                {totalEstimate.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || selectedItems.length === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="send" size={18} color="#fff" />
              <Text style={styles.submitButtonText}>Gửi yêu cầu</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  selectedItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedItemName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    flex: 1,
  },
  selectedItemInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputUnit: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  materialIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },
  materialCategory: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 100,
  },
  summary: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '900',
  },
  totalAmount: {
    fontSize: 18,
    color: '#16a34a',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});

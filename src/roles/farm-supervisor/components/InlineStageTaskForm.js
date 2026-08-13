import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { extractItems, getApiErrorMessage, getEntityId } from '../../../shared/api/response';
import { valueOf } from '../../../shared/utils/data';
import supervisorApi from '../api/supervisorApi';

export default function InlineStageTaskForm({ planId, stageId, cropId, cropCatalogId, users = [], onSuccess, onCancel }) {
  const [items, setItems] = useState([
    { id: '1', name: '', description: '', leaderId: null, farmerIds: [] }
  ]);
  const [catalogs, setCatalogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeCatalogIndex, setActiveCatalogIndex] = useState(null);

  // Selector modal states
  const [leaderPicker, setLeaderPicker] = useState({ visible: false, itemIndex: null });
  const [farmerPicker, setFarmerPicker] = useState({ visible: false, itemIndex: null });

  // Filter leaders and farmers
  const leaders = useMemo(() => {
    return users.filter((u) => {
      const roles = (u.roles || u.roleNames || [u.role]).map((r) => String(r || '').toUpperCase());
      return roles.includes('FARM_LEADER') || roles.includes('FARMER_LEADER') || roles.includes('LEADER');
    });
  }, [users]);

  const farmers = useMemo(() => {
    return users.filter((u) => {
      const roles = (u.roles || u.roleNames || [u.role]).map((r) => String(r || '').toUpperCase());
      return roles.includes('FARMER') || roles.includes('USER') || !roles.length;
    });
  }, [users]);

  useEffect(() => {
    const params = {};
    if (cropId) params.CropId = cropId;
    if (cropCatalogId) params.CropCatalogId = cropCatalogId;

    supervisorApi.getTaskCatalogs(params)
      .then((res) => {
        const fetched = extractItems(res.data) || [];
        if (fetched.length === 0 && (cropId || cropCatalogId)) {
          supervisorApi.getTaskCatalogs({})
            .then((r) => setCatalogs(extractItems(r.data) || []))
            .catch(() => setCatalogs([]));
        } else {
          setCatalogs(fetched);
        }
      })
      .catch(() => {
        supervisorApi.getTaskCatalogs({})
          .then((r) => setCatalogs(extractItems(r.data) || []))
          .catch(() => setCatalogs([]));
      });
  }, [cropId, cropCatalogId]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', description: '', leaderId: null, farmerIds: [] }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateItemField = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSelectCatalog = (index, cat) => {
    setItems((prev) => {
      const copy = [...prev];
      const descVal = valueOf(cat.description, cat.content, cat.note, cat.instructions, cat.summary, copy[index].description);
      copy[index] = {
        ...copy[index],
        name: cat.name || copy[index].name,
        description: descVal || '',
        taskCatalogId: getEntityId(cat),
        activityType: cat.activityType || copy[index].activityType,
      };
      return copy;
    });
    setActiveCatalogIndex(null);
  };

  const toggleFarmerSelection = (itemIndex, farmerId) => {
    setItems((prev) => {
      const copy = [...prev];
      const currentFarmerIds = copy[itemIndex].farmerIds || [];
      const updated = currentFarmerIds.includes(farmerId)
        ? currentFarmerIds.filter((id) => id !== farmerId)
        : [...currentFarmerIds, farmerId];
      copy[itemIndex] = { ...copy[itemIndex], farmerIds: updated };
      return copy;
    });
  };

  const handleSubmit = async () => {
    const invalidItemIndex = items.findIndex((it) => !it.name.trim());
    if (invalidItemIndex !== -1) {
      Alert.alert('Thiếu thông tin ⚠️', `Vui lòng nhập tên công việc cho Công việc ${invalidItemIndex + 1}.`);
      return;
    }

    setSaving(true);

    const formattedTasks = items.map((it) => ({
      name: it.name.trim(),
      taskName: it.name.trim(),
      description: it.description.trim() || undefined,
      leaderId: it.leaderId || undefined,
      assignedLeaderId: it.leaderId || undefined,
      farmerIds: it.farmerIds && it.farmerIds.length ? it.farmerIds : undefined,
      startDate: new Date().toISOString(),
    }));

    const bulkPayload = {
      cultivationLogbookId: planId,
      logbookId: planId,
      cultivationStageId: stageId,
      stageId: stageId,
      tasks: formattedTasks,
    };

    try {
      await supervisorApi.bulkCreateTasks(bulkPayload);
      setSaving(false);
      Alert.alert('Thành công 🎉', `Đã lưu ${items.length} công việc mới vào giai đoạn!`, [
        { text: 'OK', onPress: () => onSuccess?.() },
      ]);
    } catch (bulkErr) {
      // Fallback: try individual task creation if bulk endpoint has different requirements
      try {
        for (const singleTask of formattedTasks) {
          await supervisorApi.createTask({
            cultivationLogbookId: planId,
            logbookId: planId,
            cultivationStageId: stageId,
            stageId: stageId,
            ...singleTask,
          });
        }
        setSaving(false);
        Alert.alert('Thành công 🎉', `Đã lưu ${items.length} công việc mới vào giai đoạn!`, [
          { text: 'OK', onPress: () => onSuccess?.() },
        ]);
      } catch (err) {
        setSaving(false);
        const msg = getApiErrorMessage(err || bulkErr, 'Không thể tạo danh sách công việc.');
        Alert.alert('Lỗi lưu công việc ⚠️', msg);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeaderTitle}>Công việc mới</Text>

      {items.map((item, index) => {
        const selectedLeader = leaders.find((u) => getEntityId(u) === item.leaderId);
        const leaderName = selectedLeader ? valueOf(selectedLeader.fullName, selectedLeader.name, 'Tổ trưởng') : null;
        const selectedFarmerCount = (item.farmerIds || []).length;

        return (
          <View key={item.id || index} style={styles.taskCard}>
            {/* Header */}
            <View style={styles.taskCardHeader}>
              <Text style={styles.taskIndexTitle}>Công việc {index + 1}</Text>
              {items.length > 1 ? (
                <TouchableOpacity onPress={() => handleRemoveItem(index)} hitSlop={8} style={styles.deleteBtn}>
                  <Feather name="trash-2" size={16} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Task Name Input */}
            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={item.name}
                  onChangeText={(txt) => updateItemField(index, 'name', txt)}
                  placeholder="Nhập tên công việc (gợi ý từ danh mục)..."
                  placeholderTextColor="#94a3b8"
                />
                {catalogs.length > 0 ? (
                  <TouchableOpacity
                    style={styles.catalogToggleBtn}
                    onPress={() => setActiveCatalogIndex(activeCatalogIndex === index ? null : index)}
                  >
                    <Feather name="list" size={14} color="#15803d" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Task Catalog suggestions chips */}
              {catalogs.length > 0 ? (
                <View style={{ marginTop: 6, gap: 4 }}>
                  <Text style={styles.catalogDropdownTitle}>Gợi ý danh mục công việc cây trồng:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {catalogs.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.catalogChip}
                        onPress={() => handleSelectCatalog(index, cat)}
                      >
                        <Feather name="plus" size={12} color="#15803d" />
                        <Text style={styles.catalogChipText}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {/* Task Catalog dropdown */}
              {activeCatalogIndex === index && catalogs.length > 0 ? (
                <View style={styles.catalogDropdown}>
                  <Text style={styles.catalogDropdownTitle}>Tất cả danh mục công việc:</Text>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                    {catalogs.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={styles.catalogDropdownItem}
                        onPress={() => handleSelectCatalog(index, cat)}
                      >
                        <Feather name="plus-circle" size={14} color="#15803d" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.catalogDropdownItemText}>{cat.name}</Text>
                          {cat.description ? (
                            <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>
                              {cat.description}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            {/* Description Textarea */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.textarea}
                value={item.description}
                onChangeText={(txt) => updateItemField(index, 'description', txt)}
                placeholder="Mô tả chi tiết, liều lượng..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Pickers Row */}
            <View style={styles.pickersRow}>
              {/* Leader Picker */}
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerLabel}>Người phụ trách</Text>
                <TouchableOpacity
                  style={styles.pickerSelectBtn}
                  onPress={() => setLeaderPicker({ visible: true, itemIndex: index })}
                >
                  <Text style={[styles.pickerSelectText, leaderName && { color: '#0f172a', fontWeight: '700' }]} numberOfLines={1}>
                    {leaderName || 'Chọn người phụ trách...'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Farmers Picker */}
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerLabel}>Người hỗ trợ</Text>
                <TouchableOpacity
                  style={styles.pickerSelectBtn}
                  onPress={() => setFarmerPicker({ visible: true, itemIndex: index })}
                >
                  <Text style={[styles.pickerSelectText, selectedFarmerCount > 0 && { color: '#166534', fontWeight: '700' }]} numberOfLines={1}>
                    {selectedFarmerCount > 0 ? `${selectedFarmerCount} người hỗ trợ` : 'Chọn người hỗ trợ...'}
                  </Text>
                  <Feather name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })}

      {/* Add another task item button */}
      <TouchableOpacity style={styles.addAnotherBtn} onPress={handleAddItem} activeOpacity={0.8}>
        <Feather name="plus" size={16} color="#15803d" />
        <Text style={styles.addAnotherBtnText}>+ Thêm công việc khác</Text>
      </TouchableOpacity>

      {/* Footer Actions */}
      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={saving}>
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Lưu {items.length} công việc</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Leader Selection */}
      {leaderPicker.visible ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLeaderPicker({ visible: false, itemIndex: null })}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLeaderPicker({ visible: false, itemIndex: null })}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn người phụ trách (Tổ trưởng)</Text>
                <TouchableOpacity onPress={() => setLeaderPicker({ visible: false, itemIndex: null })}>
                  <Feather name="x" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 280 }}>
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    updateItemField(leaderPicker.itemIndex, 'leaderId', null);
                    setLeaderPicker({ visible: false, itemIndex: null });
                  }}
                >
                  <Text style={styles.modalItemText}>Không chọn</Text>
                </TouchableOpacity>
                {leaders.map((u) => {
                  const id = getEntityId(u);
                  const name = valueOf(u.fullName, u.fullname, u.name, u.email, 'Tổ trưởng');
                  const selected = items[leaderPicker.itemIndex]?.leaderId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.modalItem, selected && styles.modalItemSelected]}
                      onPress={() => {
                        updateItemField(leaderPicker.itemIndex, 'leaderId', id);
                        setLeaderPicker({ visible: false, itemIndex: null });
                      }}
                    >
                      <Text style={[styles.modalItemText, selected && { color: '#15803d', fontWeight: '800' }]}>{name}</Text>
                      {selected ? <Feather name="check" size={16} color="#15803d" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}

      {/* Modal Farmers Multi-Selection */}
      {farmerPicker.visible ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setFarmerPicker({ visible: false, itemIndex: null })}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFarmerPicker({ visible: false, itemIndex: null })}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn người hỗ trợ (Nông dân)</Text>
                <TouchableOpacity onPress={() => setFarmerPicker({ visible: false, itemIndex: null })}>
                  <Feather name="x" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 280 }}>
                {farmers.map((u) => {
                  const id = getEntityId(u);
                  const name = valueOf(u.fullName, u.fullname, u.name, u.email, 'Nông dân');
                  const selected = (items[farmerPicker.itemIndex]?.farmerIds || []).includes(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.modalItem, selected && styles.modalItemSelected]}
                      onPress={() => toggleFarmerSelection(farmerPicker.itemIndex, id)}
                    >
                      <Feather name={selected ? 'check-square' : 'square'} size={18} color={selected ? '#15803d' : '#94a3b8'} />
                      <Text style={[styles.modalItemText, selected && { color: '#15803d', fontWeight: '800' }]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => setFarmerPicker({ visible: false, itemIndex: null })}
              >
                <Text style={styles.modalConfirmBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    marginBottom: 14,
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskIndexTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
  },
  deleteBtn: {
    padding: 4,
  },
  inputGroup: {
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  catalogToggleBtn: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  catalogDropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    marginTop: 4,
    padding: 8,
    gap: 4,
    elevation: 3,
    zIndex: 10,
  },
  catalogDropdownTitle: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '700',
    marginBottom: 4,
  },
  catalogDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  catalogDropdownItemText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '600',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff',
    minHeight: 65,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  pickerSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  pickerSelectText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#86efac',
    borderRadius: 8,
  },
  addAnotherBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  catalogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  catalogChipText: {
    fontSize: 11,
    color: '#15803d',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  modalItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  modalItemText: {
    fontSize: 14,
    color: '#334155',
    flex: 1,
  },
  modalConfirmBtn: {
    backgroundColor: '#15803d',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});

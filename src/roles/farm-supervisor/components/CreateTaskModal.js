import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
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
import { extractItems, getApiErrorMessage, getEntityId } from '../../../shared/api/response';
import { valueOf } from '../../../shared/utils/data';
import supervisorApi from '../api/supervisorApi';

const ACTIVITY_TYPES = [
  { id: 'LAND_PREPARATION', label: 'Làm đất', icon: 'layers' },
  { id: 'PLANTING', label: 'Gieo trồng', icon: 'sun' },
  { id: 'IRRIGATION', label: 'Tưới nước', icon: 'droplet' },
  { id: 'FERTILIZATION', label: 'Bón phân', icon: 'disc' },
  { id: 'PESTICIDE_APPLICATION', label: 'Phun nông dược', icon: 'shield' },
  { id: 'INSPECTION', label: 'Kiểm tra', icon: 'check-square' },
  { id: 'PRUNING', label: 'Cắt tỉa', icon: 'scissors' },
  { id: 'HARVESTING', label: 'Thu hoạch', icon: 'shopping-bag' },
  { id: 'OTHER', label: 'Khác', icon: 'grid' },
];

export default function CreateTaskModal({ visible, planId, stage, cropId, cropCatalogId, users = [], onClose, onSuccess }) {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState('OTHER');
  const [leaderId, setLeaderId] = useState(null);
  const [farmerIds, setFarmerIds] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [saving, setSaving] = useState(false);

  const stageId = getEntityId(stage);

  // Filter leaders and farmers from users list
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
    if (visible) {
      setTaskName('');
      setDescription('');
      setActivityType('OTHER');
      setLeaderId(null);
      setFarmerIds([]);
      setSaving(false);

      const params = {};
      if (cropId) params.CropId = cropId;
      if (cropCatalogId) params.CropCatalogId = cropCatalogId;

      supervisorApi.getTaskCatalogs(params)
        .then((res) => {
          const items = extractItems(res.data) || [];
          if (items.length === 0 && (cropId || cropCatalogId)) {
            supervisorApi.getTaskCatalogs({})
              .then((r) => setCatalogs(extractItems(r.data) || []))
              .catch(() => setCatalogs([]));
          } else {
            setCatalogs(items);
          }
        })
        .catch(() => {
          supervisorApi.getTaskCatalogs({})
            .then((r) => setCatalogs(extractItems(r.data) || []))
            .catch(() => setCatalogs([]));
        });
    }
  }, [visible, cropId, cropCatalogId]);

  const toggleFarmer = (id) => {
    setFarmerIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSelectCatalog = (cat) => {
    setTaskName(cat.name || '');
    const descVal = valueOf(cat.description, cat.content, cat.note, cat.instructions, cat.summary, '');
    if (descVal) setDescription(descVal);
    if (cat.activityType) setActivityType(cat.activityType);
  };

  const handleSubmit = async () => {
    if (!taskName.trim()) {
      Alert.alert('Thiếu thông tin ⚠️', 'Vui lòng nhập Tên công việc.');
      return;
    }

    setSaving(true);

    const payload = {
      cultivationLogbookId: planId,
      logbookId: planId,
      cultivationStageId: stageId,
      stageId: stageId,
      name: taskName.trim(),
      taskName: taskName.trim(),
      description: description.trim() || undefined,
      activityType: activityType,
      startDate: new Date().toISOString(),
      leaderId: leaderId || undefined,
      assignedLeaderId: leaderId || undefined,
      farmerIds: farmerIds.length ? farmerIds : undefined,
    };

    try {
      await supervisorApi.createTask(payload);
      setSaving(false);
      Alert.alert('Thành công 🎉', 'Đã thêm công việc mới vào giai đoạn thành công!', [
        { text: 'OK', onPress: () => onSuccess?.() },
      ]);
    } catch (err) {
      setSaving(false);
      const msg = getApiErrorMessage(err, 'Không thể tạo công việc mới.');
      Alert.alert('Lỗi tạo công việc ⚠️', msg);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.absoluteOverlay}>
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Feather name="plus-circle" size={16} color="#15803d" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Thêm công việc vào giai đoạn</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Giai đoạn: <Text style={{ color: '#15803d', fontWeight: '700' }}>{stage?.name || 'Hiện tại'}</Text>
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Feather name="x" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Task Catalogs Suggestion Chips */}
            {catalogs.length > 0 ? (
              <View style={styles.catalogSection}>
                <Text style={styles.labelSub}>Gợi ý công việc từ danh mục:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {catalogs.slice(0, 8).map((cat) => (
                    <TouchableOpacity key={cat.id} style={styles.catalogChip} onPress={() => handleSelectCatalog(cat)}>
                      <Feather name="plus" size={12} color="#15803d" />
                      <Text style={styles.catalogChipText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Task Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Text style={{ color: '#ef4444' }}>* </Text>
                Tên công việc
              </Text>
              <TextInput
                style={styles.input}
                value={taskName}
                onChangeText={setTaskName}
                placeholder="VD: Phun thuốc bảo vệ thực vật, Bón phân..."
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Activity Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Loại hoạt động</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {ACTIVITY_TYPES.map((type) => {
                  const selected = activityType === type.id;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[styles.typeChip, selected && styles.typeChipActive]}
                      onPress={() => setActivityType(type.id)}
                    >
                      <Feather name={type.icon} size={14} color={selected ? '#fff' : '#475569'} />
                      <Text style={[styles.typeChipText, selected && styles.typeChipTextActive]}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mô tả / Hướng dẫn thực hiện</Text>
              <TextInput
                style={styles.textarea}
                value={description}
                onChangeText={setDescription}
                placeholder="Chi tiết nội dung cần làm cho công việc này..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Assign Leader */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phân công Tổ trưởng</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.personChip, !leaderId && styles.personChipActive]}
                  onPress={() => setLeaderId(null)}
                >
                  <Text style={[styles.personChipText, !leaderId && styles.personChipTextActive]}>Chưa phân công</Text>
                </TouchableOpacity>
                {leaders.map((u) => {
                  const id = getEntityId(u);
                  const selected = leaderId === id;
                  const name = valueOf(u.fullName, u.fullname, u.name, u.email, 'Tổ trưởng');
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.personChip, selected && styles.personChipActive]}
                      onPress={() => setLeaderId(selected ? null : id)}
                    >
                      <Feather name="user-check" size={13} color={selected ? '#fff' : '#2563eb'} />
                      <Text style={[styles.personChipText, selected && styles.personChipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Assign Farmers */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phân công Nông dân tham gia ({farmerIds.length} đã chọn)</Text>
              <View style={styles.farmerGrid}>
                {farmers.length === 0 ? (
                  <Text style={{ fontSize: 13, color: '#94a3b8' }}>Chưa có danh sách nông dân</Text>
                ) : (
                  farmers.map((u) => {
                    const id = getEntityId(u);
                    const selected = farmerIds.includes(id);
                    const name = valueOf(u.fullName, u.fullname, u.name, u.email, 'Nông dân');
                    return (
                      <TouchableOpacity
                        key={id}
                        style={[styles.farmerCard, selected && styles.farmerCardActive]}
                        onPress={() => toggleFarmer(id)}
                      >
                        <Feather name={selected ? 'check-square' : 'square'} size={15} color={selected ? '#15803d' : '#94a3b8'} />
                        <Text style={[styles.farmerCardName, selected && styles.farmerCardNameActive]} numberOfLines={1}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>Tạo công việc mới</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 9999,
    elevation: 9999,
    paddingTop: Platform.OS === 'ios' ? 44 : 12,
  },
  keyboardWrap: { flex: 1, width: '100%', backgroundColor: '#fff' },
  card: { flex: 1, width: '100%', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justify: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  closeBtn: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },
  catalogSection: { gap: 6 },
  catalogChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catalogChipText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  labelSub: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff',
    minHeight: 70,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipActive: { backgroundColor: '#15803d' },
  typeChipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  typeChipTextActive: { color: '#fff', fontWeight: '800' },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  personChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  personChipText: { fontSize: 13, color: '#1d4ed8', fontWeight: '600' },
  personChipTextActive: { color: '#fff', fontWeight: '800' },
  farmerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '48%',
  },
  farmerCardActive: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  farmerCardName: { fontSize: 13, color: '#334155', flex: 1 },
  farmerCardNameActive: { color: '#166534', fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  submitBtn: {
    flex: 2,
    backgroundColor: '#15803d',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});

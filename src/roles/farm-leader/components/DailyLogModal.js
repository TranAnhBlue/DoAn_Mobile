import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../../../shared/api/client';
import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import { formatVietnamDateTime } from '../../../features/notifications/utils/dateTime';
import { useNetworkStatus } from '../../../shared/hooks/useNetworkStatus';
import { offlineQueue } from '../../../shared/services/offlineQueue';
import FieldCameraScreen from './FieldCameraScreen';

const CATALOG_CACHE_KEY = {
  fertilizer: 'farm-leader:catalog-cache:fertilizer',
  pesticide: 'farm-leader:catalog-cache:pesticide',
};

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const catalogName = (item) => valueOf(item.name, item.fertilizerName, item.pesticideName, item.tradeName, item.code, 'Vật tư');

export default function DailyLogModal({ visible, task, onClose, onSaved }) {
  const { isConnected } = useNetworkStatus();
  const isOffline = isConnected === false;

  const [description, setDescription] = useState('');
  const [fertilizers, setFertilizers] = useState([]);
  const [pesticides, setPesticides] = useState([]);
  const [images, setImages] = useState([]);
  const [catalogs, setCatalogs] = useState({ fertilizer: [], pesticide: [] });
  const [catalogFromCache, setCatalogFromCache] = useState(false);
  const [catalogErrors, setCatalogErrors] = useState({});
  const [history, setHistory] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const taskId = getEntityId(task);
  const draftKey = taskId ? `farm-leader:daily-log-draft:${taskId}` : null;

  useEffect(() => {
    if (!visible) return;

    setDescription('');
    setFertilizers([]);
    setPesticides([]);
    setImages([]);
    setPickerType(null);
    setCatalogErrors({});
    setHistory([]);
    setLoadingCatalogs(true);
    setLoadingHistory(true);

    if (draftKey) {
      AsyncStorage.getItem(draftKey).then((storedDraft) => {
        if (!storedDraft) return;
        try {
          const draft = JSON.parse(storedDraft);
          setDescription(draft.description || '');
          setFertilizers(Array.isArray(draft.fertilizers) ? draft.fertilizers : []);
          setPesticides(Array.isArray(draft.pesticides) ? draft.pesticides : []);
          setImages(Array.isArray(draft.images) ? draft.images : []);
        } catch {
          AsyncStorage.removeItem(draftKey);
        }
      });
    }

    // Đọc pending offline count
    offlineQueue.count().then(setPendingCount);

    if (isOffline) {
      // Khi offline: dùng cache catalog đã lưu trước
      Promise.allSettled([
        AsyncStorage.getItem(CATALOG_CACHE_KEY.fertilizer),
        AsyncStorage.getItem(CATALOG_CACHE_KEY.pesticide),
      ]).then(([fertRes, pestRes]) => {
        const nextCatalogs = { fertilizer: [], pesticide: [] };
        let usedCache = false;
        if (fertRes.status === 'fulfilled' && fertRes.value) {
          try { nextCatalogs.fertilizer = JSON.parse(fertRes.value); usedCache = true; } catch {}
        }
        if (pestRes.status === 'fulfilled' && pestRes.value) {
          try { nextCatalogs.pesticide = JSON.parse(pestRes.value); usedCache = true; } catch {}
        }
        setCatalogs(nextCatalogs);
        setCatalogFromCache(usedCache);
      }).finally(() => {
        setLoadingCatalogs(false);
        setLoadingHistory(false);
      });
      return;
    }

    Promise.allSettled([
      api.get('/catalogs/fertilizers'),
      api.get('/catalogs/pesticides'),
      api.get(`/cultivation-daily-logs/task/${taskId}`),
    ]).then(([fertilizerResult, pesticideResult, historyResult]) => {
      const nextCatalogs = { fertilizer: [], pesticide: [] };
      const nextErrors = {};

      if (fertilizerResult.status === 'fulfilled') {
        nextCatalogs.fertilizer = extractItems(fertilizerResult.value.data);
        // Lưu cache để dùng khi offline
        AsyncStorage.setItem(CATALOG_CACHE_KEY.fertilizer, JSON.stringify(nextCatalogs.fertilizer)).catch(() => {});
      } else {
        nextErrors.fertilizer = fertilizerResult.reason?.response?.status === 403
          ? 'Tài khoản chưa được cấp quyền xem danh mục phân bón.'
          : getApiErrorMessage(fertilizerResult.reason, 'Không thể tải danh mục phân bón.');
      }

      if (pesticideResult.status === 'fulfilled') {
        nextCatalogs.pesticide = extractItems(pesticideResult.value.data);
        // Lưu cache để dùng khi offline
        AsyncStorage.setItem(CATALOG_CACHE_KEY.pesticide, JSON.stringify(nextCatalogs.pesticide)).catch(() => {});
      } else {
        nextErrors.pesticide = getApiErrorMessage(pesticideResult.reason, 'Không thể tải danh mục thuốc BVTV.');
      }

      setCatalogs(nextCatalogs);
      setCatalogErrors(nextErrors);
      setCatalogFromCache(false);
      if (historyResult.status === 'fulfilled') setHistory(extractItems(historyResult.value.data));
    }).finally(() => {
      setLoadingCatalogs(false);
      setLoadingHistory(false);
    });
  }, [draftKey, isOffline, taskId, visible]);

  const hasDraft = Boolean(description.trim() || fertilizers.length || pesticides.length || images.length);

  const resetAndClose = () => {
    Keyboard.dismiss();
    setPickerType(null);
    onClose();
  };

  const requestClose = () => {
    if (saving) return;
    if (!hasDraft) {
      resetAndClose();
      return;
    }

    Keyboard.dismiss();
    Alert.alert('Hủy ghi chép?', 'Nội dung bạn đang nhập sẽ không được lưu.', [
      { text: 'Tiếp tục nhập', style: 'cancel' },
      { text: 'Bỏ nội dung', style: 'destructive', onPress: resetAndClose },
    ]);
  };

  const saveDraft = async () => {
    if (!draftKey) return;
    setSaving(true);
    try {
      await AsyncStorage.setItem(draftKey, JSON.stringify({ description, fertilizers, pesticides, images }));
      resetAndClose();
      Alert.alert('Đã lưu nháp', 'Nội dung được lưu trên thiết bị và sẽ tự khôi phục khi bạn mở lại công việc này.');
    } catch {
      Alert.alert('Không thể lưu nháp', 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const addMaterial = (item) => {
    const id = getEntityId(item);
    const setter = pickerType === 'fertilizer' ? setFertilizers : setPesticides;
    setter((current) => {
      if (current.some((entry) => entry.id === id)) return current;
      return [...current, {
        id,
        name: catalogName(item),
        quantity: '',
        unit: valueOf(item.unit, item.defaultUnit, ''),
        area: '',
      }];
    });
    setPickerType(null);
  };

  const updateMaterial = (type, id, field, value) => {
    const setter = type === 'fertilizer' ? setFertilizers : setPesticides;
    setter((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeMaterial = (type, id) => {
    const setter = type === 'fertilizer' ? setFertilizers : setPesticides;
    setter((current) => current.filter((item) => item.id !== id));
  };

  const openCamera = () => {
    if (images.length >= 3) {
      Alert.alert('Đã đủ ảnh', 'Tối đa 3 ảnh minh chứng mỗi ghi chép.');
      return;
    }
    setCameraOpen(true);
  };

  const handleCaptured = (asset) => {
    setCameraOpen(false);
    setImages((current) => [...current, asset].slice(0, 3));
  };

  const uploadImage = async (asset, index) => {
    const extension = asset.fileName?.split('.').pop() || asset.uri.split('.').pop() || 'jpg';
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
      name: asset.fileName || `daily-log-${Date.now()}-${index}.${extension}`,
      type: asset.mimeType || `image/${extension}`,
    });

    const response = await api.post('/v1/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const payload = unwrapPayload(response.data) || {};
    const url = valueOf(payload.url, payload.secureUrl, payload.fileUrl, payload.path);
    if (!url) throw new Error('API tải ảnh không trả về URL.');
    return {
      id: valueOf(payload.id, payload.publicId, ''),
      url,
      metadata: asset.metadata ?? null, // GPS + timestamp từ FieldCameraScreen
    };
  };

  const toRequestMaterials = (items) => items.map((item) => ({
    id: item.id,
    quantity: Number(item.quantity),
    unit: item.unit.trim() || null,
    area: item.area ? Number(item.area) : null,
  }));

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert('Thiếu chi tiết công việc', 'Vui lòng nhập nội dung công việc đã thực hiện.');
      return;
    }

    const invalidMaterial = [...fertilizers, ...pesticides].find((item) => !item.id || !item.quantity || Number(item.quantity) <= 0);
    if (invalidMaterial) {
      Alert.alert('Vật tư chưa hợp lệ', `Nhập số lượng lớn hơn 0 cho "${invalidMaterial.name}".`);
      return;
    }

    setSaving(true);
    try {
      // === OFFLINE: lưu vào queue, tự sync khi có mạng ===
      if (isOffline) {
        await offlineQueue.enqueue({
          taskId,
          date: new Date().toISOString(),
          description: description.trim(),
          fertilizers,
          pesticides,
          imageAssets: images, // Lưu nguyên asset (có uri) để upload sau
        });
        if (draftKey) await AsyncStorage.removeItem(draftKey);
        resetAndClose();
        Alert.alert(
          'Đã lưu offline ✓',
          'Ghi chép được lưu trên thiết bị và sẽ tự động gửi lên server khi có kết nối mạng.',
          [{ text: 'OK' }]
        );
        onSaved?.();
        return;
      }

      // === ONLINE: gửi ngay ===
      const uploadedImages = await Promise.all(images.map(uploadImage));
      await api.post('/cultivation-daily-logs', {
        taskId,
        date: new Date().toISOString(),
        description: description.trim(),
        fertilizers: toRequestMaterials(fertilizers),
        pesticides: toRequestMaterials(pesticides),
        images: uploadedImages,
      });
      if (draftKey) await AsyncStorage.removeItem(draftKey);
      resetAndClose();
      Alert.alert('Thành công', 'Đã lưu và gửi ghi chép công việc.');
      onSaved?.();
    } catch (error) {
      Alert.alert('Không thể gửi ghi chép', getApiErrorMessage(error, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const renderMaterialRows = (type, items) => items.map((item) => (
    <View key={item.id} style={styles.materialCard}>
      <View style={styles.materialHeader}>
        <Text style={styles.materialName}>{item.name}</Text>
        <TouchableOpacity onPress={() => removeMaterial(type, item.id)} hitSlop={8}>
          <Feather name="trash-2" size={18} color="#dc2626" />
        </TouchableOpacity>
      </View>
      <View style={styles.materialInputs}>
        <TextInput
          style={styles.smallInput}
          value={item.quantity}
          onChangeText={(value) => updateMaterial(type, item.id, 'quantity', value)}
          placeholder="Số lượng *"
          placeholderTextColor="#64748b"
          keyboardType="decimal-pad"
        />
        <TextInput
          style={styles.smallInput}
          value={item.unit}
          onChangeText={(value) => updateMaterial(type, item.id, 'unit', value)}
          placeholder="Đơn vị"
          placeholderTextColor="#64748b"
        />
      </View>
      <TextInput
        style={styles.input}
        value={item.area}
        onChangeText={(value) => updateMaterial(type, item.id, 'area', value)}
        placeholder="Diện tích sử dụng (ha)"
        placeholderTextColor="#64748b"
        keyboardType="decimal-pad"
      />
    </View>
  ));

  const selectedCatalog = pickerType ? catalogs[pickerType] : [];
  const selectedError = pickerType ? catalogErrors[pickerType] : '';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={requestClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={requestClose} disabled={saving}>
            <Feather name="arrow-left" size={23} color="#334155" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Ghi chép công việc</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{valueOf(task?.name, task?.taskName, task?.title)}</Text>
          </View>
          <TouchableOpacity style={styles.headerButton} onPress={requestClose} disabled={saving}>
            <Feather name="x" size={23} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Banner offline */}
        {isOffline ? (
          <View style={styles.offlineBanner}>
            <Feather name="wifi-off" size={14} color="#92400e" />
            <Text style={styles.offlineBannerText}>
              Không có mạng — ghi chép sẽ được lưu offline{pendingCount > 0 ? ` (${pendingCount} đang chờ gửi)` : ''}
            </Text>
          </View>
        ) : pendingCount > 0 ? (
          <View style={styles.syncBanner}>
            <Feather name="upload-cloud" size={14} color="#1d4ed8" />
            <Text style={styles.syncBannerText}>{pendingCount} ghi chép đang chờ đồng bộ</Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Badge bộ nhớ đệm */}
          {catalogFromCache ? (
            <View style={styles.cacheBanner}>
              <Feather name="database" size={13} color="#6d28d9" />
              <Text style={styles.cacheBannerText}>Danh mục vật tư từ bộ nhớ đệm (offline)</Text>
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nội dung thực hiện</Text>
            {task?.description ? <Text style={styles.taskDescription}>{task.description}</Text> : null}
            <Text style={styles.label}>Chi tiết công việc <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả tình hình cây trồng, công việc đã làm và vấn đề phát sinh..."
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phân bón</Text>
            {renderMaterialRows('fertilizer', fertilizers)}
            {catalogErrors.fertilizer ? <Text style={styles.warning}>{catalogErrors.fertilizer}</Text> : null}
            <TouchableOpacity style={styles.addButton} onPress={() => setPickerType('fertilizer')} disabled={loadingCatalogs}>
              <Feather name="plus" size={18} color="#15803d" /><Text style={styles.addButtonText}>Thêm phân bón</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thuốc bảo vệ thực vật</Text>
            {renderMaterialRows('pesticide', pesticides)}
            <TouchableOpacity style={styles.addButton} onPress={() => setPickerType('pesticide')} disabled={loadingCatalogs}>
              <Feather name="plus" size={18} color="#15803d" /><Text style={styles.addButtonText}>Thêm thuốc BVTV</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={styles.imageHeader}>
              <Text style={styles.sectionTitle}>Ảnh minh chứng</Text>
              <View style={styles.imageBadge}>
                <Feather name="map-pin" size={11} color="#15803d" />
                <Text style={styles.imageBadgeText}>GPS + thời gian</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.imagePicker, images.length >= 3 && styles.imagePickerDisabled]}
              onPress={openCamera}
              disabled={images.length >= 3}
            >
              <Feather name="camera" size={25} color={images.length >= 3 ? '#94a3b8' : '#16a34a'} />
              <Text style={[styles.imagePickerText, images.length >= 3 && { color: '#94a3b8' }]}>
                {images.length >= 3 ? 'Đã đủ 3 ảnh' : 'Chụp ảnh hiện trường'}
              </Text>
              <Text style={styles.imageHint}>{images.length}/3 ảnh • có GPS & thời gian</Text>
            </TouchableOpacity>
            {images.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
                {images.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.previewWrap}>
                    <Image source={{ uri: image.uri }} style={styles.preview} />
                    {/* GPS badge */}
                    {image.metadata?.lat != null ? (
                      <View style={styles.gpsBadge}>
                        <Feather name="map-pin" size={9} color="#fff" />
                        <Text style={styles.gpsBadgeText}>GPS</Text>
                      </View>
                    ) : null}
                    {/* Giờ chụp */}
                    {image.metadata?.capturedAt ? (
                      <View style={styles.timeBadge}>
                        <Text style={styles.timeBadgeText}>
                          {new Date(image.metadata.capturedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={styles.removeImage}
                      onPress={() => setImages((current) => current.filter((_, i) => i !== index))}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>

          <View style={styles.section}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, styles.historyTitle]}>Lịch sử ghi chép</Text>
              <View style={styles.historyBadge}><Text style={styles.historyBadgeText}>{history.length} bản ghi</Text></View>
            </View>
            {loadingHistory ? <ActivityIndicator color="#15803d" style={styles.historyLoader} /> : null}
            {!loadingHistory && history.map((log, index) => (
              <View key={getEntityId(log) || index} style={styles.historyCard}>
                <View style={styles.historyDateRow}><Feather name="clock" size={14} color="#15803d" /><Text style={styles.historyDate}>{formatVietnamDateTime(valueOf(log.createdAt, log.date, log.performedAt), 'Không xác định')}</Text></View>
                <Text style={styles.historyDescription}>{valueOf(log.description, log.notes, log.content, 'Không có mô tả')}</Text>
                {log.progress != null ? <Text style={styles.historyProgress}>Tiến độ: {log.progress}%</Text> : null}
              </View>
            ))}
            {!loadingHistory && !history.length ? <View style={styles.historyEmpty}><Feather name="inbox" size={34} color="#cbd5e1" /><Text style={styles.historyEmptyText}>Chưa có bản ghi nào</Text></View> : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.footerButton, styles.draftButton]} onPress={saveDraft} disabled={saving}>
            <Text style={styles.draftText}>Lưu nháp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, isOffline ? styles.offlineButton : styles.submitButton]}
            onPress={submit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitInner}>
                {isOffline && <Feather name="wifi-off" size={14} color="#fff" style={{ marginRight: 6 }} />}
                <Text style={styles.submitText}>{isOffline ? 'Lưu offline' : 'Lưu & Gửi'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {pickerType ? (
          <View style={styles.pickerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerType(null)} />
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{pickerType === 'fertilizer' ? 'Chọn phân bón' : 'Chọn thuốc BVTV'}</Text>
                <TouchableOpacity onPress={() => setPickerType(null)}><Feather name="x" size={22} color="#475569" /></TouchableOpacity>
              </View>
              {selectedError ? <Text style={styles.pickerMessage}>{selectedError}</Text> : null}
              {!selectedError && !selectedCatalog.length ? <Text style={styles.pickerMessage}>Danh mục hiện chưa có dữ liệu.</Text> : null}
              <FlatList
                data={selectedCatalog}
                keyExtractor={(item, index) => String(getEntityId(item) || index)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.catalogItem} onPress={() => addMaterial(item)}>
                    <View style={styles.catalogIcon}><Feather name="package" size={18} color="#15803d" /></View>
                    <View style={styles.catalogText}><Text style={styles.catalogName}>{catalogName(item)}</Text><Text style={styles.catalogUnit}>{valueOf(item.unit, item.code, 'Chưa có đơn vị')}</Text></View>
                    <Feather name="plus-circle" size={20} color="#16a34a" />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        ) : null}

        <FieldCameraScreen
          visible={cameraOpen}
          onCapture={handleCaptured}
          onClose={() => setCameraOpen(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  header: { paddingTop: Platform.OS === 'ios' ? 54 : 24, paddingHorizontal: 14, paddingBottom: 13, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  headerSubtitle: { color: '#16a34a', fontSize: 12, fontWeight: '700', marginTop: 2, maxWidth: '90%' },
  content: { padding: 14, paddingBottom: 28 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 13, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  sectionTitle: { color: '#1e293b', fontSize: 15, fontWeight: '900', marginBottom: 13 },
  taskDescription: { color: '#64748b', fontSize: 12, lineHeight: 18, backgroundColor: '#f8fafc', borderRadius: 9, padding: 10, marginBottom: 12 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  required: { color: '#dc2626' },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, color: '#0f172a', backgroundColor: '#fff', fontSize: 14 },
  textarea: { minHeight: 112, lineHeight: 20 },
  warning: { color: '#b45309', backgroundColor: '#fffbeb', borderRadius: 8, padding: 9, fontSize: 12, lineHeight: 17, marginBottom: 9 },
  addButton: { minHeight: 44, borderWidth: 1, borderStyle: 'dashed', borderColor: '#22c55e', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addButtonText: { color: '#15803d', fontWeight: '800', fontSize: 13 },
  materialCard: { borderWidth: 1, borderColor: '#dbe4df', borderRadius: 11, padding: 11, marginBottom: 10, backgroundColor: '#f8fafc' },
  materialHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  materialName: { flex: 1, color: '#1e293b', fontWeight: '800', marginRight: 10 },
  materialInputs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  smallInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 9, paddingHorizontal: 10, color: '#0f172a', backgroundColor: '#fff' },
  imagePicker: { height: 112, borderWidth: 1, borderStyle: 'dashed', borderColor: '#22c55e', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fffa' },
  imagePickerDisabled: { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  imagePickerText: { color: '#15803d', fontWeight: '800', marginTop: 7 },
  imageHint: { color: '#64748b', fontSize: 12, marginTop: 3 },
  imageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  imageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  imageBadgeText: { color: '#15803d', fontSize: 10, fontWeight: '800' },
  previewRow: { marginTop: 12 },
  previewWrap: { width: 90, height: 90, marginRight: 10 },
  preview: { width: 90, height: 90, borderRadius: 10 },
  gpsBadge: { position: 'absolute', top: 5, left: 5, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#16a34a', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  gpsBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  timeBadge: { position: 'absolute', bottom: 5, left: 4, backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  timeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  removeImage: { position: 'absolute', top: -5, right: -5, width: 23, height: 23, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 11, paddingBottom: Platform.OS === 'ios' ? 30 : 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  footerButton: { flex: 1, minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  draftButton: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  submitButton: { backgroundColor: '#16a34a' },
  offlineButton: { backgroundColor: '#b45309' },
  submitInner: { flexDirection: 'row', alignItems: 'center' },
  draftText: { color: '#334155', fontWeight: '800' },
  submitText: { color: '#fff', fontWeight: '900' },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fef3c7', borderBottomWidth: 1, borderBottomColor: '#fcd34d', paddingHorizontal: 14, paddingVertical: 9 },
  offlineBannerText: { flex: 1, color: '#92400e', fontSize: 12, fontWeight: '700' },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#dbeafe', borderBottomWidth: 1, borderBottomColor: '#93c5fd', paddingHorizontal: 14, paddingVertical: 9 },
  syncBannerText: { flex: 1, color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
  cacheBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 },
  cacheBannerText: { color: '#6d28d9', fontSize: 11, fontWeight: '700' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  historyTitle: { marginBottom: 0 },
  historyBadge: { backgroundColor: '#dbeafe', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  historyBadgeText: { color: '#2563eb', fontSize: 10, fontWeight: '900' },
  historyLoader: { paddingVertical: 24 },
  historyCard: { borderLeftWidth: 3, borderLeftColor: '#22c55e', backgroundColor: '#f8fafc', borderRadius: 10, padding: 11, marginBottom: 9 },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyDate: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  historyDescription: { color: '#334155', lineHeight: 19, marginTop: 7 },
  historyProgress: { color: '#64748b', fontSize: 11, marginTop: 6 },
  historyEmpty: { alignItems: 'center', paddingVertical: 24 },
  historyEmptyText: { color: '#94a3b8', marginTop: 8 },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0008', justifyContent: 'flex-end', zIndex: 20 },
  pickerSheet: { maxHeight: '68%', minHeight: 260, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: Platform.OS === 'ios' ? 30 : 14 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pickerTitle: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  pickerMessage: { color: '#64748b', textAlign: 'center', padding: 28, lineHeight: 20 },
  catalogItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  catalogIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  catalogText: { flex: 1 },
  catalogName: { color: '#1e293b', fontWeight: '800' },
  catalogUnit: { color: '#64748b', fontSize: 12, marginTop: 2 },
});


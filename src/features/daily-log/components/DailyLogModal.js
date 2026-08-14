import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
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

import { formatVietnamDateTime } from '../../../features/notifications/utils/dateTime';
import api from '../../../shared/api/client';
import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import VoiceInputButton from '../../../shared/components/VoiceInputButton';
import { useNetworkStatus } from '../../../shared/hooks/useNetworkStatus';
import { offlineQueue } from '../../../shared/services/offlineQueue';
import { syncAllPendingLogs } from '../../../shared/services/syncDailyLogs';
import { formatNumber, sortLogsDescending } from '../../../shared/utils/format';
import { getTaskQuarantineWarning } from '../utils/quarantineValidation';
import FieldCameraScreen from './FieldCameraScreen';

const CATALOG_CACHE_KEY = {
  fertilizer: 'farm-leader:catalog-cache:fertilizer',
  pesticide: 'farm-leader:catalog-cache:pesticide',
};

const FERTILIZER_UNITS = ['kg', 'g', 'tấn', 'lít', 'ml', 'bao', 'can', 'gói'];
const PESTICIDE_UNITS = ['ml', 'lít', 'g', 'kg', 'chai', 'gói', 'can', 'bình'];
const HARVEST_UNITS = ['kg', 'tấn', 'lít', 'tạ', 'yến', 'gói', 'bao', 'thùng', 'trái', 'quả', 'giỏ'];

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const catalogName = (item) => valueOf(item.name, item.fertilizerName, item.pesticideName, item.tradeName, item.code, 'Vật tư');

export default function DailyLogModal({ visible, task, plan, onClose, onSaved }) {
  const { isConnected } = useNetworkStatus();
  const isOffline = isConnected === false;

  const [fullTask, setFullTask] = useState(task);
  const [description, setDescription] = useState('');
  const [fertilizers, setFertilizers] = useState([]);
  const [pesticides, setPesticides] = useState([]);
  const [images, setImages] = useState([]);
  const [catalogs, setCatalogs] = useState({ fertilizer: [], pesticide: [] });
  const [catalogFromCache, setCatalogFromCache] = useState(false);
  const [catalogErrors, setCatalogErrors] = useState({});
  const [history, setHistory] = useState([]);
  const [pendingLogs, setPendingLogs] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pickerType, setPickerType] = useState(null);
  const [unitPickerTarget, setUnitPickerTarget] = useState(null); // { type, id, currentUnit }
  const [saving, setSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Harvest state
  const [harvestQuantity, setHarvestQuantity] = useState('');
  const [harvestUnit, setHarvestUnit] = useState('kg');
  const [executedArea, setExecutedArea] = useState('');
  const [harvestUnitPickerOpen, setHarvestUnitPickerOpen] = useState(false);

  const activityType = String(task?.activityType || task?.type || task?.category || '').toUpperCase();
  const taskTitle = String(task?.taskName || task?.title || task?.name || '').toLowerCase();
  // isHarvest chỉ dựa vào activityType HARVESTING từ server (task tự gen), không dùng tên task
  // để tránh "Xử lý sau thu hoạch" bị nhận nhầm
  const isHarvest = activityType === 'HARVESTING';

  const totalPlanArea = Number(
    valueOf(
      fullTask?.totalPlanArea, fullTask?.plannedArea, fullTask?.planArea, fullTask?.area, fullTask?.totalArea, fullTask?.plotArea, fullTask?.landPlot?.area,
      task?.totalPlanArea, task?.plannedArea, task?.planArea, task?.area, task?.totalArea, task?.plotArea, task?.landPlot?.area,
      plan?.totalPlanArea, plan?.plannedArea, plan?.planArea, plan?.area, plan?.totalArea, plan?.plotArea, 0
    )
  );
  const harvestedArea = Number(valueOf(fullTask?.harvestedArea, task?.harvestedArea, task?.totalHarvestedArea, 0));
  const remainingHarvestArea = Math.max(0, totalPlanArea - harvestedArea);

  const quarantineWarn = getTaskQuarantineWarning(fullTask || task, history);

  const taskId = getEntityId(task);
  const draftKey = taskId ? `farm-leader:daily-log-draft:${taskId}` : null;
  const localHistoryKey = taskId ? `farm-leader:sent-logs-history:${taskId}` : null;

  const loadPendingLogs = useCallback(async () => {
    if (!taskId) return [];
    try {
      const logs = await offlineQueue.getByTask(taskId);
      setPendingLogs(logs);
      return logs;
    } catch {
      setPendingLogs([]);
      return [];
    }
  }, [taskId]);

  const saveToLocalSentHistory = useCallback(async (newLog) => {
    if (!localHistoryKey) return;
    try {
      const raw = await AsyncStorage.getItem(localHistoryKey);
      const existing = raw ? JSON.parse(raw) : [];
      const updated = sortLogsDescending([newLog, ...existing.filter((item) => item.id !== newLog.id)]);
      await AsyncStorage.setItem(localHistoryKey, JSON.stringify(updated.slice(0, 50)));
    } catch (e) {
      console.warn('[DailyLogModal] Không thể lưu lịch sử cục bộ:', e?.message);
    }
  }, [localHistoryKey]);


  const fetchHistory = useCallback(async () => {
    if (!taskId) return [];
    setLoadingHistory(true);

    let localSent = [];
    if (localHistoryKey) {
      try {
        const raw = await AsyncStorage.getItem(localHistoryKey);
        if (raw) localSent = JSON.parse(raw);
      } catch { }
    }

    if (isOffline) {
      setHistory(localSent);
      setLoadingHistory(false);
      return localSent;
    }

    try {
      const endpoints = [
        `/cultivation-tasks/${taskId}/daily-logs`,
        `/cultivation-tasks/${taskId}/logs`,
        `/cultivation-daily-logs/task/${taskId}`,
        `/cultivation-daily-logs?taskId=${taskId}`,
        `/cultivation-daily-logs?cultivationTaskId=${taskId}`,
        `/cultivation-logs?taskId=${taskId}`,
        `/cultivation-logs?cultivationTaskId=${taskId}`,
        '/cultivation-daily-logs',
        '/cultivation-logs',
      ];

      let serverItems = [];
      for (const endpoint of endpoints) {
        try {
          const res = await api.get(endpoint);
          const rawItems = extractItems(res.data) || (Array.isArray(res.data) ? res.data : []);
          if (rawItems && rawItems.length) {
            const filtered = rawItems.filter((item) => {
              const itemTaskId = getEntityId(item.taskId) || item.taskId || item.cultivationTaskId;
              return !itemTaskId || String(itemTaskId) === String(taskId);
            });
            if (filtered.length) {
              serverItems = filtered;
              break;
            }
          }
        } catch (err) {
          if (err?.response?.status !== 404) break;
        }
      }

      const serverIds = new Set(serverItems.map((s) => getEntityId(s) || s.id));
      const uniqueLocal = localSent.filter((l) => !serverIds.has(l.id));
      const combined = sortLogsDescending([...serverItems, ...uniqueLocal]);

      setHistory(combined);
      return combined;
    } catch (err) {
      console.warn('[DailyLogModal] Lỗi tải lịch sử:', err?.message);
      const sortedLocal = sortLogsDescending(localSent);
      setHistory(sortedLocal);
      return sortedLocal;
    } finally {
      setLoadingHistory(false);
    }
  }, [isOffline, localHistoryKey, taskId]);


  const handleManualSync = async () => {
    if (isOffline) {
      Alert.alert('Chưa có kết nối mạng', 'Vui lòng kết nối Wi-Fi hoặc Dữ liệu di động để đồng bộ.');
      return;
    }

    setIsSyncing(true);
    try {
      const { synced, failed, errors } = await syncAllPendingLogs({ force: true });
      await loadPendingLogs();
      await fetchHistory();

      if (synced > 0 && failed === 0) {
        Alert.alert('Thành công 🎉', `Đã đồng bộ ${synced} ghi chép offline lên server.`);
        onSaved?.();
      } else if (failed > 0) {
        const errorMsg = errors[0]?.message || 'Lỗi không xác định';
        Alert.alert(
          'Đồng bộ chưa hoàn tất ⚠️',
          `Đã đồng bộ ${synced} ghi chép. ${failed} ghi chép gặp lỗi: "${errorMsg}".\n\nBạn có thể thử lại hoặc xóa bản ghi lỗi bên dưới.`
        );
      } else {
        Alert.alert('Thông báo', 'Không có ghi chép offline nào cần đồng bộ.');
      }
    } catch (error) {
      Alert.alert('Lỗi đồng bộ', getApiErrorMessage(error, 'Vui lòng thử lại sau.'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeletePending = (pendingId) => {
    Alert.alert('Xóa ghi chép offline?', 'Bản ghi này chưa được gửi lên server và sẽ bị xóa vĩnh viễn.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await offlineQueue.remove(pendingId);
          await loadPendingLogs();
        },
      },
    ]);
  };

  useEffect(() => {
    if (!visible) return;

    setDescription('');
    setFertilizers([]);
    setPesticides([]);
    setImages([]);
    setHarvestQuantity('');
    setHarvestUnit('kg');
    setExecutedArea('');
    setHarvestUnitPickerOpen(false);
    setPickerType(null);
    setUnitPickerTarget(null);
    setCatalogErrors({});
    setHistory([]);
    setLoadingCatalogs(true);
    setFullTask(task);

    if (taskId && !isOffline) {
      api.get(`/cultivation-tasks/${taskId}`)
        .then(async (res) => {
          const d = unwrapPayload(res.data) || res.data?.data || res.data || {};
          if (d) {
            setFullTask((prev) => ({ ...prev, ...d }));

            const hasArea = valueOf(
              d.landPlot?.area, d.landPlot?.totalArea, d.landPlotArea, d.area, d.totalArea,
              d.cultivationLogbook?.landPlot?.area, d.cultivationLogbook?.area,
              d.cultivationPlan?.landPlot?.area, d.cultivationPlan?.area
            );

            if (!hasArea) {
              const plotIdToFetch = d.landPlotId || d.plotId || task?.landPlotId || plan?.landPlotId;
              if (plotIdToFetch) {
                try {
                  const pRes = await api.get(`/land-plots/${plotIdToFetch}`);
                  const pData = unwrapPayload(pRes.data) || pRes.data?.data || pRes.data || {};
                  if (pData && (pData.area || pData.totalArea)) {
                    setFullTask((prev) => ({
                      ...prev,
                      landPlot: pData,
                      landPlotArea: pData.area || pData.totalArea,
                    }));
                  }
                } catch {}
              }
            }
          }
        })
        .catch(() => {});
    }

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

    loadPendingLogs().then((logs) => {
      if (!isOffline && logs.length > 0) {
        syncAllPendingLogs({ force: true })
          .then(() => loadPendingLogs())
          .then(() => fetchHistory())
          .catch(() => { });
      }
    });

    if (isOffline) {
      Promise.allSettled([
        AsyncStorage.getItem(CATALOG_CACHE_KEY.fertilizer),
        AsyncStorage.getItem(CATALOG_CACHE_KEY.pesticide),
      ]).then(([fertRes, pestRes]) => {
        const nextCatalogs = { fertilizer: [], pesticide: [] };
        let usedCache = false;
        if (fertRes.status === 'fulfilled' && fertRes.value) {
          try { nextCatalogs.fertilizer = JSON.parse(fertRes.value); usedCache = true; } catch { }
        }
        if (pestRes.status === 'fulfilled' && pestRes.value) {
          try { nextCatalogs.pesticide = JSON.parse(pestRes.value); usedCache = true; } catch { }
        }
        setCatalogs(nextCatalogs);
        setCatalogFromCache(usedCache);
      }).finally(() => {
        setLoadingCatalogs(false);
        fetchHistory();
      });
      return;
    }

    const fetchCatalog = async (type) => {
      const endpoints = type === 'fertilizer'
        ? ['/fertilizers/selection', '/fertilizers', '/catalogs/fertilizers']
        : ['/pesticides/selection', '/pesticides', '/catalogs/pesticides'];
      for (const endpoint of endpoints) {
        try {
          const res = await api.get(endpoint);
          const items = extractItems(res.data);
          if (items && items.length) return items;
          if (Array.isArray(res.data)) return res.data;
        } catch (err) {
          if (err?.response?.status !== 404) throw err;
        }
      }
      return [];
    };

    Promise.allSettled([
      fetchCatalog('fertilizer'),
      fetchCatalog('pesticide'),
      fetchHistory(),
    ]).then(([fertilizerResult, pesticideResult]) => {
      const nextCatalogs = { fertilizer: [], pesticide: [] };
      const nextErrors = {};

      if (fertilizerResult.status === 'fulfilled') {
        nextCatalogs.fertilizer = fertilizerResult.value || [];
        AsyncStorage.setItem(CATALOG_CACHE_KEY.fertilizer, JSON.stringify(nextCatalogs.fertilizer)).catch(() => { });
      } else {
        nextErrors.fertilizer = fertilizerResult.reason?.response?.status === 403
          ? 'Tài khoản chưa được cấp quyền xem danh mục phân bón.'
          : getApiErrorMessage(fertilizerResult.reason, 'Không thể tải danh mục phân bón.');
      }

      if (pesticideResult.status === 'fulfilled') {
        nextCatalogs.pesticide = pesticideResult.value || [];
        AsyncStorage.setItem(CATALOG_CACHE_KEY.pesticide, JSON.stringify(nextCatalogs.pesticide)).catch(() => { });
      } else {
        nextErrors.pesticide = getApiErrorMessage(pesticideResult.reason, 'Không thể tải danh mục thuốc BVTV.');
      }

      setCatalogs(nextCatalogs);
      setCatalogErrors(nextErrors);
      setCatalogFromCache(false);
    }).finally(() => {
      setLoadingCatalogs(false);
    });
  }, [draftKey, fetchHistory, isOffline, loadPendingLogs, taskId, visible]);

  const hasDraft = Boolean(description.trim() || fertilizers.length || pesticides.length || images.length);

  const resetAndClose = () => {
    Keyboard.dismiss();
    setHarvestQuantity('');
    setHarvestUnit('kg');
    setExecutedArea('');
    setHarvestUnitPickerOpen(false);
    setPickerType(null);
    setUnitPickerTarget(null);
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
      await AsyncStorage.setItem(draftKey, JSON.stringify({
        description,
        fertilizers,
        pesticides,
        images,
        harvestQuantity,
        harvestUnit,
        executedArea,
      }));
      resetAndClose();
      Alert.alert('Đã lưu nháp', 'Nội dung được lưu trên thiết bị và sẽ tự khôi phục khi bạn mở lại công việc này.');
    } catch {
      Alert.alert('Không thể lưu nháp', 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const addMaterial = (item) => {
    const name = catalogName(item) || 'Vật tư';
    const rawMaterialId = valueOf(item.materialId, item.fertilizerId, item.pesticideId, item.id, item.code);
    const rowId = `row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const defaultUnit = pickerType === 'fertilizer' ? 'kg' : 'ml';
    const initialUnit = valueOf(item.unit, item.defaultUnit, item.unitName, item.unitOfMeasure, item.measurementUnit, defaultUnit);
    const setter = pickerType === 'fertilizer' ? setFertilizers : setPesticides;

    setter((current) => [
      ...current,
      {
        id: rowId,
        materialId: rawMaterialId ? String(rawMaterialId) : rowId,
        name,
        quantity: '',
        unit: initialUnit,
        area: '',
      },
    ]);
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
    const extension = asset.fileName?.split('.').pop() || asset.uri?.split('.').pop() || 'jpg';
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
      metadata: asset.metadata ?? null,
    };
  };

  const toRequestMaterials = (items, type) => items.map((item) => ({
    id: item.materialId || item.id,
    materialId: item.materialId || item.id,
    quantity: Number(item.quantity),
    unit: item.unit?.trim() || (type === 'fertilizer' ? 'kg' : 'ml'),
    area: item.area ? Number(item.area) : null,
  }));

  const submit = async () => {
    if (!description.trim()) {
      Alert.alert('Thiếu chi tiết công việc', 'Vui lòng nhập nội dung công việc đã thực hiện.');
      return;
    }

    if (isHarvest) {
      if (!harvestQuantity || Number(harvestQuantity) <= 0) {
        Alert.alert('Sản lượng chưa hợp lệ ⚠️', 'Vui lòng nhập số lượng thu hoạch lớn hơn 0.');
        return;
      }
      if (executedArea && remainingHarvestArea > 0 && Number(executedArea) > remainingHarvestArea) {
        Alert.alert(
          'Diện tích thu hoạch quá giới hạn ⚠️',
          `Diện tích nhập (${executedArea} m²) vượt quá diện tích còn lại chưa thu hoạch (${remainingHarvestArea} m²).`
        );
        return;
      }
    }

    const invalidMaterial = [...fertilizers, ...pesticides].find((item) => !item.id || !item.quantity || Number(item.quantity) <= 0);
    if (invalidMaterial) {
      Alert.alert('Vật tư chưa hợp lệ', `Nhập số lượng lớn hơn 0 cho "${invalidMaterial.name}".`);
      return;
    }

    setSaving(true);
    try {
      // === OFFLINE ===
      if (isOffline) {
        const offlineEntry = {
          taskId,
          task,
          cultivationTaskId: taskId,
          cultivationLogbookId: task?.cultivationLogbookId || task?.logbookId || task?.cultivationLogBookId || undefined,
          landPlotId: task?.landPlotId || task?.plotId || undefined,
          date: new Date().toISOString(),
          description: description.trim(),
          fertilizers: fertilizers.map((f) => ({ ...f, unit: f.unit || 'kg' })),
          pesticides: pesticides.map((p) => ({ ...p, unit: p.unit || 'ml' })),
          imageAssets: images,
          ...(isHarvest ? {
            harvestQuantity: Number(harvestQuantity),
            harvestUnit,
            executedArea: executedArea ? Number(executedArea) : undefined,
            activityType: 'HARVESTING',
          } : {}),
        };

        await offlineQueue.enqueue(offlineEntry);
        if (draftKey) await AsyncStorage.removeItem(draftKey);

        setDescription('');
        setFertilizers([]);
        setPesticides([]);
        setImages([]);
        setHarvestQuantity('');
        setHarvestUnit('kg');
        setExecutedArea('');

        await loadPendingLogs();

        Alert.alert(
          'Đã lưu offline ✓',
          'Ghi chép đã được lưu an toàn trên máy. Bạn có thể xem lại ở mục "Ghi chép chờ đồng bộ (Offline)" bên dưới.',
          [{ text: 'OK' }]
        );
        onSaved?.();
        return;
      }

      // === ONLINE ===
      let uploadedImages = [];
      try {
        uploadedImages = await Promise.all(images.map(uploadImage));
      } catch (imgError) {
        console.warn('[DailyLogModal] Upload ảnh thất bại, tiếp tục gửi log không ảnh:', imgError?.message);
      }

      const reqFertilizers = toRequestMaterials(fertilizers, 'fertilizer');
      const reqPesticides = toRequestMaterials(pesticides, 'pesticide');

      const logPayload = {
        taskId,                    // /cultivation-daily-logs dùng "taskId" để tìm task
        cultivationTaskId: taskId, // các endpoint khác dùng "cultivationTaskId"
        cultivationLogbookId: task?.cultivationLogbookId || task?.logbookId || undefined,
        landPlotId: task?.landPlotId || task?.plotId || undefined,
        date: new Date().toISOString(),
        activityDate: new Date().toISOString(),
        description: description.trim(),
        content: description.trim(),
        notes: description.trim(),
        progress: 100,
        fertilizers: reqFertilizers,
        pesticides: reqPesticides,
        materials: [
          ...reqFertilizers.map((m) => ({ materialId: m.materialId || m.id, quantity: m.quantity, unit: m.unit, area: m.area })),
          ...reqPesticides.map((m) => ({ materialId: m.materialId || m.id, quantity: m.quantity, unit: m.unit, area: m.area })),
        ],
        images: uploadedImages.map((img) => ({
          id: img.id || '',
          url: img.url || img,
          imageUrl: img.url || img,
          caption: 'Ảnh hiện trường',
          metadata: img.metadata || null,
        })),
        ...(isHarvest ? {
          harvestQuantity: Number(harvestQuantity),
          harvestUnit,
          executedArea: executedArea ? Number(executedArea) : undefined,
          activityType: 'HARVESTING',
        } : {}),
      };

      // /cultivation-daily-logs là endpoint đúng (yêu cầu taskId trong body)
      // thử lần lượt các endpoint, dừng khi thành công
      const logEndpoints = [
        '/cultivation-daily-logs',
        `/cultivation-tasks/${taskId}/daily-logs`,
        `/cultivation-tasks/${taskId}/logs`,
        '/cultivation-logs',
      ];
      let success = false;
      let lastError = null;

      for (const endpoint of logEndpoints) {
        try {
          await api.post(endpoint, logPayload);
          success = true;
          break;
        } catch (err) {
          lastError = err;
          // Chỉ bỏ qua lỗi 404 (endpoint không tồn tại), lỗi khác thì dừng ngay
          if (err?.response?.status !== 404) throw err;
        }
      }

      if (!success) {
        throw lastError || new Error('Không thể gửi ghi chép công việc.');
      }

      if (draftKey) await AsyncStorage.removeItem(draftKey);

      const sentItem = {
        id: `sent-${Date.now()}`,
        date: logPayload.date,
        description: logPayload.description,
        progress: 100,
        fertilizers,
        pesticides,
        images: uploadedImages,
      };
      await saveToLocalSentHistory(sentItem);

      resetAndClose();
      Alert.alert('Thành công 🎉', 'Đã lưu và gửi ghi chép công việc.');
      onSaved?.();
    } catch (error) {
      Alert.alert('Không thể gửi ghi chép', getApiErrorMessage(error, 'Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const renderMaterialRows = (type, items) => items.map((item, index) => {
    const enteredArea = Number(item.area || 0);

    // 1. Tính tổng diện tích đã ghi nhận cho loại vật tư này trong lịch sử các ngày trước
    const historyUsedArea = history.reduce((sum, log) => {
      const logMaterials = type === 'fertilizer'
        ? (log.fertilizers || log.materials || [])
        : (log.pesticides || log.materials || []);

      const matched = (Array.isArray(logMaterials) ? logMaterials : []).find((m) => {
        const mName = valueOf(m.name, m.materialName, m.fertilizerName, m.pesticideName);
        const mId = getEntityId(m) || m.id || m.materialId;
        return (mId && (mId === item.materialId || mId === item.id)) || (mName && mName === item.name);
      });

      return sum + Number(matched?.area || 0);
    }, 0);

    // 2. Lấy diện tích đất/vùng trồng từ task, plan, landPlot từ server (VD: totalPlanArea: 181.1)
    const rawPlotArea = valueOf(
      fullTask?.totalPlanArea, fullTask?.plannedArea, fullTask?.planArea,
      fullTask?.landPlot?.area, fullTask?.landPlot?.totalArea, fullTask?.landPlotArea,
      fullTask?.cultivationLogbook?.totalPlanArea, fullTask?.cultivationLogbook?.landPlot?.area, fullTask?.cultivationLogbook?.area,
      fullTask?.cultivationPlan?.totalPlanArea, fullTask?.cultivationPlan?.landPlot?.area, fullTask?.cultivationPlan?.area,
      fullTask?.logbook?.totalPlanArea, fullTask?.logbook?.landPlot?.area, fullTask?.logbook?.area,
      fullTask?.remainingArea, fullTask?.remainingLandArea, fullTask?.area, fullTask?.totalArea,
      fullTask?.plotArea,
      task?.totalPlanArea, task?.plannedArea, task?.planArea,
      task?.landPlot?.area, task?.landPlot?.totalArea, task?.landPlotArea,
      task?.cultivationLogbook?.totalPlanArea, task?.cultivationLogbook?.landPlot?.area, task?.cultivationLogbook?.area,
      task?.cultivationPlan?.totalPlanArea, task?.cultivationPlan?.landPlot?.area, task?.cultivationPlan?.area,
      task?.logbook?.totalPlanArea, task?.logbook?.landPlot?.area, task?.logbook?.area,
      task?.remainingArea, task?.remainingLandArea, task?.area, task?.totalArea, task?.plotArea,
      plan?.totalPlanArea, plan?.plannedArea, plan?.planArea,
      plan?.landPlot?.area, plan?.landPlot?.totalArea, plan?.landPlotArea,
      plan?.area, plan?.totalArea, plan?.plotArea,
      item.remainingArea, item.catalogRemainingArea
    );

    const plotArea = (rawPlotArea !== undefined && rawPlotArea !== null && rawPlotArea !== '' && !isNaN(rawPlotArea))
      ? Number(rawPlotArea)
      : 0;

    const baseRemainingArea = Math.max(0, plotArea - historyUsedArea);
    const currentRemaining = Math.max(0, baseRemainingArea - enteredArea);

    return (
      <View key={item.id} style={styles.materialCard}>
        <View style={styles.materialHeader}>
          <Text style={styles.materialName}>
            <Text style={{ color: '#15803d', fontWeight: '800' }}>{type === 'fertilizer' ? `Loại ${index + 1}: ` : `Thuốc ${index + 1}: `}</Text>
            {item.name}
          </Text>
          <TouchableOpacity onPress={() => removeMaterial(type, item.id)} hitSlop={8}>
            <Feather name="trash-2" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>

        {/* Hiển thị thông tin Diện tích còn lại m2 màu xanh lá chuẩn 100% như Web */}
        <Text style={styles.materialRemainingText}>
          Diện tích còn lại: <Text style={styles.materialRemainingValue}>{formatNumber(currentRemaining)} m2</Text>
        </Text>

        <View style={styles.materialInputs}>
          <TextInput
            style={[styles.smallInput, { flex: 1.1 }]}
            value={item.quantity}
            onChangeText={(value) => updateMaterial(type, item.id, 'quantity', value)}
            placeholder="Lượng *"
            placeholderTextColor="#94a3b8"
            keyboardType="decimal-pad"
          />

          {/* Tự động điền đơn vị có sẵn từ vật tư (kg/ml) */}
          <View style={styles.autoUnitBadge}>
            <Text style={styles.autoUnitText} numberOfLines={1}>
              {item.unit || (type === 'fertilizer' ? 'kg' : 'ml')}
            </Text>
          </View>

          {/* Ô nhập Diện tích + nhãn m2 cố định */}
          <View style={styles.areaContainer}>
            <TextInput
              style={[styles.smallInput, { flex: 1 }]}
              value={item.area}
              onChangeText={(value) => updateMaterial(type, item.id, 'area', value)}
              placeholder="Diện tích"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
            />
            <View style={styles.disabledUnitBadge}>
              <Text style={styles.disabledUnitText}>m2</Text>
            </View>
          </View>
        </View>

        {/* Khuyến nghị lượng nông dược real-time */}
        {item.quantity && Number(item.quantity) > 0 && item.area && Number(item.area) > 0 ? (
          <View style={styles.recommendationBox}>
            <Feather name="info" size={14} color="#92400e" style={{ marginRight: 6, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recommendationTitle}>
                {`Khuyến nghị lượng nông dược:`}
              </Text>
              <Text style={styles.recommendationText}>
                {`${item.quantity} ${item.unit || (type === 'fertilizer' ? 'kg' : 'ml')} cho ${item.area} m2`}
              </Text>
              <Text style={styles.recommendationNote}>
                Tính theo liều lượng đã khai báo trong chi tiết nông dược.
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  });

  const selectedCatalog = pickerType ? catalogs[pickerType] : [];
  const selectedError = pickerType ? catalogErrors[pickerType] : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={requestClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={requestClose} disabled={saving}>
            <Feather name="arrow-left" size={22} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Ghi chép công việc</Text>
            {task?.taskName || task?.title || task?.name ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>{task?.taskName || task?.title || task?.name}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.headerButton} onPress={requestClose} disabled={saving}>
            <Feather name="x" size={23} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* Banner offline & đồng bộ */}
        {isOffline ? (
          <View style={styles.offlineBanner}>
            <Feather name="wifi-off" size={14} color="#92400e" />
            <Text style={styles.offlineBannerText}>
              Không có mạng — ghi chép sẽ được lưu offline{pendingLogs.length > 0 ? ` (${pendingLogs.length} ghi chép đang chờ)` : ''}
            </Text>
          </View>
        ) : pendingLogs.length > 0 ? (
          <TouchableOpacity style={styles.syncBanner} onPress={handleManualSync} disabled={isSyncing}>
            {isSyncing ? (
              <ActivityIndicator size="small" color="#1d4ed8" style={{ marginRight: 8 }} />
            ) : (
              <Feather name="upload-cloud" size={16} color="#1d4ed8" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.syncBannerText}>
              {isSyncing
                ? `Đang đồng bộ ${pendingLogs.length} ghi chép...`
                : `Có ${pendingLogs.length} ghi chép offline chưa gửi — Chạm để đồng bộ ngay ⚡`}
            </Text>
          </TouchableOpacity>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Badge bộ nhớ đệm */}
          {catalogFromCache ? (
            <View style={styles.cacheBanner}>
              <Feather name="database" size={13} color="#6d28d9" />
              <Text style={styles.cacheBannerText}>Danh mục vật tư từ bộ nhớ đệm (offline)</Text>
            </View>
          ) : null}

          {/* Cảnh báo thời gian cách ly nông dược */}
          {quarantineWarn.hasWarning ? (
            <View style={styles.quarantineBanner}>
              <View style={styles.quarantineHeader}>
                <Feather name="alert-triangle" size={18} color="#b91c1c" />
                <Text style={styles.quarantineTitle}>Cảnh báo thời gian cách ly nông dược</Text>
              </View>
              <Text style={styles.quarantineText}>{quarantineWarn.message}</Text>
            </View>
          ) : null}

          {/* FORM NHẬP THU HOẠCH (HARVESTING) */}
          {isHarvest ? (
            <View style={[styles.section, styles.harvestSection]}>
              <View style={styles.harvestHeader}>
                <Feather name="shopping-bag" size={18} color="#15803d" />
                <Text style={[styles.sectionTitle, { color: '#15803d', marginBottom: 0 }]}>
                  Nhập sản lượng & diện tích thu hoạch
                </Text>
              </View>

              {totalPlanArea > 0 ? (
                <View style={styles.harvestSummaryBox}>
                  <Text style={styles.harvestSummaryText}>
                    Diện tích quy hoạch: <Text style={{ fontWeight: '700' }}>{totalPlanArea} m2</Text> | Đã thu: <Text style={{ fontWeight: '700' }}>{harvestedArea} m2</Text>
                  </Text>
                  <Text style={[styles.harvestSummaryText, { color: remainingHarvestArea > 0 ? '#15803d' : '#dc2626', marginTop: 2 }]}>
                    Còn lại có thể thu hoạch: <Text style={{ fontWeight: '800' }}>{remainingHarvestArea} m2</Text>
                  </Text>
                </View>
              ) : null}

              <View style={styles.harvestRow}>
                <View style={{ flex: 1.6 }}>
                  <Text style={styles.label}>Sản lượng thu hoạch <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={harvestQuantity}
                    onChangeText={setHarvestQuantity}
                    placeholder="Nhập số lượng..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Đơn vị</Text>
                  <TouchableOpacity
                    style={styles.unitDropdownButton}
                    onPress={() => setHarvestUnitPickerOpen(true)}
                  >
                    <Text style={styles.unitDropdownText}>{harvestUnit}</Text>
                    <Feather name="chevron-down" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Diện tích thu hoạch thực tế (m2)</Text>
                <TextInput
                  style={styles.input}
                  value={executedArea}
                  onChangeText={setExecutedArea}
                  placeholder={remainingHarvestArea > 0 ? `Tối đa ${remainingHarvestArea} m2...` : 'Nhập diện tích m2...'}
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nội dung thực hiện</Text>
            {task?.description ? <Text style={styles.taskDescription}>{task.description}</Text> : null}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Chi tiết công việc <Text style={styles.required}>*</Text></Text>
              <VoiceInputButton
                disabled={saving}
                onResult={(text) =>
                  setDescription((prev) =>
                    prev ? `${prev.trim()} ${text}` : text
                  )
                }
                style={styles.voiceBtn}
              />
            </View>
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

          {/* Phân bón & Thuốc BVTV: ẩn khi task Thu hoạch (HARVESTING) */}
          {!isHarvest ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Phân bón</Text>
                {catalogErrors.fertilizer ? <Text style={styles.warning}>{catalogErrors.fertilizer}</Text> : null}
                {renderMaterialRows('fertilizer', fertilizers)}
                <TouchableOpacity style={styles.addButton} onPress={() => { Keyboard.dismiss(); setPickerType('fertilizer'); }} disabled={loadingCatalogs}>
                  {loadingCatalogs ? <ActivityIndicator color="#15803d" /> : <Feather name="plus" size={18} color="#15803d" />}
                  <Text style={styles.addButtonText}>Thêm phân bón</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thuốc bảo vệ thực vật</Text>
                {catalogErrors.pesticide ? <Text style={styles.warning}>{catalogErrors.pesticide}</Text> : null}
                {renderMaterialRows('pesticide', pesticides)}
                <TouchableOpacity style={styles.addButton} onPress={() => { Keyboard.dismiss(); setPickerType('pesticide'); }} disabled={loadingCatalogs}>
                  {loadingCatalogs ? <ActivityIndicator color="#15803d" /> : <Feather name="plus" size={18} color="#15803d" />}
                  <Text style={styles.addButtonText}>Thêm thuốc BVTV</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

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
                    {image.metadata?.lat != null ? (
                      <View style={styles.gpsBadge}>
                        <Feather name="map-pin" size={9} color="#fff" />
                        <Text style={styles.gpsBadgeText}>GPS</Text>
                      </View>
                    ) : null}
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

          {/* DANG CHO DONG BO (OFFLINE) SECTION */}
          {pendingLogs.length > 0 ? (
            <View style={[styles.section, styles.pendingSection]}>
              <View style={styles.historyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="cloud-off" size={18} color="#d97706" />
                  <Text style={[styles.sectionTitle, { color: '#b45309', marginBottom: 0 }]}>
                    Ghi chép chờ đồng bộ (Offline)
                  </Text>
                </View>
                <View style={styles.pendingCountBadge}>
                  <Text style={styles.pendingCountBadgeText}>{pendingLogs.length}</Text>
                </View>
              </View>

              {pendingLogs.map((item) => (
                <View key={item.id} style={styles.pendingCard}>
                  <View style={styles.pendingCardHeader}>
                    <View style={styles.pendingBadge}>
                      <Feather name="clock" size={12} color="#b45309" />
                      <Text style={styles.pendingBadgeText}>Chưa đồng bộ</Text>
                    </View>
                    <Text style={styles.pendingDate}>
                      {formatVietnamDateTime(item.createdAt || item.date, 'Gần đây')}
                    </Text>
                  </View>

                  <Text style={styles.pendingDescription}>{item.description}</Text>

                  {item.fertilizers?.length || item.pesticides?.length ? (
                    <Text style={styles.pendingMaterials}>
                      Vật tư: {[...(item.fertilizers || []), ...(item.pesticides || [])].map((m) => m.name).join(', ')}
                    </Text>
                  ) : null}

                  {item.imageAssets?.length ? (
                    <Text style={styles.pendingImagesHint}>
                      📷 {item.imageAssets.length} ảnh minh chứng hiện trường
                    </Text>
                  ) : null}

                  <View style={styles.pendingCardFooter}>
                    {!isOffline ? (
                      <TouchableOpacity
                        style={styles.syncItemButton}
                        onPress={handleManualSync}
                        disabled={isSyncing}
                      >
                        <Feather name="upload-cloud" size={14} color="#fff" />
                        <Text style={styles.syncItemButtonText}>Thử gửi ngay</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.offlineNoteText}>Sẽ gửi khi có mạng Wi-Fi/4G</Text>
                    )}

                    <TouchableOpacity
                      style={styles.deletePendingButton}
                      onPress={() => handleDeletePending(item.id)}
                    >
                      <Feather name="trash-2" size={15} color="#dc2626" />
                      <Text style={styles.deletePendingText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* LICHSU GHI CHEP CHINH THUC SECTION */}
          <View style={styles.section}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, styles.historyTitle]}>Lịch sử ghi chép đã gửi</Text>
              <View style={styles.historyBadge}>
                <Text style={styles.historyBadgeText}>{history.length} bản ghi</Text>
              </View>
            </View>
            {loadingHistory ? <ActivityIndicator color="#15803d" style={styles.historyLoader} /> : null}
            {!loadingHistory && history.map((log, index) => {
              const materialsList = log.materials || [...(log.fertilizers || []), ...(log.pesticides || [])];
              const imgList = log.images || [];

              return (
                <View key={getEntityId(log) || log.id || index} style={styles.historyCard}>
                  <View style={styles.historyDateRow}>
                    <Feather name="check-circle" size={14} color="#16a34a" />
                    <Text style={styles.historyDate}>
                      {formatVietnamDateTime(valueOf(log.createdAt, log.date, log.performedAt, log.activityDate), 'Gần đây')}
                    </Text>
                    {log.progress != null ? (
                      <View style={styles.progressTag}>
                        <Text style={styles.progressTagText}>Tiến độ: {log.progress}%</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.historyDescription}>
                    {valueOf(log.description, log.notes, log.content, 'Đã ghi nhận công việc')}
                  </Text>

                  {materialsList && materialsList.length > 0 ? (
                    <Text style={styles.historyMaterialsText}>
                      📦 Vật tư: {materialsList.map((m) => m.name || m.materialName || m.materialId).filter(Boolean).join(', ')}
                    </Text>
                  ) : null}

                  {imgList && imgList.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      {imgList.map((img, imgIdx) => (
                        <Image
                          key={img.id || imgIdx}
                          source={{ uri: typeof img === 'string' ? img : (img.url || img.imageUrl) }}
                          style={{ width: 52, height: 52, borderRadius: 8, marginRight: 6 }}
                        />
                      ))}
                    </ScrollView>
                  ) : null}
                </View>
              );
            })}
            {!loadingHistory && !history.length && !pendingLogs.length ? (
              <View style={styles.historyEmpty}>
                <Feather name="inbox" size={34} color="#cbd5e1" />
                <Text style={styles.historyEmptyText}>Chưa có bản ghi nào</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
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
                <Text style={styles.submitText}>{isOffline ? 'Lưu offline' : 'Lưu nhật ký'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* POPUP CHON VAT TU (CATALOG) */}
        {pickerType ? (
          <View style={styles.pickerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerType(null)} />
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{pickerType === 'fertilizer' ? 'Chọn phân bón' : 'Chọn thuốc BVTV'}</Text>
                <TouchableOpacity onPress={() => setPickerType(null)}>
                  <Feather name="x" size={22} color="#475569" />
                </TouchableOpacity>
              </View>
              {selectedError ? <Text style={styles.pickerMessage}>{selectedError}</Text> : null}
              {!selectedError && !selectedCatalog.length ? (
                <Text style={styles.pickerMessage}>Danh mục hiện chưa có dữ liệu.</Text>
              ) : null}
              <FlatList
                data={selectedCatalog}
                keyExtractor={(item, index) => String(getEntityId(item) || index)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.catalogItem} onPress={() => addMaterial(item)}>
                    <View style={styles.catalogIcon}>
                      <Feather name="package" size={18} color="#15803d" />
                    </View>
                    <View style={styles.catalogText}>
                      <Text style={styles.catalogName}>{catalogName(item)}</Text>
                      <Text style={styles.catalogUnit}>{valueOf(item.unit, item.code, 'Chưa có đơn vị')}</Text>
                    </View>
                    <Feather name="plus-circle" size={20} color="#16a34a" />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        ) : null}

        {/* POPUP CHON DON VI (UNIT DROPDOWN) */}
        {unitPickerTarget ? (
          <View style={styles.pickerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setUnitPickerTarget(null)} />
            <View style={styles.unitPickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>
                  Chọn đơn vị tính ({unitPickerTarget.type === 'fertilizer' ? 'Phân bón' : 'Thuốc BVTV'})
                </Text>
                <TouchableOpacity onPress={() => setUnitPickerTarget(null)}>
                  <Feather name="x" size={22} color="#475569" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 340 }}>
                {(unitPickerTarget.type === 'fertilizer' ? FERTILIZER_UNITS : PESTICIDE_UNITS).map((unitOption) => {
                  const isSelected = unitPickerTarget.currentUnit === unitOption;
                  return (
                    <TouchableOpacity
                      key={unitOption}
                      style={[styles.unitOptionItem, isSelected && styles.unitOptionSelected]}
                      onPress={() => {
                        updateMaterial(unitPickerTarget.type, unitPickerTarget.id, 'unit', unitOption);
                        setUnitPickerTarget(null);
                      }}
                    >
                      <Text style={[styles.unitOptionText, isSelected && styles.unitOptionTextSelected]}>
                        {unitOption}
                      </Text>
                      {isSelected ? <Feather name="check" size={16} color="#16a34a" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {/* Harvest Unit Picker Modal */}
        <Modal visible={harvestUnitPickerOpen} transparent animationType="fade" onRequestClose={() => setHarvestUnitPickerOpen(false)}>
          <Pressable style={styles.pickerOverlay} onPress={() => setHarvestUnitPickerOpen(false)}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Chọn đơn vị thu hoạch</Text>
                <TouchableOpacity onPress={() => setHarvestUnitPickerOpen(false)}>
                  <Feather name="x" size={20} color="#334155" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 280 }}>
                {HARVEST_UNITS.map((u) => {
                  const isSelected = harvestUnit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitOptionItem, isSelected && styles.unitOptionSelected]}
                      onPress={() => {
                        setHarvestUnit(u);
                        setHarvestUnitPickerOpen(false);
                      }}
                    >
                      <Text style={[styles.unitOptionText, isSelected && styles.unitOptionTextSelected]}>
                        {u}
                      </Text>
                      {isSelected ? <Feather name="check" size={16} color="#15803d" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

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
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingHorizontal: 14,
    paddingBottom: 13,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  headerSubtitle: { color: '#16a34a', fontSize: 12, fontWeight: '700', marginTop: 2, maxWidth: '90%' },
  content: { padding: 14, paddingBottom: 28 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 13,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionTitle: { color: '#1e293b', fontSize: 15, fontWeight: '900', marginBottom: 13 },
  taskDescription: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#f8fafc',
    borderRadius: 9,
    padding: 10,
    marginBottom: 12,
  },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginBottom: 0 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  voiceBtn: { marginRight: 2 },
  required: { color: '#dc2626' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#0f172a',
    backgroundColor: '#fff',
    fontSize: 14,
  },
  textarea: { minHeight: 112, lineHeight: 20 },
  warning: { color: '#b45309', backgroundColor: '#fffbeb', borderRadius: 8, padding: 9, fontSize: 12, lineHeight: 17, marginBottom: 9 },
  addButton: {
    minHeight: 44,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#22c55e',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addButtonText: { color: '#15803d', fontWeight: '800', fontSize: 13 },
  materialCard: { borderWidth: 1, borderColor: '#dbe4df', borderRadius: 11, padding: 11, marginBottom: 10, backgroundColor: '#f8fafc' },
  materialHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  materialName: { flex: 1, color: '#1e293b', fontWeight: '800', marginRight: 10 },
  materialInputs: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#94a3b8', borderRadius: 9, paddingHorizontal: 10, color: '#0f172a', backgroundColor: '#fff' },
  unitDropdownButton: {
    height: 44,
    flex: 0.9,
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 10,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  unitDropdownText: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  areaContainer: { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  disabledUnitBadge: {
    height: 44,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  disabledUnitText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  unitPickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
    padding: 16,
    width: '100%',
  },
  unitOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitOptionSelected: { backgroundColor: '#f0fdf4' },
  unitOptionText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  unitOptionTextSelected: { color: '#15803d', fontWeight: '800' },
  imagePicker: { height: 112, borderWidth: 1, borderStyle: 'dashed', borderColor: '#22c55e', borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fffa' },
  imagePickerDisabled: { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' },
  imagePickerText: { color: '#15803d', fontWeight: '800', marginTop: 7 },
  imageHint: { color: '#64748b', fontSize: 12, marginTop: 3 },
  imageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  imageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  imageBadgeText: { color: '#15803d', fontSize: 11, fontWeight: '700' },
  previewRow: { marginTop: 12 },
  previewWrap: { marginRight: 10, position: 'relative' },
  preview: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#e2e8f0' },
  gpsBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(22, 163, 74, 0.9)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 2 },
  gpsBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  timeBadge: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  timeBadgeText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  removeImage: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(220, 38, 38, 0.9)', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  offlineBanner: { backgroundColor: '#fef3c7', paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  offlineBannerText: { color: '#92400e', fontSize: 12, fontWeight: '700', flex: 1 },
  syncBanner: { backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#bfdbfe' },
  syncBannerText: { color: '#1d4ed8', fontSize: 13, fontWeight: '700', flex: 1 },
  cacheBanner: { backgroundColor: '#f3e8ff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 13 },
  cacheBannerText: { color: '#6d28d9', fontSize: 12, fontWeight: '700' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  historyTitle: { marginBottom: 0 },
  historyBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  historyBadgeText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  historyLoader: { marginVertical: 16 },
  historyCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  historyDate: { color: '#15803d', fontSize: 12, fontWeight: '800', flex: 1 },
  progressTag: { backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  progressTagText: { color: '#16a34a', fontSize: 11, fontWeight: '800' },
  historyDescription: { color: '#1e293b', fontSize: 13, lineHeight: 19, fontWeight: '500' },
  historyMaterialsText: { color: '#15803d', fontSize: 12, fontWeight: '700', marginTop: 6 },
  historyEmpty: { alignItems: 'center', paddingVertical: 24 },
  historyEmptyText: { color: '#94a3b8', fontSize: 13, marginTop: 8 },
  footer: { padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', gap: 10 },
  footerButton: { flex: 1, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  draftButton: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  draftText: { color: '#475569', fontWeight: '800', fontSize: 15 },
  submitButton: { backgroundColor: '#16a34a' },
  offlineButton: { backgroundColor: '#d97706' },
  submitInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  pickerOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', padding: 16 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle: { color: '#0f172a', fontSize: 17, fontWeight: '900' },
  pickerMessage: { color: '#b45309', backgroundColor: '#fffbeb', borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 },
  catalogItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  catalogIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  catalogText: { flex: 1 },
  catalogName: { color: '#1e293b', fontSize: 14, fontWeight: '800' },
  catalogUnit: { color: '#64748b', fontSize: 12, marginTop: 2 },
  // PENDING SECTION STYLES
  pendingSection: { borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbe8' },
  pendingCountBadge: { backgroundColor: '#d97706', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  pendingCountBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  pendingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#fcd34d' },
  pendingCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pendingBadgeText: { color: '#b45309', fontSize: 11, fontWeight: '800' },
  pendingDate: { color: '#78350f', fontSize: 11, fontWeight: '700' },
  pendingDescription: { color: '#1e293b', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  pendingMaterials: { color: '#15803d', fontSize: 12, fontWeight: '700', marginTop: 6 },
  pendingImagesHint: { color: '#475569', fontSize: 12, marginTop: 4 },
  pendingCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fef3c7' },
  syncItemButton: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncItemButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  offlineNoteText: { color: '#92400e', fontSize: 11, fontStyle: 'italic' },
  deletePendingButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  deletePendingText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  // QUARANTINE & HARVEST STYLES
  quarantineBanner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5', borderRadius: 12, padding: 12, marginBottom: 13, gap: 6 },
  quarantineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quarantineTitle: { fontSize: 14, fontWeight: '800', color: '#991b1b' },
  quarantineText: { fontSize: 13, color: '#b91c1c', lineHeight: 18 },
  recommendationBox: { flexDirection: 'row', backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 10, padding: 10, marginTop: 8, alignItems: 'flex-start' },
  recommendationTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 2 },
  recommendationText: { fontSize: 14, fontWeight: '800', color: '#78350f', marginBottom: 2 },
  recommendationNote: { fontSize: 11, color: '#a16207', lineHeight: 15 },

  harvestSection: { borderWidth: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  harvestHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  harvestSummaryBox: { backgroundColor: '#ffffff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12 },
  harvestSummaryText: { fontSize: 12, color: '#166534', lineHeight: 18 },
  harvestRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  autoUnitBadge: {
    height: 44,
    minWidth: 54,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  autoUnitText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  materialRemainingText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 8,
  },
  materialRemainingValue: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '800',
  },
  areaContainer: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  disabledUnitBadge: {
    height: 44,
    minWidth: 44,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledUnitText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
});

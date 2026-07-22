import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { getLocationWithAddress } from '../../../shared/services/locationService';
import { formatVietnamDateTime } from '../../../features/notifications/utils/dateTime';

/**
 * Format tọa độ: 10.7769° N, 106.7009° E
 */
function formatCoords(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}

/**
 * Màn hình camera fullscreen cho chụp ảnh hiện trường.
 *
 * Props:
 *   visible: boolean
 *   onCapture: (asset: { uri, metadata }) => void
 *   onClose: () => void
 */
export default function FieldCameraScreen({ visible, onCapture, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [locationState, setLocationState] = useState(null); // null=loading, false=denied, {...}=got
  const [locationLoading, setLocationLoading] = useState(true);
  const [capturedUri, setCapturedUri] = useState(null);
  const [capturedMetadata, setCapturedMetadata] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);

  // Lấy GPS khi mở màn hình
  useEffect(() => {
    if (!visible) {
      // Reset khi đóng
      setCapturedUri(null);
      setCapturedMetadata(null);
      setLocationLoading(true);
      return;
    }

    setLocationLoading(true);
    getLocationWithAddress().then((loc) => {
      setLocationState(loc); // null = denied/fail
      setLocationLoading(false);
    });
  }, [visible]);

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      const capturedAt = new Date().toISOString();
      setCapturedUri(photo.uri);
      setCapturedMetadata({
        capturedAt,
        lat: locationState?.lat ?? null,
        lng: locationState?.lng ?? null,
        accuracy: locationState?.accuracy ?? null,
        address: locationState?.address ?? null,
      });
    } finally {
      setCapturing(false);
    }
  };

  const handleConfirm = () => {
    if (!capturedUri) return;
    onCapture({
      uri: capturedUri,
      fileName: `field-${Date.now()}.jpg`,
      mimeType: 'image/jpeg',
      metadata: capturedMetadata,
    });
    setCapturedUri(null);
    setCapturedMetadata(null);
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setCapturedMetadata(null);
  };

  if (!visible) return null;

  // --- Chưa cấp quyền camera ---
  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.center}>
          <ActivityIndicator color="#16a34a" />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.permissionScreen}>
          <Feather name="camera-off" size={56} color="#94a3b8" />
          <Text style={styles.permissionTitle}>Cần quyền camera</Text>
          <Text style={styles.permissionDesc}>
            Cho phép truy cập camera để chụp ảnh minh chứng tại hiện trường.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Cấp quyền</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionCancel} onPress={onClose}>
            <Text style={styles.permissionCancelText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // --- Preview ảnh vừa chụp ---
  if (capturedUri && capturedMetadata) {
    const hasGps = capturedMetadata.lat !== null;
    return (
      <Modal visible={visible} animationType="fade" onRequestClose={handleRetake}>
        <View style={styles.previewScreen}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />

          {/* Metadata overlay */}
          <View style={styles.metaOverlay}>
            <View style={styles.metaRow}>
              <Feather name="clock" size={13} color="#fff" />
              <Text style={styles.metaText}>
                {formatVietnamDateTime(capturedMetadata.capturedAt, '')}
              </Text>
            </View>
            {hasGps ? (
              <>
                <View style={styles.metaRow}>
                  <Feather name="map-pin" size={13} color="#4ade80" />
                  <Text style={styles.metaText}>
                    {formatCoords(capturedMetadata.lat, capturedMetadata.lng)}
                    {capturedMetadata.accuracy != null
                      ? `  ±${Math.round(capturedMetadata.accuracy)}m`
                      : ''}
                  </Text>
                </View>
                {capturedMetadata.address ? (
                  <View style={styles.metaRow}>
                    <Feather name="navigation" size={13} color="#4ade80" />
                    <Text style={styles.metaText} numberOfLines={2}>
                      {capturedMetadata.address}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.metaRow}>
                <Feather name="alert-circle" size={13} color="#fbbf24" />
                <Text style={[styles.metaText, { color: '#fbbf24' }]}>GPS không khả dụng</Text>
              </View>
            )}
          </View>

          {/* Nút hành động */}
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
              <Feather name="rotate-ccw" size={20} color="#334155" />
              <Text style={styles.retakeBtnText}>Chụp lại</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>Dùng ảnh này</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // --- Màn hình camera live ---
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.cameraScreen}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

        {/* Overlays dùng absolute positioning — không đặt vào trong CameraView */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity style={styles.cameraHeaderBtn} onPress={onClose}>
              <Feather name="x" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Ảnh minh chứng</Text>
            <TouchableOpacity
              style={styles.cameraHeaderBtn}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            >
              <Feather name="refresh-cw" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* GPS overlay ở dưới cùng phần camera (trên nút chụp) */}
          <View style={styles.gpsOverlay}>
            {locationLoading ? (
              <View style={styles.gpsRow}>
                <ActivityIndicator size="small" color="#4ade80" />
                <Text style={styles.gpsText}>Đang lấy vị trí GPS...</Text>
              </View>
            ) : locationState ? (
              <>
                <View style={styles.gpsRow}>
                  <View style={styles.gpsDot} />
                  <Text style={styles.gpsText}>
                    {formatCoords(locationState.lat, locationState.lng)}
                    {locationState.accuracy != null
                      ? `  ±${Math.round(locationState.accuracy)}m`
                      : ''}
                  </Text>
                </View>
                {locationState.address ? (
                  <Text style={styles.gpsAddress} numberOfLines={1}>
                    📍 {locationState.address}
                  </Text>
                ) : null}
              </>
            ) : (
              <View style={styles.gpsRow}>
                <Feather name="alert-circle" size={14} color="#fbbf24" />
                <Text style={[styles.gpsText, { color: '#fbbf24' }]}>GPS không khả dụng — ảnh sẽ không có tọa độ</Text>
              </View>
            )}
          </View>
        </View>

        {/* Nút chụp (nằm ngoài CameraView để không bị che) */}
        <View style={styles.captureRow}>
          <View style={styles.captureRowSide} />
          <TouchableOpacity
            style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={capturing}
          >
            {capturing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
          <View style={styles.captureRowSide} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },

  // Permission screen
  permissionScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: 32 },
  permissionTitle: { color: '#f1f5f9', fontSize: 22, fontWeight: '900', marginTop: 20, marginBottom: 10 },
  permissionDesc: { color: '#94a3b8', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  permissionBtn: { backgroundColor: '#16a34a', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginBottom: 12 },
  permissionBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  permissionCancel: { paddingVertical: 10 },
  permissionCancelText: { color: '#64748b', fontWeight: '700' },

  // Camera screen
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 58 : 28, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraHeaderBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  cameraTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  gpsOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: 14,
  },
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ade80' },
  gpsText: { color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', flexShrink: 1 },
  gpsAddress: { color: '#d1fae5', fontSize: 11, marginTop: 4, fontWeight: '600' },

  // Capture button (below camera view)
  captureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#000', paddingVertical: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  captureRowSide: { flex: 1 },
  captureBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#16a34a',
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },

  // Preview screen
  previewScreen: { flex: 1, backgroundColor: '#000' },
  previewImage: { flex: 1 },
  metaOverlay: {
    position: 'absolute', bottom: 120, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.72)', padding: 14, gap: 7,
  },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaText: {
    color: '#fff', fontSize: 12, fontWeight: '700', flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  previewActions: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 44 : 20,
    backgroundColor: '#0f172a',
  },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, minHeight: 52, borderRadius: 12,
    borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b',
  },
  retakeBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 15 },
  confirmBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, minHeight: 52, borderRadius: 12, backgroundColor: '#16a34a',
  },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});

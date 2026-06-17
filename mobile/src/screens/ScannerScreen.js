import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, TextInput, Alert, SafeAreaView } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Feather } from '@expo/vector-icons';

export default function ScannerScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState('');

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarcodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    
    // Giả sử mã QR là link như ebookfarm.vn/trace/QR_CODE_12345
    // Ta bóc tách QR code thực tế
    let qrCode = data;
    if (data.includes('/trace/')) {
      const parts = data.split('/trace/');
      qrCode = parts[parts.length - 1];
    }
    
    Alert.alert('Thành công', `Đã tìm thấy mã: ${qrCode}`);
    navigation.navigate('TraceDetail', { qrCode });
    
    // Reset scanner after 2 seconds
    setTimeout(() => setScanned(false), 2000);
  };

  const handleSimulate = () => {
    if (!simulatedCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã QR giả lập để test!');
      return;
    }
    navigation.navigate('TraceDetail', { qrCode: simulatedCode.trim() });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Đang yêu cầu quyền truy cập Camera...</Text>
      </View>
    );
  }
  
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Ứng dụng không có quyền truy cập Camera.</Text>
        
        {/* Helper for Emulator/No Camera testing */}
        <View style={styles.simContainer}>
          <Text style={styles.simTitle}>Chạy giả lập (Không có Camera)?</Text>
          <TextInput
            style={styles.simInput}
            placeholder="Nhập mã QR để thử nghiệm..."
            value={simulatedCode}
            onChangeText={setSimulatedCode}
          />
          <TouchableOpacity style={styles.simButton} onPress={handleSimulate}>
            <Text style={styles.simBtnText}>Truy xuất giả lập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trình quét mã QR</Text>
      </View>

      <View style={styles.cameraOuter}>
        <CameraView
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Overlays for QR Scanner frame */}
        <View style={styles.overlayFrame}>
          <View style={styles.scanTarget} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Di chuyển Camera đến mã QR của lô nông sản để tiến hành kiểm tra & truy xuất nguồn gốc.
        </Text>
        
        {/* simulated scan for development convenience */}
        <View style={styles.simInline}>
          <TextInput
            style={styles.simInlineInput}
            placeholder="Nhập mã QR thủ công..."
            value={simulatedCode}
            onChangeText={setSimulatedCode}
          />
          <TouchableOpacity style={styles.simInlineBtn} onPress={handleSimulate}>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cameraOuter: {
    flex: 1,
    position: 'relative',
  },
  overlayFrame: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 4,
    borderColor: '#16a34a',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '500',
  },
  simContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  simTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  simInput: {
    height: 48,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  simButton: {
    height: 48,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 15,
  },
  simInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simInlineInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 14,
  },
  simInlineBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  }
});

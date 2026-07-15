import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import {farmerRepository} from '../../repositories/farmerRepository';
import {colors} from '../../theme/colors';

export default function DailyReportScreen({navigation, route}) {
  const {userId, phaseId, phaseName} = route.params || {};
  
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handlePickImage = useCallback(() => {
    Alert.alert('Chọn ảnh', 'Bạn muốn chụp ảnh mới hay chọn từ thư viện?', [
      {
        text: 'Chụp ảnh',
        onPress: () => {
          launchCamera(
            {
              mediaType: 'photo',
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 0.8,
            },
            response => {
              if (response.assets && response.assets[0]) {
                if (images.length >= 2) {
                  Alert.alert('Thông báo', 'Chỉ được chọn tối đa 2 ảnh');
                  return;
                }
                setImages([...images, response.assets[0]]);
              }
            },
          );
        },
      },
      {
        text: 'Chọn từ thư viện',
        onPress: () => {
          launchImageLibrary(
            {
              mediaType: 'photo',
              maxWidth: 1200,
              maxHeight: 1200,
              quality: 0.8,
              selectionLimit: 2 - images.length,
            },
            response => {
              if (response.assets) {
                setImages([...images, ...response.assets.slice(0, 2 - images.length)]);
              }
            },
          );
        },
      },
      {text: 'Hủy', style: 'cancel'},
    ]);
  }, [images]);

  const handleRemoveImage = useCallback(index => {
    setImages(images.filter((_, i) => i !== index));
  }, [images]);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập ghi chú về công việc đã làm');
      return;
    }

    try {
      setLoading(true);

      const reportData = {
        report_date: new Date().toISOString(),
        notes: notes.trim(),
        images: images.map(img => ({
          uri: img.uri,
          type: img.type,
          fileName: img.fileName,
        })),
      };

      await farmerRepository.createDailyReport(userId, phaseId, reportData);

      Alert.alert(
        'Thành công',
        'Báo cáo đã được lưu (Offline)\n\nSẽ tự động đồng bộ khi có mạng',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể lưu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Báo cáo hàng ngày</Text>
          <Text style={styles.headerSubtitle}>{phaseName || 'Công việc'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}>
        {/* Instructions */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionIcon}>
            <Feather name="info" size={24} color={colors.blue600} />
          </View>
          <Text style={styles.instructionText}>
            Hãy ghi chú những công việc bạn đã hoàn thành hôm nay. Dữ liệu sẽ
            được lưu ngay cả khi không có mạng.
          </Text>
        </View>

        {/* Date Display */}
        <View style={styles.section}>
          <Text style={styles.label}>Ngày báo cáo</Text>
          <View style={styles.dateCard}>
            <Feather name="calendar" size={20} color={colors.green600} />
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Ghi chú công việc <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Ví dụ: Đã làm đất xong 2 mẫu, sử dụng máy cày..."
            placeholderTextColor="#9ca3af"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.hint}>
            {notes.length}/500 ký tự
          </Text>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Hình ảnh minh họa (Tối đa 2 ảnh)
          </Text>
          
          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageCard}>
                <Image source={{uri: image.uri}} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(index)}>
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 2 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={handlePickImage}>
                <Feather name="camera" size={32} color={colors.gray400} />
                <Text style={styles.addImageText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Offline Notice */}
        <View style={styles.offlineNotice}>
          <Feather name="wifi-off" size={20} color={colors.orange500} />
          <Text style={styles.offlineText}>
            Báo cáo sẽ được lưu trên máy và tự động đồng bộ khi có mạng
          </Text>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check-circle" size={28} color="#fff" />
              <Text style={styles.submitButtonText}>ĐÃ LÀM XONG - GỬI BÁO CÁO</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: colors.green600,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dcfce7',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.blue600,
  },
  instructionIcon: {
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.blue900,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: 8,
  },
  required: {
    color: colors.red600,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.green200,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginLeft: 12,
    textTransform: 'capitalize',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.gray300,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.gray900,
    minHeight: 150,
  },
  hint: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    textAlign: 'right',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageCard: {
    width: 160,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.gray200,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.red600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 160,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    marginTop: 8,
  },
  offlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.orange50,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.orange200,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: colors.orange900,
    marginLeft: 8,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  submitButton: {
    backgroundColor: colors.green600,
    paddingVertical: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.green600,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    backgroundColor: colors.gray400,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    marginLeft: 12,
    letterSpacing: 0.5,
  },
});

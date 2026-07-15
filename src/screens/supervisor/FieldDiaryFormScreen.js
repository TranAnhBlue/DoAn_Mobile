import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {apiClient} from '../../services/apiClient';
import {colors} from '../../theme/colors';

export default function FieldDiaryFormScreen({navigation, route}) {
  const {seasonId, phaseId, phaseTitle} = route.params;

  const [content, setContent] = useState('');
  const [weather, setWeather] = useState('');
  const [plantCondition, setPlantCondition] = useState('');
  const [soilCondition, setSoilCondition] = useState('');
  const [issueLevel, setIssueLevel] = useState('NONE');
  const [submitting, setSubmitting] = useState(false);

  const issueLevels = [
    {value: 'NONE', label: 'Không có', color: colors.gray500},
    {value: 'LOW', label: 'Nhẹ', color: colors.blue600},
    {value: 'MEDIUM', label: 'Trung bình', color: colors.amber600},
    {value: 'HIGH', label: 'Nghiêm trọng', color: colors.red600},
  ];

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung nhật ký');
      return;
    }

    try {
      setSubmitting(true);

      const diaryData = {
        seasonId,
        phaseId,
        logDate: new Date().toISOString().split('T')[0],
        content: content.trim(),
        weather: weather.trim() || null,
        plantCondition: plantCondition.trim() || null,
        soilCondition: soilCondition.trim() || null,
        issueLevel,
      };

      await apiClient.createFieldDiary(diaryData);

      Alert.alert('Thành công', 'Đã ghi nhật ký đồng ruộng', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể lưu nhật ký');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ghi nhật ký</Text>
        <View style={{width: 40}} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView style={styles.content}>
          {/* Phase Info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Giai đoạn</Text>
            <Text style={styles.infoValue}>{phaseTitle}</Text>
          </View>

          {/* Content Field */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Nội dung nhật ký <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={content}
              onChangeText={setContent}
              placeholder="Nhập nội dung công việc đã thực hiện..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Weather Field */}
          <View style={styles.section}>
            <Text style={styles.label}>Thời tiết</Text>
            <TextInput
              style={styles.input}
              value={weather}
              onChangeText={setWeather}
              placeholder="VD: Nắng, nhiệt độ 32°C"
              placeholderTextColor={colors.gray400}
            />
          </View>

          {/* Plant Condition */}
          <View style={styles.section}>
            <Text style={styles.label}>Tình trạng cây trồng</Text>
            <TextInput
              style={styles.input}
              value={plantCondition}
              onChangeText={setPlantCondition}
              placeholder="VD: Cây phát triển tốt, lá xanh"
              placeholderTextColor={colors.gray400}
            />
          </View>

          {/* Soil Condition */}
          <View style={styles.section}>
            <Text style={styles.label}>Tình trạng đất</Text>
            <TextInput
              style={styles.input}
              value={soilCondition}
              onChangeText={setSoilCondition}
              placeholder="VD: Đất ẩm vừa phải"
              placeholderTextColor={colors.gray400}
            />
          </View>

          {/* Issue Level */}
          <View style={styles.section}>
            <Text style={styles.label}>Mức độ vấn đề</Text>
            <View style={styles.issueLevelContainer}>
              {issueLevels.map(level => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.issueLevelButton,
                    issueLevel === level.value && {
                      backgroundColor: level.color,
                      borderColor: level.color,
                    },
                  ]}
                  onPress={() => setIssueLevel(level.value)}>
                  <Text
                    style={[
                      styles.issueLevelText,
                      issueLevel === level.value && {color: 'white'},
                    ]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{height: 100}} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={submitting}>
            <Text style={styles.cancelButtonText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            <Feather name="save" size={18} color="white" />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Đang lưu...' : 'Lưu nhật ký'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: colors.green50,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.green600,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green700,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.green800,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 8,
  },
  required: {
    color: colors.red600,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.gray800,
  },
  textArea: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.gray800,
    minHeight: 120,
  },
  issueLevelContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  issueLevelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  issueLevelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.green600,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

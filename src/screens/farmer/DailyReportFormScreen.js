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

export default function DailyReportFormScreen({navigation, route}) {
  const {seasonId, phaseId, phaseTitle} = route.params;

  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập nội dung báo cáo');
      return;
    }

    try {
      setSubmitting(true);

      const reportData = {
        seasonId,
        phaseId,
        reportDate: new Date().toISOString().split('T')[0],
        note: note.trim(),
      };

      await apiClient.createDailyReport(reportData);

      Alert.alert('Thành công', 'Đã gửi báo cáo hàng ngày', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi báo cáo');
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
        <Text style={styles.headerTitle}>Báo cáo hàng ngày</Text>
        <View style={{width: 40}} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView style={styles.content}>
          {/* Phase Info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Feather name="calendar" size={20} color={colors.blue600} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Giai đoạn hiện tại</Text>
                <Text style={styles.infoValue}>{phaseTitle}</Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Feather name="clock" size={20} color={colors.blue600} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Ngày báo cáo</Text>
                <Text style={styles.infoValue}>
                  {new Date().toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Note Field */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Nội dung báo cáo <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>
              Mô tả công việc đã làm, tình trạng cây trồng, hoặc các vấn đề cần
              giám sát viên hỗ trợ
            </Text>
            <TextInput
              style={styles.textArea}
              value={note}
              onChangeText={setNote}
              placeholder="VD: Đã hoàn thành bón phân khu A. Phát hiện sâu cuốn lá ở vài điểm cần kiểm tra..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          {/* Info Box */}
          <View style={styles.warningCard}>
            <Feather name="info" size={20} color={colors.amber600} />
            <Text style={styles.warningText}>
              Giám sát viên sẽ nhận được thông báo và đến kiểm tra để ghi nhật ký
              đồng ruộng
            </Text>
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
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}>
            <Feather name="send" size={18} color="white" />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
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
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.blue200,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray500,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 12,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 4,
  },
  required: {
    color: colors.red600,
  },
  hint: {
    fontSize: 13,
    color: colors.gray500,
    marginBottom: 12,
    lineHeight: 18,
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
    minHeight: 160,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.amber50,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.amber600,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.amber800,
    marginLeft: 12,
    lineHeight: 20,
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

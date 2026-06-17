import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import api from '../api/api';

export default function ChangePasswordScreen({ navigation }) {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (values) => {
      if (values.newPassword !== values.confirmPassword) {
        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
      }
      return api.put('/users/profile', {
        currentPassword: values.currentPassword,
        password: values.newPassword,
      });
    },
    onSuccess: () => {
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
    onError: (err) => {
      Alert.alert('Lỗi', err.response?.data?.message || err.message || 'Có lỗi xảy ra!');
    },
  });

  const handleSubmit = () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin!');
      return;
    }

    if (formData.newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
      return;
    }

    updateMutation.mutate(formData);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Security Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Feather name="shield" size={24} color="#f59e0b" />
          </View>
          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Bảo mật tài khoản</Text>
            <Text style={styles.noticeText}>
              Để bảo vệ tài khoản của bạn, chúng tôi khuyến nghị thay đổi mật khẩu ít nhất 3 tháng một lần.
              Hãy sử dụng mật khẩu mạnh bao gồm chữ cái, số và ký hiệu.
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu hiện tại *</Text>
            <View style={styles.passwordInput}>
              <Feather name="lock" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.currentPassword}
                onChangeText={(text) => setFormData({ ...formData, currentPassword: text })}
                placeholder="Nhập mật khẩu đang sử dụng"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showCurrentPassword}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showCurrentPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu mới *</Text>
            <View style={styles.passwordInput}>
              <Feather name="lock" size={20} color="#22c55e" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.newPassword}
                onChangeText={(text) => setFormData({ ...formData, newPassword: text })}
                placeholder="Tối thiểu 6 ký tự, nên có chữ và số"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showNewPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Tối thiểu 6 ký tự</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Xác nhận mật khẩu mới *</Text>
            <View style={styles.passwordInput}>
              <Feather name="lock" size={20} color="#22c55e" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                placeholder="Nhập lại mật khẩu để xác nhận"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Feather
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Yêu cầu mật khẩu:</Text>
          <View style={styles.requirement}>
            <Feather name="check-circle" size={16} color="#22c55e" />
            <Text style={styles.requirementText}>Ít nhất 6 ký tự</Text>
          </View>
          <View style={styles.requirement}>
            <Feather name="check-circle" size={16} color="#22c55e" />
            <Text style={styles.requirementText}>Nên bao gồm chữ hoa và chữ thường</Text>
          </View>
          <View style={styles.requirement}>
            <Feather name="check-circle" size={16} color="#22c55e" />
            <Text style={styles.requirementText}>Nên có ít nhất một số</Text>
          </View>
          <View style={styles.requirement}>
            <Feather name="check-circle" size={16} color="#22c55e" />
            <Text style={styles.requirementText}>Nên có ký tự đặc biệt (@, #, $, ...)</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, updateMutation.isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Cập nhật</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  noticeIcon: {
    marginRight: 12,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  eyeButton: {
    padding: 8,
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 20,
  },
  requirementsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

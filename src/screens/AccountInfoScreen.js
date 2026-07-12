import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../api/api';
import { useAuthStore } from '../store/authStore';

const GENDERS = ['Nam', 'Nữ', 'Khác'];

export default function AccountInfoScreen({ navigation }) {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    fullname: user?.fullname || '',
    phone: user?.phone || '',
    address: user?.address || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
  });

  const updateMutation = useMutation({
    mutationFn: (values) => {
      const updateData = {
        fullName: values.fullname?.trim() || '',
      };
      
      // Only include fields that have valid values
      if (values.phone?.trim()) {
        updateData.phoneNumber = values.phone.trim();
      }
      
      if (values.dateOfBirth) {
        updateData.dateOfBirth = values.dateOfBirth;
      }
      
      if (values.gender) {
        updateData.gender = values.gender;
      }
      
      if (values.address?.trim()) {
        updateData.address = values.address.trim();
      }
      
      console.log('Updating profile with data:', updateData);
      return api.put('/users/me/profile', updateData);
    },
    onSuccess: async (res) => {
      console.log('Update profile response:', res.data);
      
      // Backend returns data directly, not nested in data.data
      const raw = res.data?.data || res.data;
      
      console.log('Parsed user data:', raw);
      
      if (raw && typeof raw === 'object') {
        const updated = {
          ...user,
          fullname:    raw.fullName || raw.fullname || user.fullname,
          phone:       raw.phoneNumber || raw.phone || user.phone,
          dateOfBirth: raw.dateOfBirth || user.dateOfBirth,
          gender:      raw.gender || user.gender,
          address:     raw.address || user.address,
          avatar:      raw.avatarUrl || raw.avatar || user.avatar,
        };
        console.log('Updated user object:', updated);
        await setUser(updated);
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!');
    },
    onError: (err) => {
      console.error('Update profile error:', err);
      console.error('Error response:', err.response?.data);
      
      // Handle validation errors
      const errors = err.response?.data?.errors;
      const message = err.response?.data?.message;
      
      let errorMessage = 'Có lỗi xảy ra khi lưu hồ sơ.';
      
      if (errors && Array.isArray(errors) && errors.length > 0) {
        errorMessage = errors.join('\n');
      } else if (message) {
        errorMessage = message;
      }
      
      Alert.alert('Lỗi', errorMessage);
    },
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateProfile = () => {
    const errors = [];
    const fullname = formData.fullname.trim();
    const phone = formData.phone.trim();

    if (!fullname) errors.push('Họ và tên là bắt buộc.');
    if (fullname && fullname.length < 2) errors.push('Họ và tên cần có ít nhất 2 ký tự.');
    if (phone && !/^[0-9]{10,11}$/.test(phone)) errors.push('Số điện thoại phải gồm 10-11 chữ số.');

    if (formData.dateOfBirth) {
      const birthDate = new Date(formData.dateOfBirth);
      if (Number.isNaN(birthDate.getTime())) errors.push('Ngày sinh không hợp lệ.');
      if (birthDate > new Date()) errors.push('Ngày sinh không được lớn hơn ngày hiện tại.');
    }

    return errors;
  };

  const handleSaveProfile = () => {
    const errors = validateProfile();
    if (errors.length > 0) {
      Alert.alert('Thông tin chưa hợp lệ', errors.join('\n'));
      return;
    }
    updateMutation.mutate({
      fullname: formData.fullname.trim(),
      phone: formData.phone.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      address: formData.address.trim(),
    });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh để đổi ảnh đại diện.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      setUploadingAvatar(true);
      const asset = result.assets[0];
      
      // Get file extension from URI or mimeType
      const uriParts = asset.uri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      // Try different field names that backend might expect
      const formData = new FormData();
      
      // Some APIs expect 'file', some 'avatar', some 'image'
      // Try with the field name from API documentation first
      formData.append('file', {
        uri: Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        name: `avatar.${fileExtension}`,
        type: asset.mimeType || `image/${fileExtension}`,
      });

      console.log('Uploading avatar with data:', {
        uri: asset.uri,
        name: `avatar.${fileExtension}`,
        type: asset.mimeType,
      });

      // Try with /api prefix if not already included
      const { data } = await api.post('/users/me/avatar', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
        },
        transformRequest: (data, headers) => {
          // Let axios handle the multipart boundary
          return data;
        },
      });

      console.log('Upload response:', data);

      if (data.success) {
        const avatarUrl = data.data?.avatarUrl || data.data?.avatar || data.avatarUrl;
        console.log('New avatar URL:', avatarUrl);
        await setUser({ ...user, avatar: avatarUrl });
        Alert.alert('Thành công', 'Ảnh đại diện đã được cập nhật!');
      } else {
        Alert.alert('Lỗi', data.message || 'Không thể tải ảnh đại diện lên.');
      }
    } catch (error) {
      console.error('Upload avatar error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Không thể tải ảnh đại diện lên.';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Mở picker: lưu giá trị hiện tại vào tempDate
  const openDatePicker = () => {
    setTempDate(formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date(1990, 0, 1));
    setShowDatePicker(true);
  };

  // Android: apply ngay khi chọn
  const handleDateChangeAndroid = (_event, selectedDate) => {
    setShowDatePicker(false);
    if (_event.type === 'set' && selectedDate) {
      updateField('dateOfBirth', selectedDate.toISOString());
    }
  };

  // iOS: chỉ cập nhật tempDate, chưa apply vào form
  const handleDateChangeIOS = (_event, selectedDate) => {
    if (selectedDate) setTempDate(selectedDate);
  };

  // iOS: bấm "Xong" mới apply
  const confirmDateIOS = () => {
    if (tempDate) updateField('dateOfBirth', tempDate.toISOString());
    setShowDatePicker(false);
  };

  // iOS: bấm "Hủy"
  const cancelDateIOS = () => {
    setShowDatePicker(false);
    setTempDate(null);
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN');
  };

  const renderInput = ({ label, field, placeholder, keyboardType = 'default', multiline = false, editable = true }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea, !editable && styles.inputDisabled]}
        value={formData[field]}
        onChangeText={(text) => updateField(field, text)}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        editable={editable}
      />
    </View>
  );

  const renderChoices = (field, values) => (
    <View style={styles.choiceRow}>
      {values.map((value) => {
        const active = formData[field] === value;
        return (
          <TouchableOpacity
            key={value}
            style={[styles.choiceChip, active && styles.choiceChipActive]}
            onPress={() => updateField(field, value)}
          >
            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{value}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin tài khoản</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(user?.fullname || user?.username || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.cameraButton} 
              onPress={pickImage}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="camera" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.userName} numberOfLines={1}>{user?.fullname || user?.username}</Text>
          <Text style={styles.userRole}>{user?.role || 'User'}</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>

          {renderInput({ label: 'Họ và tên *', field: 'fullname', placeholder: 'Ví dụ: Nguyễn Văn A' })}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={[styles.input, styles.inputDisabled]} value={user?.email || ''} editable={false} />
          </View>

          {renderInput({
            label: 'Số điện thoại',
            field: 'phone',
            placeholder: 'Ví dụ: 0901234567',
            keyboardType: 'phone-pad',
          })}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ngày sinh</Text>
            <TouchableOpacity style={styles.dateButton} onPress={openDatePicker}>
              <Feather name="calendar" size={18} color="#64748b" />
              <Text style={[styles.dateText, formData.dateOfBirth && styles.dateTextFilled]}>
                {formatDate(formData.dateOfBirth) || 'Chọn ngày sinh'}
              </Text>
              {formData.dateOfBirth ? (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); updateField('dateOfBirth', ''); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={16} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <Feather name="chevron-down" size={16} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Giới tính</Text>
            {renderChoices('gender', GENDERS)}
          </View>

          <Text style={styles.sectionTitle}>Địa chỉ</Text>
          {renderInput({ label: 'Địa chỉ chi tiết', field: 'address', placeholder: 'Ví dụ: 123 Đường ABC, Quận 1' })}
        </View>
      </ScrollView>

      {/* Android: picker hiện thẳng (là dialog native, không cần Modal) */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date(1990, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChangeAndroid}
        />
      )}

      {/* iOS: bọc trong Modal để không chiếm chỗ trong layout */}
      {Platform.OS === 'ios' && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={cancelDateIOS}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={cancelDateIOS} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={cancelDateIOS} style={styles.modalHeaderBtn}>
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Chọn ngày sinh</Text>
              <TouchableOpacity onPress={confirmDateIOS} style={styles.modalHeaderBtn}>
                <Text style={styles.modalDoneText}>Xong</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate || new Date(1990, 0, 1)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={handleDateChangeIOS}
              locale="vi-VN"
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, updateMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSaveProfile}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  content: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  avatarContainer: { position: 'relative', marginBottom: 14 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  cameraButton: {
    position: 'absolute', bottom: 0, right: 0,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  userName: { maxWidth: '86%', fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 4 },
  userRole: { fontSize: 13, color: '#16a34a', fontWeight: '700' },
  formSection: { padding: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', marginTop: 18, marginBottom: 14 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1f2937',
  },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  dateButton: {
    minHeight: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  dateText: { flex: 1, fontSize: 15, color: '#9ca3af' },
  dateTextFilled: { color: '#1f2937' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
  },
  choiceChipActive: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  choiceText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  choiceTextActive: { color: '#15803d' },
  footer: {
    padding: 16, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#eef2f7',
  },
  saveButton: {
    minHeight: 50, borderRadius: 12, backgroundColor: '#16a34a',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modal iOS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  modalCancelText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  modalDoneText: { fontSize: 15, color: '#16a34a', fontWeight: '700' },
  iosPicker: { width: '100%' },
});

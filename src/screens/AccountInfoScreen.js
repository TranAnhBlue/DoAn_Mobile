import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../store/authStore';
import api from '../api/api';

const GENDERS = ['Nam', 'Nữ', 'Khác'];
const FARM_TYPES = ['Trồng trọt', 'Chăn nuôi', 'Thủy sản', 'Hỗn hợp'];

export default function AccountInfoScreen({ navigation }) {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    fullname: user?.fullname || '',
    phone: user?.phone || '',
    address: user?.address || '',
    province: user?.province || '',
    ward: user?.ward || '',
    organization: user?.organization || '',
    bio: user?.bio || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    farmName: user?.farmName || '',
    farmCode: user?.farmCode || '',
    farmArea: user?.farmArea ? String(user.farmArea) : '',
    farmType: user?.farmType || '',
  });

  const canEditPhone = ['Admin', 'HTX', 'Htx'].includes(user?.role);
  const isFarmerLike = ['Farmer', 'User'].includes(user?.role);

  const updateMutation = useMutation({
    mutationFn: (values) => {
      // API PUT /users/me/profile ch? nh?n 5 tr??ng:
      // fullName, phoneNumber, dateOfBirth, gender, address
      const updateData = {
        fullName:    values.fullname?.trim() || '',
        phoneNumber: values.phone?.trim()    || '',
        dateOfBirth: values.dateOfBirth      || null,
        gender:      values.gender           || '',
        address:     values.address?.trim()  || '',
      };
      return api.put('/users/me/profile', updateData);
    },
    onSuccess: async (res) => {
      // Normalize l?i nh? khi login
      const raw = res.data?.data;
      if (raw) {
        const updated = {
          ...user,
          fullname:    raw.fullName    ?? user.fullname,
          phone:       raw.phoneNumber ?? user.phone,
          dateOfBirth: raw.dateOfBirth ?? user.dateOfBirth,
          gender:      raw.gender      ?? user.gender,
          address:     raw.address     ?? user.address,
        };
        await setUser(updated);
      }
      queryClient.invalidateQueries({ queryKey: ['users'] });
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!');
    },
    onError: (err) => {
      Alert.alert('Lỗi', err.response?.data?.message || 'Có lỗi xảy ra khi lưu hồ sơ.');
    },
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateProfile = () => {
    const errors = [];
    const fullname = formData.fullname.trim();
    const phone = formData.phone.trim();
    const farmArea = formData.farmArea.trim();

    if (!fullname) errors.push('Họ và tên là bắt buộc.');
    if (fullname && fullname.length < 2) errors.push('Họ và tên cần có ít nhất 2 ký tự.');
    if (phone && !/^[0-9]{10,11}$/.test(phone)) errors.push('Số điện thoại phải gồm 10-11 chữ số.');

    if (farmArea) {
      const numericArea = Number(farmArea.replace(',', '.'));
      if (Number.isNaN(numericArea) || numericArea < 0) {
        errors.push('Diện tích nông trại phải là số không âm.');
      }
    }

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
      ...formData,
      fullname: formData.fullname.trim(),
      phone: formData.phone.trim(),
      farmArea: formData.farmArea.trim(),
    });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh để đổi ảnh đại diện.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    try {
      const asset = result.assets[0];
      const body = new FormData();
      body.append('avatar', {
        uri: asset.uri,
        name: asset.fileName || `avatar-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });

      const { data } = await api.post('/upload/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        await setUser({ ...user, avatar: data.data.avatar });
        Alert.alert('Thành công', 'Ảnh đại diện đã được cập nhật!');
      }
    } catch (error) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tải ảnh đại diện lên.');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      updateField('dateOfBirth', selectedDate.toISOString());
    }
    if (Platform.OS === 'android') setShowDatePicker(false);
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
            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Feather name="camera" size={16} color="#fff" />
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
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Feather name="calendar" size={18} color="#64748b" />
              <Text style={[styles.dateText, formData.dateOfBirth && styles.dateTextFilled]}>
                {formatDate(formData.dateOfBirth) || 'Chọn ngày sinh'}
              </Text>
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

      {showDatePicker && (
        <DateTimePicker
          value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date(1990, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    maxWidth: '86%',
    fontSize: 22,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '700',
  },
  formSection: {
    padding: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
    marginTop: 18,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  dateButton: {
    minHeight: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: '#9ca3af',
  },
  dateTextFilled: {
    color: '#1f2937',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  choiceChipActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  choiceTextActive: {
    color: '#15803d',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  saveButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

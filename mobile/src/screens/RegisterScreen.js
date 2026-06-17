import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../api/api';
import DismissKeyboard from '../components/DismissKeyboard';
import { useAuthStore } from '../store/authStore';

export default function RegisterScreen({ navigation }) {
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullname: '',
    phone: '',
    organization: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const fullname = formData.fullname.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim();
    const username = formData.username.trim();
    const organization = formData.organization.trim();
    // Validation
    if (!fullname || !phone || !email || !formData.password || !formData.confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (!/^[0-9]{10,11}$/.test(phone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ. Vui lòng nhập 10-11 chữ số.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        username: phone || username,
        email,
        password: formData.password,
        fullname,
        phone,
        organization,
        role: 'Farmer',
      });

      if (data.success) {
        await setCredentials(data.data, data.data.token);
        Alert.alert(
          'Thành công',
          'Đăng ký tài khoản thành công! Vui lòng đăng nhập.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DismissKeyboard>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/Logo_EBookFarm.jpg')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appName}>EBookFarm</Text>
            <Text style={styles.tagline}>Nông nghiệp số</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Tạo tài khoản mới</Text>
          <Text style={styles.subtitle}>
            Điền thông tin để đăng ký tài khoản EBookFarm
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tên đăng nhập
            </Text>
            <View style={styles.inputContainer}>
              <Feather name="user" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: nongdan123"
                placeholderTextColor="#9ca3af"
                value={formData.username}
                onChangeText={(text) =>
                  setFormData({ ...formData, username: text })
                }
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Feather name="mail" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: nongdan@gmail.com"
                placeholderTextColor="#9ca3af"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputContainer}>
              <Feather name="user-check" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Nguyễn Văn A"
                placeholderTextColor="#9ca3af"
                value={formData.fullname}
                onChangeText={(text) =>
                  setFormData({ ...formData, fullname: text })
                }
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại <Text style={styles.required}>*</Text></Text>
            <View style={styles.inputContainer}>
              <Feather name="phone" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 0901234567"
                placeholderTextColor="#9ca3af"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Organization */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tổ chức/Hợp tác xã</Text>
            <View style={styles.inputContainer}>
              <Feather name="briefcase" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: HTX Nông nghiệp ABC"
                placeholderTextColor="#9ca3af"
                value={formData.organization}
                onChangeText={(text) =>
                  setFormData({ ...formData, organization: text })
                }
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mật khẩu <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor="#9ca3af"
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Xác nhận mật khẩu <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu để xác nhận"
                placeholderTextColor="#9ca3af"
                value={formData.confirmPassword}
                onChangeText={(text) =>
                  setFormData({ ...formData, confirmPassword: text })
                }
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Feather
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.registerButtonText}>Đăng ký</Text>
                <Feather name="arrow-right" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkButton}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </DismissKeyboard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 100,
    height: 70,
    borderRadius: 12,
    marginBottom: 12,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#16a34a',
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 20,
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
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
});

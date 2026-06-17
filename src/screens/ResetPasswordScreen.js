import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../api/api';
import DismissKeyboard from '../components/DismissKeyboard';

export default function ResetPasswordScreen({ route, navigation }) {
  const { token } = route.params || {};
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.put(`/auth/reset-password/${token}`, {
        password,
      });

      if (data.success) {
        Alert.alert(
          'Thành công',
          'Mật khẩu đã được đặt lại thành công! Vui lòng đăng nhập.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message ||
          'Không thể đặt lại mật khẩu. Link có thể đã hết hạn.'
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
        <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <Image 
              source={require('../../assets/images/Logo_EBookFarm.jpg')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Đặt lại mật khẩu</Text>
          <Text style={styles.subtitle}>
            Nhập mật khẩu mới cho tài khoản của bạn
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu mới</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Tối thiểu 6 ký tự, nên có chữ và số"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
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
            <Text style={styles.hint}>Mật khẩu phải có ít nhất 6 ký tự</Text>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Xác nhận mật khẩu</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu để xác nhận"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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

          {/* Password Strength Indicator */}
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  {
                    width: `${Math.min((password.length / 12) * 100, 100)}%`,
                    backgroundColor:
                      password.length < 6
                        ? '#ef4444'
                        : password.length < 10
                        ? '#f59e0b'
                        : '#16a34a',
                  },
                ]}
              />
            </View>
            <Text style={styles.strengthText}>
              {password.length < 6
                ? 'Yếu'
                : password.length < 10
                ? 'Trung bình'
                : 'Mạnh'}
            </Text>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.resetButton, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.resetButtonText}>Đặt lại mật khẩu</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Security Notice */}
        <View style={styles.notice}>
          <Feather name="shield" size={20} color="#3b82f6" />
          <Text style={styles.noticeText}>
            Sau khi đặt lại mật khẩu, bạn sẽ cần đăng nhập lại với mật khẩu mới
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
    </DismissKeyboard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 60,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 60,
  },
  titleContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 24,
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
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  strengthContainer: {
    marginBottom: 24,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  resetButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
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
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  notice: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 20,
  },
});

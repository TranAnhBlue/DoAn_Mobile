import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import authApi from '../api/authApi';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Reset password
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const login = useAuthStore((state) => state.login);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    if (trimmedId.includes('@') && !isValidEmail(trimmedId)) {
      Alert.alert('Lỗi định dạng', 'Email đăng nhập không đúng định dạng (ví dụ: example@domain.com)!');
      return;
    }

    try {
      setLoading(true);
      await login(trimmedId, password);
    } catch (error) {
      const errorMsg = error.response?.data?.message
        || error.message
        || 'Đăng nhập thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgotPassword = () => {
    Keyboard.dismiss();
    setForgotIdentifier(identifier.trim());
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotStep(1);
    setForgotModalVisible(true);
  };

  const handleCloseForgotPassword = () => {
    Keyboard.dismiss();
    setForgotModalVisible(false);
    setForgotLoading(false);
  };

  const handleRequestOtp = async () => {
    Keyboard.dismiss();
    const trimmedId = forgotIdentifier.trim();
    if (!trimmedId) {
      Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ email của bạn!');
      return;
    }

    if (!isValidEmail(trimmedId)) {
      Alert.alert(
        'Lỗi định dạng email',
        'Địa chỉ email không đúng định dạng! Vui lòng nhập đầy đủ email chứa kí tự "@" và tên miền (ví dụ: user@example.com).'
      );
      return;
    }

    try {
      setForgotLoading(true);
      await authApi.forgotPassword(trimmedId);
      Alert.alert(
        'Thành công',
        'Mã OTP khôi phục 6 chữ số đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.'
      );
      setForgotStep(2);
    } catch (error) {
      const errorMsg = error.response?.data?.message
        || error.message
        || 'Không thể gửi yêu cầu mã OTP. Vui lòng kiểm tra lại thông tin tài khoản.';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    Keyboard.dismiss();
    if (!otp.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP 6 chữ số!');
      return;
    }
    if (otp.trim().length !== 6) {
      Alert.alert('Lỗi', 'Mã OTP phải gồm 6 chữ số!');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Lỗi', 'Xác nhận mật khẩu mới không khớp!');
      return;
    }

    try {
      setForgotLoading(true);
      await authApi.resetPassword({
        identifier: forgotIdentifier.trim(),
        otp: otp.trim(),
        newPassword,
        confirmNewPassword,
      });
      Alert.alert(
        'Thành công',
        'Đặt lại mật khẩu thành công! Vui lòng sử dụng mật khẩu mới để đăng nhập.',
        [
          {
            text: 'Đồng ý',
            onPress: () => {
              handleCloseForgotPassword();
              setIdentifier(forgotIdentifier.trim());
              setPassword('');
            },
          },
        ]
      );
    } catch (error) {
      const errorMsg = error.response?.data?.message
        || error.message
        || 'Đặt lại mật khẩu không thành công. Vui lòng kiểm tra lại mã OTP.';
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.innerTouchable} onPress={Keyboard.dismiss}>
            <View style={styles.formContainer}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../../../assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.title}>EAPLS</Text>
              <Text style={styles.subtitle}>Nhật ký sản xuất điện tử</Text>

              {/* Email/Phone Input */}
              <View style={styles.inputContainer}>
                <Feather name="user" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email hoặc tên đăng nhập"
                  placeholderTextColor="#9ca3af"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu của bạn"
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

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleOpenForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Đăng nhập</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseForgotPassword}
      >
        <Pressable style={styles.modalOverlay} onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <Pressable style={styles.modalContent} onPress={Keyboard.dismiss}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {forgotStep === 1 ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu'}
                </Text>
                <TouchableOpacity onPress={handleCloseForgotPassword}>
                  <Feather name="x" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {forgotStep === 1 ? (
                <>
                  <Text style={styles.modalSubtitle}>
                    Nhập email hoặc tên đăng nhập của bạn để nhận mã OTP khôi phục qua email.
                  </Text>

                  <View style={styles.inputContainer}>
                    <Feather name="mail" size={20} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email hoặc Tên đăng nhập"
                      placeholderTextColor="#9ca3af"
                      value={forgotIdentifier}
                      onChangeText={setForgotIdentifier}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleRequestOtp}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Gửi mã OTP</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalSubtitle}>
                    Mã OTP đã gửi đến tài khoản <Text style={{ fontWeight: 'bold' }}>{forgotIdentifier}</Text>. Vui lòng nhập mã và mật khẩu mới.
                  </Text>

                  {/* OTP Input */}
                  <View style={styles.inputContainer}>
                    <Feather name="key" size={20} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Mã OTP 6 chữ số"
                      placeholderTextColor="#9ca3af"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  {/* New Password Input */}
                  <View style={styles.inputContainer}>
                    <Feather name="lock" size={20} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                      placeholderTextColor="#9ca3af"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeIcon}
                    >
                      <Feather
                        name={showNewPassword ? 'eye' : 'eye-off'}
                        size={20}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm New Password Input */}
                  <View style={styles.inputContainer}>
                    <Feather name="check-circle" size={20} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Xác nhận mật khẩu mới"
                      placeholderTextColor="#9ca3af"
                      value={confirmNewPassword}
                      onChangeText={setConfirmNewPassword}
                      secureTextEntry={!showNewPassword}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleResetPassword}
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Xác nhận đặt lại mật khẩu</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendLink}
                    onPress={() => setForgotStep(1)}
                  >
                    <Text style={styles.resendLinkText}>Gửi lại mã OTP khác?</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16a34a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerTouchable: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#16a34a',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  button: {
    height: 52,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  resendLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  resendLinkText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
});

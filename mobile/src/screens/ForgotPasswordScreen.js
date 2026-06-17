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

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });

      if (data.success) {
        setSent(true);
        Alert.alert(
          'Thành công',
          'Link đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.'
        );
      }
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || 'Không thể gửi email. Vui lòng thử lại.'
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
          <Text style={styles.title}>Quên mật khẩu?</Text>
          <Text style={styles.subtitle}>
            Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Feather name="mail" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: nongdan@gmail.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!sent}
              />
            </View>
          </View>

          {sent && (
            <View style={styles.successMessage}>
              <Feather name="check-circle" size={20} color="#16a34a" />
              <Text style={styles.successText}>
                Email đã được gửi! Kiểm tra hộp thư của bạn.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sendButton,
              (loading || sent) && styles.buttonDisabled,
            ]}
            onPress={handleSendResetLink}
            disabled={loading || sent}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="send" size={20} color="#fff" />
                <Text style={styles.sendButtonText}>
                  {sent ? 'Đã gửi email' : 'Gửi link đặt lại'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {sent && (
            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                setSent(false);
                handleSendResetLink();
              }}
            >
              <Text style={styles.resendButtonText}>Gửi lại email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Back to Login */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.backToLogin}
          >
            <Feather name="arrow-left" size={16} color="#16a34a" />
            <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
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
    marginBottom: 32,
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
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '500',
  },
  sendButton: {
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
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resendButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
  footer: {
    alignItems: 'center',
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
  },
});

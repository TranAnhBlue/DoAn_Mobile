import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../api/api';
import DismissKeyboard from '../components/DismissKeyboard';
import { useAuthStore } from '../store/authStore';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const setCredentials = useAuthStore((state) => state.setCredentials);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/auth/login', {
        identifier,
        password,
      });

      const raw = data.data;
      const token = raw?.accessToken || raw?.token;

      if (!token) {
        Alert.alert('Lỗi', 'Không nhận được token từ server. Vui lòng thử lại.');
        setLoading(false);
        return;
      }

      // Normalize các field để khớp với toàn bộ app
      // API trả về: fullName, roles[], avatarUrl, phoneNumber
      // App dùng:   fullname, role,    avatar,    phone
      const rawRole = Array.isArray(raw.roles) ? raw.roles[0] : (raw.role || '');
      const roleMap = { FARMER: 'Farmer', ADMIN: 'Admin', HTX: 'HTX', USER: 'User' };
      const userData = {
        id:           raw.userId,
        username:     raw.email,
        fullname:     raw.fullName,
        email:        raw.email,
        phone:        raw.phoneNumber,
        avatar:       raw.avatarUrl,
        role:         roleMap[rawRole?.toUpperCase()] || rawRole,
        roles:        raw.roles,
        organization: raw.organization || null,
        province:     raw.province || null,
      };

      await setCredentials(userData, token);
      setLoading(false);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMsg);
      setLoading(false);
    }
  };

  return (
    <DismissKeyboard>
      <SafeAreaView style={styles.container}>
        <View style={styles.formContainer}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/Logo_EBookFarm.jpg')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>EBookFarm</Text>
        <Text style={styles.subtitle}>Quản lý nhật ký sản xuất</Text>

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
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
        </TouchableOpacity>

        {/* Login Button */}
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

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
        </View>
      </SafeAreaView>
    </DismissKeyboard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
  },
  formContainer: {
    padding: 24,
    backgroundColor: '#fff',
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
    height: 80,
    borderRadius: 12,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
});

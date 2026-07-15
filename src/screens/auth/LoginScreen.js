import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {apiClient} from '../../services/apiClient';

export default function LoginScreen({navigation}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('FARMER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'FARMER',
      label: 'Nông dân',
      icon: 'user',
      color: '#3b82f6',
      bg: '#dbeafe',
    },
    {
      id: 'FARM_SUPERVISOR',
      label: 'Giám sát viên',
      icon: 'shield',
      color: '#8b5cf6',
      bg: '#ede9fe',
    },
  ];

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ số điện thoại và mật khẩu');
      return;
    }

    try {
      setLoading(true);
      const userData = await apiClient.login({phone: phone.trim(), password});

      if (userData.user.role !== selectedRole) {
        Alert.alert(
          'Lỗi đăng nhập',
          `Tài khoản này không có quyền ${
            roles.find(r => r.id === selectedRole)?.label
          }`,
        );
        return;
      }

      const homeScreen =
        selectedRole === 'FARMER' ? 'FarmerHome' : 'SupervisorHome';
      navigation.replace(homeScreen, {userId: userData.user.id});
    } catch (error) {
      Alert.alert(
        'Đăng nhập thất bại',
        error.message || 'Số điện thoại hoặc mật khẩu không đúng',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Feather name="sun" size={40} color="#16a34a" />
              </View>
            </View>
            <Text style={styles.title}>Nhật ký điện tử</Text>
            <Text style={styles.subtitle}>Quản lý nông trại thông minh</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Chọn vai trò của bạn</Text>
            <View style={styles.roleSelector}>
              {roles.map(role => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    selectedRole === role.id && styles.roleCardActive,
                    {borderColor: selectedRole === role.id ? role.color : '#e5e7eb'},
                  ]}
                  onPress={() => setSelectedRole(role.id)}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.roleIcon,
                      {backgroundColor: role.bg},
                    ]}>
                    <Feather name={role.icon} size={28} color={role.color} />
                  </View>
                  <Text style={styles.roleLabel}>{role.label}</Text>
                  {selectedRole === role.id && (
                    <View style={[styles.roleCheck, {backgroundColor: role.color}]}>
                      <Feather name="check" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionTitle, {marginTop: 24}]}>
              Thông tin đăng nhập
            </Text>

            <View style={styles.inputContainer}>
              <Feather name="phone" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9ca3af" />
              <TextInput
                style={styles.input}
                placeholder="Mật khẩu"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}>
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Đăng nhập</Text>
                  <Feather name="arrow-right" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Bằng việc đăng nhập, bạn đồng ý với{' '}
              </Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Điều khoản sử dụng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '600',
  },
  form: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  roleCardActive: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  roleCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    height: 56,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  eyeButton: {
    padding: 8,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#16a34a',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 24,
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '700',
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  const SettingSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Feather name={icon} size={20} color="#6b7280" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || <Feather name="chevron-right" size={20} color="#d1d5db" />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <SettingSection title="Tài khoản">
          <SettingItem
            icon="user"
            title="Thông tin cá nhân"
            subtitle={user?.fullName}
            onPress={() => navigation.navigate('AccountInfo')}
          />
          <SettingItem
            icon="lock"
            title="Đổi mật khẩu"
            subtitle="Cập nhật mật khẩu của bạn"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </SettingSection>

        {/* Notifications Section */}
        <SettingSection title="Thông báo">
          <SettingItem
            icon="bell"
            title="Thông báo đẩy"
            subtitle="Nhận thông báo trên thiết bị"
            rightElement={
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={pushEnabled ? '#22c55e' : '#f3f4f6'}
              />
            }
          />
          <SettingItem
            icon="mail"
            title="Thông báo email"
            subtitle="Nhận thông báo qua email"
            rightElement={
              <Switch
                value={emailEnabled}
                onValueChange={setEmailEnabled}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={emailEnabled ? '#22c55e' : '#f3f4f6'}
              />
            }
          />
        </SettingSection>

        {/* Appearance Section */}
        <SettingSection title="Giao diện">
          <SettingItem
            icon="moon"
            title="Chế độ tối"
            subtitle="Đang phát triển"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                disabled
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={darkMode ? '#22c55e' : '#f3f4f6'}
              />
            }
          />
          <SettingItem
            icon="globe"
            title="Ngôn ngữ"
            subtitle="Tiếng Việt"
            onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
          />
        </SettingSection>

        {/* About Section */}
        <SettingSection title="Về ứng dụng">
          <SettingItem
            icon="info"
            title="Phiên bản"
            subtitle="1.0.0"
          />
          <SettingItem
            icon="file-text"
            title="Điều khoản sử dụng"
            onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
          />
          <SettingItem
            icon="shield"
            title="Chính sách bảo mật"
            onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
          />
          <SettingItem
            icon="help-circle"
            title="Trợ giúp & Hỗ trợ"
            onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
          />
        </SettingSection>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EBookFarm Mobile v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2024 EBookFarm. All rights reserved.</Text>
        </View>
      </ScrollView>
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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});

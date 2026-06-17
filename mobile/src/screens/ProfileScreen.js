import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation();

  const menuItems = [
    {
      icon: 'user',
      title: 'Thông tin tài khoản',
      subtitle: 'Cập nhật hồ sơ cá nhân',
      onPress: () => navigation.navigate('AccountInfo'),
      color: '#3b82f6',
    },
    {
      icon: 'lock',
      title: 'Đổi mật khẩu',
      subtitle: 'Bảo mật tài khoản',
      onPress: () => navigation.navigate('ChangePassword'),
      color: '#f59e0b',
    },
    {
      icon: 'package',
      title: 'Kho vật tư',
      subtitle: 'Quản lý vật tư nông nghiệp',
      onPress: () => navigation.navigate('Inventory'),
      color: '#06b6d4',
    },
    {
      icon: 'shopping-bag',
      title: 'Xin cấp vật tư',
      subtitle: 'Đăng ký yêu cầu vật tư',
      onPress: () => navigation.navigate('Supply'),
      color: '#ef4444',
    },
    {
      icon: 'award',
      title: 'Tiêu chuẩn TCVN',
      subtitle: 'Quy chuẩn kỹ thuật quốc gia',
      onPress: () => navigation.navigate('TCVN'),
      color: '#f59e0b',
    },
    {
      icon: 'bell',
      title: 'Thông báo',
      subtitle: 'Xem thông báo hệ thống',
      onPress: () => navigation.navigate('Notifications'),
      color: '#8b5cf6',
    },
    {
      icon: 'file-text',
      title: 'Tin tức',
      subtitle: 'Xem tin tức nông nghiệp',
      onPress: () => navigation.navigate('NewsList'),
      color: '#22c55e',
    },
    {
      icon: 'book-open',
      title: 'Tài liệu kỹ thuật',
      subtitle: 'Hướng dẫn VietGAP',
      onPress: () => navigation.navigate('ProductionTech'),
      color: '#16a34a',
    },
    {
      icon: 'settings',
      title: 'Cài đặt',
      subtitle: 'Tùy chỉnh ứng dụng',
      onPress: () => navigation.navigate('Settings'),
      color: '#64748b',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
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
          </View>
          <Text style={styles.name}>{user?.fullname || user?.username}</Text>
          <Text style={styles.role}>
            {user?.role === 'Admin' ? 'Quản trị viên' : 
             user?.role === 'Farmer' ? 'Nông dân' : 
             user?.role === 'HTX' ? 'Hợp tác xã' : 
             user?.role}
          </Text>
          
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Feather name="mail" size={18} color="#64748b" />
              <Text style={styles.infoText}>{user?.email || 'Không có email'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Feather name="phone" size={18} color="#64748b" />
              <Text style={styles.infoText}>{user?.phone || 'Chưa cập nhật SĐT'}</Text>
            </View>
            {user?.organization && (
              <View style={styles.infoRow}>
                <Feather name="briefcase" size={18} color="#64748b" />
                <Text style={styles.infoText}>{user.organization}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Feather name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Feather name="log-out" size={20} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Đăng xuất khỏi hệ thống</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>EBookFarm Mobile v1.0.0</Text>
          <Text style={styles.footerSubtext}>© 2024 All rights reserved</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
    marginBottom: 20,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    color: '#475569',
    fontSize: 15,
    flex: 1,
  },
  menuSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 4,
  },
});

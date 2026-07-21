import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../../auth/store/authStore';

const ROLE_LABELS = {
  FARMLEADER: 'Trưởng nhóm nông trại',
  FARM_LEADER: 'Trưởng nhóm nông trại',
  FarmLeader: 'Trưởng nhóm nông trại',
  FARMSUPERVISOR: 'Giám sát nông trại',
  FARM_SUPERVISOR: 'Giám sát nông trại',
  FarmSupervisor: 'Giám sát nông trại',
};

const MENU_ITEMS = [
  {
    route: 'AccountInfo',
    icon: 'user',
    title: 'Thông tin tài khoản',
    subtitle: 'Cập nhật hồ sơ và ảnh đại diện',
    color: '#2563eb',
  },
  {
    route: 'ChangePassword',
    icon: 'lock',
    title: 'Đổi mật khẩu',
    subtitle: 'Bảo mật tài khoản của bạn',
    color: '#d97706',
  },
  {
    route: 'Settings',
    icon: 'settings',
    title: 'Cài đặt',
    subtitle: 'Thông báo và tùy chọn ứng dụng',
    color: '#64748b',
  },
];

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigation = useNavigation();
  const displayName = user?.fullname || user?.fullName || user?.username || 'Người dùng';
  const avatar = user?.avatar || user?.avatarUrl;
  const role = ROLE_LABELS[user?.role] || ROLE_LABELS[String(user?.role || '').toUpperCase()] || user?.role || 'Farm Leader';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
        <Text style={styles.headerSubtitle}>Quản lý tài khoản của bạn</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.role}>{role}</Text>
          <View style={styles.infoBox}>
            <View style={styles.infoRow}><Feather name="mail" size={17} color="#64748b" /><Text style={styles.infoText}>{user?.email || 'Chưa cập nhật email'}</Text></View>
            <View style={styles.infoRow}><Feather name="phone" size={17} color="#64748b" /><Text style={styles.infoText}>{user?.phone || user?.phoneNumber || 'Chưa cập nhật số điện thoại'}</Text></View>
          </View>
        </View>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity key={item.route} style={styles.menuItem} onPress={() => navigation.navigate(item.route)}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}18` }]}><Feather name={item.icon} size={21} color={item.color} /></View>
              <View style={styles.menuText}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Feather name="log-out" size={19} color="#dc2626" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 18 },
  headerTitle: { color: '#fff', fontSize: 23, fontWeight: '900' },
  headerSubtitle: { color: '#dcfce7', marginTop: 4, fontSize: 13 },
  content: { padding: 16, paddingBottom: 96 },
  profileCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  name: { color: '#0f172a', fontSize: 21, fontWeight: '900', marginTop: 12 },
  role: { color: '#15803d', backgroundColor: '#dcfce7', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 4, fontSize: 12, fontWeight: '700', marginTop: 6 },
  infoBox: { alignSelf: 'stretch', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginTop: 18, gap: 11 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoText: { flex: 1, color: '#475569', fontSize: 14 },
  menu: { marginTop: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  menuText: { flex: 1 },
  menuTitle: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  menuSubtitle: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', borderRadius: 13, padding: 14, marginTop: 8 },
  logoutText: { color: '#dc2626', fontWeight: '800', fontSize: 15 },
});

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const rolesOf = (user) => (Array.isArray(user?.roles) ? user.roles : [user?.role]).map((role) => String(role || '').toUpperCase());
const userIdOf = (item) => item?.userId || item?.farmerId || item?.assignedUserId || item?.id;

export default function AssignmentModal({ visible, task, users, saving, onClose, onSave }) {
  const [leaderId, setLeaderId] = useState(null);
  const [farmerIds, setFarmerIds] = useState([]);

  const leaders = useMemo(() => users.filter((user) => rolesOf(user).includes('FARM_LEADER')), [users]);
  const farmers = useMemo(() => users.filter((user) => rolesOf(user).includes('FARMER')), [users]);

  useEffect(() => {
    if (!visible) return;
    setLeaderId(task?.assignedLeaderId || null);
    setFarmerIds((task?.assignments || []).map(userIdOf).filter(Boolean));
  }, [task, visible]);

  const toggleFarmer = (id) => {
    setFarmerIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const renderPerson = (item, selected, onPress, roleLabel) => (
    <TouchableOpacity key={item.id} style={[styles.person, selected && styles.personSelected]} onPress={onPress}>
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>{(item.fullName || item.email || 'N').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.personText}>
        <Text style={styles.personName}>{item.fullName || item.email}</Text>
        <Text style={styles.personMeta}>{roleLabel} · {item.phoneNumber || item.email || 'Chưa có liên hệ'}</Text>
      </View>
      <Feather name={selected ? 'check-circle' : 'circle'} size={21} color={selected ? '#16a34a' : '#cbd5e1'} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose} disabled={saving}><Feather name="x" size={24} color="#334155" /></TouchableOpacity>
          <View style={styles.headerText}><Text style={styles.title}>Phân công nhân sự</Text><Text style={styles.subtitle} numberOfLines={1}>{task?.name || 'Công việc'}</Text></View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.sectionTitle}>Tổ trưởng thực hiện</Text>
              <Text style={styles.help}>Chọn tối đa một Tổ trưởng.</Text>
              {leaders.length
                ? leaders.map((item) => renderPerson(item, leaderId === item.id, () => setLeaderId(leaderId === item.id ? null : item.id), 'Tổ trưởng'))
                : <Text style={styles.empty}>Chưa có tài khoản Tổ trưởng.</Text>}

              <Text style={[styles.sectionTitle, styles.farmerTitle]}>Nông dân tham gia</Text>
              <Text style={styles.help}>Có thể chọn nhiều nông dân cho cùng một công việc.</Text>
              {farmers.length
                ? farmers.map((item) => renderPerson(item, farmerIds.includes(item.id), () => toggleFarmer(item.id), 'Nông dân'))
                : <Text style={styles.empty}>Chưa có tài khoản nông dân.</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={saving}><Text style={styles.cancelText}>Hủy</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => onSave({ leaderId, farmerIds })} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <><Feather name="user-check" size={18} color="#fff" /><Text style={styles.saveText}>Lưu phân công</Text></>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  header: { paddingTop: 52, paddingHorizontal: 12, paddingBottom: 13, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { color: '#0f172a', fontSize: 19, fontWeight: '900' },
  subtitle: { color: '#15803d', fontSize: 12, fontWeight: '700', marginTop: 2, maxWidth: '90%' },
  content: { padding: 16, paddingBottom: 30 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  farmerTitle: { marginTop: 24 },
  help: { color: '#64748b', fontSize: 12, marginTop: 3, marginBottom: 11 },
  person: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 13, padding: 12, marginBottom: 9 },
  personSelected: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarSelected: { backgroundColor: '#dcfce7' },
  avatarText: { color: '#64748b', fontWeight: '900' },
  avatarTextSelected: { color: '#15803d' },
  personText: { flex: 1 },
  personName: { color: '#1e293b', fontWeight: '800' },
  personMeta: { color: '#64748b', fontSize: 11, marginTop: 3 },
  empty: { color: '#94a3b8', textAlign: 'center', paddingVertical: 24 },
  footer: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 28, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  button: { flex: 1, minHeight: 48, borderRadius: 11, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { borderWidth: 1, borderColor: '#cbd5e1' },
  saveButton: { backgroundColor: '#16a34a' },
  cancelText: { color: '#475569', fontWeight: '800' },
  saveText: { color: '#fff', fontWeight: '900' },
});

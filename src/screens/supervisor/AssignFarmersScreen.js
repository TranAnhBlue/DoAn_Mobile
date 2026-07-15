import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {useFocusEffect} from '@react-navigation/native';
import {apiClient} from '../../services/apiClient';
import {colors} from '../../theme/colors';

export default function AssignFarmersScreen({navigation, route}) {
  const {seasonId} = route.params;
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState([]);
  const [assignedFarmerIds, setAssignedFarmerIds] = useState([]);
  const [assigning, setAssigning] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [seasonData, bootstrapData] = await Promise.all([
        apiClient.getSeasonDetail(seasonId),
        apiClient.bootstrap(),
      ]);

      const allFarmers = (bootstrapData.users || []).filter(
        u => u.role === 'FARMER' && !u.deletedAt,
      );

      const assigned = seasonData.assignments.map(a => a.farmerId);

      setFarmers(allFarmers);
      setAssignedFarmerIds(assigned);
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách nông dân');
    } finally {
      setLoading(false);
    }
  }, [seasonId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleAssignFarmer = async (farmerId) => {
    try {
      setAssigning(farmerId);
      await apiClient.assignFarmer(seasonId, farmerId);
      Alert.alert('Thành công', 'Đã giao nông dân vào mùa vụ');
      setAssignedFarmerIds(prev => [...prev, farmerId]);
    } catch (error) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={colors.gray800} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Giao nông dân</Text>
          <View style={{width: 40}} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green600} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giao nông dân</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Feather name="info" size={20} color={colors.blue600} />
          <Text style={styles.infoText}>
            Chọn nông dân để giao phụ trách mùa vụ này
          </Text>
        </View>

        {farmers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="users" size={64} color={colors.gray300} />
            <Text style={styles.emptyText}>Không có nông dân khả dụng</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {farmers.map((farmer, index) => {
              const isAssigned = assignedFarmerIds.includes(farmer.id);
              const isAssigning = assigning === farmer.id;

              return (
                <View
                  key={farmer.id}
                  style={[
                    styles.farmerItem,
                    index < farmers.length - 1 && styles.farmerItemBorder,
                  ]}>
                  <View style={styles.farmerAvatar}>
                    <Feather name="user" size={24} color={colors.green600} />
                  </View>
                  <View style={styles.farmerInfo}>
                    <Text style={styles.farmerName}>{farmer.fullName}</Text>
                    <Text style={styles.farmerPhone}>{farmer.phone}</Text>
                  </View>
                  {isAssigned ? (
                    <View style={styles.assignedBadge}>
                      <Feather name="check" size={16} color={colors.green600} />
                      <Text style={styles.assignedText}>Đã giao</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.assignButton}
                      onPress={() => handleAssignFarmer(farmer.id)}
                      disabled={isAssigning}>
                      {isAssigning ? (
                        <ActivityIndicator size="small" color={colors.green600} />
                      ) : (
                        <>
                          <Feather name="plus" size={16} color={colors.green600} />
                          <Text style={styles.assignButtonText}>Giao</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray800,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue50,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.blue600,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.blue700,
    marginLeft: 12,
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  farmerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  farmerItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  farmerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginBottom: 4,
  },
  farmerPhone: {
    fontSize: 14,
    color: colors.gray500,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  assignedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.green700,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.green600,
    gap: 6,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.green600,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray500,
    marginTop: 16,
  },
});

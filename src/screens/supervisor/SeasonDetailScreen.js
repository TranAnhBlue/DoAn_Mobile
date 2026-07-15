import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {useFocusEffect} from '@react-navigation/native';
import {apiClient} from '../../services/apiClient';
import {colors} from '../../theme/colors';

export default function SeasonDetailScreen({navigation, route}) {
  const {seasonId} = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seasonData, setSeasonData] = useState(null);

  const fetchSeasonDetail = useCallback(async () => {
    try {
      const data = await apiClient.getSeasonDetail(seasonId);
      setSeasonData(data);
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể tải chi tiết mùa vụ');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [seasonId, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchSeasonDetail();
    }, [fetchSeasonDetail]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSeasonDetail();
  };

  const handleAssignFarmer = () => {
    navigation.navigate('AssignFarmers', {seasonId});
  };

  const handleStartPhase = async (phase) => {
    Alert.alert(
      'Bắt đầu giai đoạn',
      `Xác nhận bắt đầu giai đoạn "${phase.title}"?`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Bắt đầu',
          onPress: async () => {
            try {
              await apiClient.startPhase(seasonId, phase.id);
              Alert.alert('Thành công', 'Đã bắt đầu giai đoạn');
              fetchSeasonDetail();
            } catch (error) {
              Alert.alert('Lỗi', error.message);
            }
          },
        },
      ],
    );
  };

  const handleCompletePhase = (phase) => {
    Alert.alert(
      'Hoàn thành giai đoạn',
      `Xác nhận hoàn thành giai đoạn "${phase.title}"?`,
      [
        {text: 'Hủy', style: 'cancel'},
        {
          text: 'Hoàn thành',
          onPress: async () => {
            try {
              await apiClient.completePhase(seasonId, phase.id);
              Alert.alert('Thành công', 'Đã hoàn thành giai đoạn');
              fetchSeasonDetail();
            } catch (error) {
              Alert.alert('Lỗi', error.message);
            }
          },
        },
      ],
    );
  };

  const handleWriteDiary = (phase) => {
    navigation.navigate('SupervisorFieldDiary', {
      seasonId,
      phaseId: phase.id,
      phaseTitle: phase.title,
    });
  };

  const getPhaseStatusStyle = (status) => {
    switch (status) {
      case 'DONE':
        return {bg: colors.green50, text: colors.green700, label: 'Hoàn thành'};
      case 'IN_PROGRESS':
        return {bg: colors.amber50, text: colors.amber700, label: 'Đang thực hiện'};
      default:
        return {bg: colors.gray50, text: colors.gray500, label: 'Chưa bắt đầu'};
    }
  };

  const renderPhaseIcon = (status) => {
    switch (status) {
      case 'DONE':
        return (
          <View style={[styles.phaseIcon, {backgroundColor: colors.green600}]}>
            <Feather name="check" size={16} color="white" />
          </View>
        );
      case 'IN_PROGRESS':
        return (
          <View style={[styles.phaseIcon, styles.phaseIconInProgress]}>
            <View style={styles.phaseIconDot} />
          </View>
        );
      default:
        return <View style={[styles.phaseIcon, styles.phaseIconNotStarted]} />;
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
          <Text style={styles.headerTitle}>Chi tiết Mùa vụ</Text>
          <View style={{width: 40}} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green600} />
        </View>
      </SafeAreaView>
    );
  }

  if (!seasonData) return null;

  const {season, phases, assignments, farmerReports} = seasonData;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.gray800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Mùa vụ</Text>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={handleAssignFarmer}>
          <Feather name="user-plus" size={20} color={colors.green600} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Season Info Card */}
        <View style={styles.card}>
          <Text style={styles.seasonName}>{season.name}</Text>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={colors.gray500} />
            <Text style={styles.infoText}>{season.areaName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="tag" size={16} color={colors.gray500} />
            <Text style={styles.infoText}>
              {season.category} - {season.specificCrop}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color={colors.gray500} />
            <Text style={styles.infoText}>
              Bắt đầu: {season.startDate || season.expectedStartDate}
            </Text>
          </View>
        </View>

        {/* Assigned Farmers */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nông dân được giao</Text>
          <Text style={styles.sectionCount}>{assignments.length}</Text>
        </View>
        {assignments.length > 0 ? (
          <View style={styles.card}>
            {assignments.map((assignment, index) => (
              <View
                key={assignment.id}
                style={[
                  styles.farmerItem,
                  index < assignments.length - 1 && styles.farmerItemBorder,
                ]}>
                <View style={styles.farmerAvatar}>
                  <Feather name="user" size={20} color={colors.green600} />
                </View>
                <View style={styles.farmerInfo}>
                  <Text style={styles.farmerName}>{assignment.farmerName}</Text>
                  <Text style={styles.farmerPhone}>{assignment.farmerPhone}</Text>
                </View>
                {assignment.status === 'ACTIVE' && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>Đang làm</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Feather name="users" size={48} color={colors.gray300} />
            <Text style={styles.emptyText}>Chưa có nông dân nào được giao</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAssignFarmer}>
              <Text style={styles.emptyButtonText}>Giao nông dân</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recent Reports */}
        {farmerReports.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Báo cáo gần đây</Text>
              <Text style={styles.sectionCount}>{farmerReports.length}</Text>
            </View>
            <View style={styles.card}>
              {farmerReports.slice(0, 3).map((report, index) => (
                <View
                  key={report.id}
                  style={[
                    styles.reportItem,
                    index < Math.min(farmerReports.length, 3) - 1 &&
                      styles.reportItemBorder,
                  ]}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportDate}>{report.reportDate}</Text>
                    <Text style={styles.reportFarmer}>{report.farmerName}</Text>
                  </View>
                  <Text style={styles.reportNote} numberOfLines={2}>
                    {report.note}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Phases Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quy trình kỹ thuật</Text>
          <Text style={styles.sectionCount}>{phases.length} giai đoạn</Text>
        </View>

        <View style={styles.card}>
          {phases.map((phase, index) => {
            const isLast = index === phases.length - 1;
            const statusStyle = getPhaseStatusStyle(phase.status);

            return (
              <View key={phase.id} style={styles.phaseContainer}>
                <View style={styles.phaseLeft}>
                  {renderPhaseIcon(phase.status)}
                  {!isLast && <View style={styles.phaseLine} />}
                </View>

                <View style={[styles.phaseContent, isLast && {paddingBottom: 0}]}>
                  <View style={styles.phaseHeader}>
                    <Text style={styles.phaseTitle}>
                      Giai đoạn {phase.phaseOrder}: {phase.title}
                    </Text>
                    <View
                      style={[
                        styles.phaseStatusBadge,
                        {backgroundColor: statusStyle.bg},
                      ]}>
                      <Text
                        style={[
                          styles.phaseStatusText,
                          {color: statusStyle.text},
                        ]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  {phase.dateFrom && (
                    <Text style={styles.phaseDate}>
                      {phase.dateFrom}
                      {phase.dateTo && ` - ${phase.dateTo}`}
                    </Text>
                  )}

                  {phase.technicalDescription && (
                    <View style={styles.technicalBox}>
                      <Text style={styles.technicalText}>
                        {phase.technicalDescription.content}
                      </Text>
                    </View>
                  )}

                  {/* Phase Actions */}
                  <View style={styles.phaseActions}>
                    {phase.status === 'NOT_STARTED' && (
                      <TouchableOpacity
                        style={styles.phaseButton}
                        onPress={() => handleStartPhase(phase)}>
                        <Feather
                          name="play-circle"
                          size={16}
                          color={colors.green600}
                        />
                        <Text style={styles.phaseButtonText}>Bắt đầu</Text>
                      </TouchableOpacity>
                    )}

                    {phase.status === 'IN_PROGRESS' && (
                      <>
                        <TouchableOpacity
                          style={styles.phaseButton}
                          onPress={() => handleWriteDiary(phase)}>
                          <Feather name="edit" size={16} color={colors.blue600} />
                          <Text style={[styles.phaseButtonText, {color: colors.blue600}]}>
                            Ghi nhật ký
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.phaseButton, styles.phaseButtonPrimary]}
                          onPress={() => handleCompletePhase(phase)}>
                          <Feather name="check-circle" size={16} color="white" />
                          <Text style={styles.phaseButtonTextPrimary}>
                            Hoàn thành
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{height: 20}} />
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
  headerAction: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  seasonName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray800,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.gray600,
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray800,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray500,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  farmerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
  },
  farmerPhone: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: colors.green50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green700,
  },
  emptyCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 12,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: colors.green600,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  reportItem: {
    paddingVertical: 12,
  },
  reportItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reportDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray500,
  },
  reportFarmer: {
    fontSize: 12,
    color: colors.gray600,
  },
  reportNote: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
  },
  phaseContainer: {
    flexDirection: 'row',
  },
  phaseLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseIconInProgress: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: colors.green600,
  },
  phaseIconNotStarted: {
    backgroundColor: colors.gray100,
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  phaseIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green600,
  },
  phaseLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.gray200,
    marginVertical: 4,
  },
  phaseContent: {
    flex: 1,
    paddingBottom: 20,
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  phaseTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray800,
    marginRight: 8,
  },
  phaseStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phaseStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  phaseDate: {
    fontSize: 12,
    color: colors.gray400,
    marginBottom: 8,
  },
  technicalBox: {
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.green600,
  },
  technicalText: {
    fontSize: 14,
    color: colors.gray700,
    lineHeight: 20,
  },
  phaseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  phaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: 'white',
    gap: 6,
  },
  phaseButtonPrimary: {
    backgroundColor: colors.green600,
    borderColor: colors.green600,
  },
  phaseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.green600,
  },
  phaseButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

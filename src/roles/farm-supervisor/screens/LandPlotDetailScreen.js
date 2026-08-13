import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { formatVietnamDateTime } from '../../../features/notifications/utils/dateTime';
import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import { formatNumber, resolveAvatarUrl } from '../../../shared/utils/format';
import supervisorApi from '../api/supervisorApi';
import GisBoundaryMap from '../components/GisBoundaryMap';

const valueOf = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

export default function LandPlotDetailScreen({ navigation, route }) {
  const landPlotId = route.params?.landPlotId;
  const [plot, setPlot] = useState(route.params?.landPlot || null);
  const [weather, setWeather] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(!route.params?.landPlot);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!landPlotId) return;
    setError('');
    const [plotResult, weatherResult, logsResult] = await Promise.allSettled([
      supervisorApi.getLandPlot(landPlotId),
      supervisorApi.getLandPlotWeather(landPlotId),
      supervisorApi.getLandPlotLogs(landPlotId),
    ]);

    if (plotResult.status === 'fulfilled') setPlot(unwrapPayload(plotResult.value.data));
    else setError(getApiErrorMessage(plotResult.reason, 'Không thể tải chi tiết vùng trồng.'));

    if (weatherResult.status === 'fulfilled') setWeather(unwrapPayload(weatherResult.value.data));
    if (logsResult.status === 'fulfilled') setLogs(extractItems(logsResult.value.data));
    setLoading(false);
    setRefreshing(false);
  }, [landPlotId]);

  useFocusEffect(useCallback(() => { fetchDetail(); }, [fetchDetail]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  const statusStr = String(plot?.status || '').toUpperCase();
  const isInUse = statusStr === 'IN_USE' || statusStr === 'ACTIVE' || !!plot?.currentLogbookName || !!plot?.cropName;
  const logbookName = valueOf(plot?.currentLogbookName, plot?.logbookName, plot?.cultivationLogbookName);
  const cropName = valueOf(plot?.cropName, plot?.crop?.name, plot?.cultivationCropName);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết vùng trồng</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} colors={['#15803d']} />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* 1. Thông tin vùng trồng */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Feather name="info" size={16} color="#15803d" />
            <Text style={styles.cardHeaderTitle}>Thông tin vùng trồng</Text>
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Tên vùng trồng</Text>
              <Text style={styles.tableValueBold}>{plot?.name || 'Chưa cập nhật'}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Diện tích</Text>
              <Text style={styles.tableValue}>{plot?.area != null ? `${formatNumber(plot.area)} m²` : 'Chưa cập nhật'}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Địa chỉ</Text>
              <Text style={styles.tableValue}>{plot?.address || 'Chưa cập nhật'}</Text>
            </View>

            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Trạng thái canh tác</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.statusBadgeRow}>
                  <View style={[styles.statusDot, isInUse ? styles.statusDotActive : styles.statusDotInactive]} />
                  <Text style={[styles.statusBadgeText, isInUse ? styles.statusTextActive : styles.statusTextInactive]}>
                    {isInUse ? 'Đang trồng' : 'Chưa sử dụng'}
                  </Text>
                </View>
                {logbookName ? <Text style={styles.subMeta}>Nhật ký: <Text style={{ fontWeight: '600', color: '#334155' }}>{logbookName}</Text></Text> : null}
                {cropName ? <Text style={styles.subMeta}>Cây trồng: <Text style={{ fontWeight: '600', color: '#334155' }}>{cropName}</Text></Text> : null}
              </View>
            </View>

            <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.tableLabel}>Mô tả</Text>
              <Text style={styles.tableValue}>{plot?.description || 'Chưa cập nhật'}</Text>
            </View>
          </View>
        </View>

        {/* Alert: Vùng trồng đang được sử dụng */}
        {isInUse ? (
          <View style={styles.inUseAlert}>
            <View style={styles.inUseAlertIconCircle}>
              <Feather name="alert-circle" size={16} color="#c2410c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inUseAlertTitle}>Vùng trồng đang được sử dụng</Text>
              <Text style={styles.inUseAlertSub}>
                Thông tin vùng trồng và cây trồng sẽ được khóa cho đến khi nhật ký hoàn thành hoặc bị hủy.
              </Text>
            </View>
          </View>
        ) : null}

        {/* 2. Bản đồ ranh giới (GIS) */}
        <GisBoundaryMap plot={plot} height={320} />

        {/* 3. Thời tiết hiện tại */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="sun" size={16} color="#166534" />
              <Text style={styles.weatherHeaderTitle}>Thời tiết hiện tại</Text>
            </View>
            <TouchableOpacity onPress={fetchDetail} hitSlop={8}>
              <Feather name="refresh-cw" size={14} color="#166534" />
            </TouchableOpacity>
          </View>

          {weather ? (
            <View style={styles.weatherBody}>
              <View style={styles.weatherMainRow}>
                <Feather name="cloud" size={36} color="#0284c7" />
                <View>
                  <Text style={styles.tempText}>{weather.temperature ?? '--'}°C</Text>
                  <Text style={styles.conditionText}>{weather.weatherCondition || 'Phần lớn quang đãng'}</Text>
                </View>
              </View>

              <View style={styles.weatherMetricsGrid}>
                <View style={styles.metricCell}>
                  <Feather name="droplet" size={14} color="#0284c7" />
                  <View>
                    <Text style={styles.metricLabel}>Độ ẩm</Text>
                    <Text style={styles.metricValue}>{weather.humidity ?? '--'}%</Text>
                  </View>
                </View>

                <View style={styles.metricCell}>
                  <Feather name="wind" size={14} color="#0284c7" />
                  <View>
                    <Text style={styles.metricLabel}>Gió</Text>
                    <Text style={styles.metricValue}>{weather.windSpeed ?? '--'} km/h</Text>
                  </View>
                </View>

                {weather.feelsLike != null ? (
                  <View style={styles.metricCell}>
                    <Feather name="thermometer" size={14} color="#e11d48" />
                    <View>
                      <Text style={styles.metricLabel}>Cảm giác</Text>
                      <Text style={styles.metricValue}>{weather.feelsLike}°C</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              <Text style={styles.weatherUpdatedTime}>
                Cập nhật lúc: {formatVietnamDateTime(weather.updatedAt || new Date(), 'Chưa xác định')}
              </Text>
            </View>
          ) : (
            <View style={{ padding: 14 }}>
              <Text style={styles.weatherUnavailable}>Chưa có dữ liệu thời tiết hoặc vùng trồng chưa có tọa độ.</Text>
            </View>
          )}
        </View>

        {/* 4. Nhật ký phát sinh */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Nhật ký phát sinh ({logs.length})</Text>
        </View>

        {logs.map((log, index) => {
          const rawImgs = log.images || log.imageUrls || log.photos || log.dailyLogImages || (log.imageUrl ? [log.imageUrl] : []);
          const images = (Array.isArray(rawImgs) ? rawImgs : []).filter(Boolean);
          return (
            <View key={getEntityId(log) || index} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Feather name="file-text" size={16} color="#15803d" />
                <Text style={styles.logTitle}>{valueOf(log.taskName, log.activityName, log.title, 'Nhật ký canh tác')}</Text>
              </View>
              <Text style={styles.logBody}>{valueOf(log.description, log.notes, log.content, 'Không có mô tả')}</Text>
              {images.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                  {images.map((imgUrl, i) => (
                    <Image key={i} source={{ uri: resolveAvatarUrl(imgUrl) }} style={{ width: 70, height: 70, borderRadius: 8 }} />
                  ))}
                </ScrollView>
              ) : null}
              <Text style={styles.logDate}>{formatVietnamDateTime(valueOf(log.createdAt, log.logDate, log.performedAt), 'Không xác định')}</Text>
            </View>
          );
        })}
        {!logs.length ? <Text style={styles.empty}>Vùng trồng chưa có nhật ký phát sinh.</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#15803d',
    paddingTop: 50,
    paddingHorizontal: 12,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  error: { color: '#b91c1c', marginBottom: 12 },
  cover: { width: '100%', height: 160, borderRadius: 12, marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  tableContainer: {
    paddingHorizontal: 16,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  tableLabel: {
    width: 120,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  tableValue: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  tableValueBold: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: { backgroundColor: '#15803d' },
  statusDotInactive: { backgroundColor: '#64748b' },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusTextActive: { color: '#15803d' },
  statusTextInactive: { color: '#64748b' },
  subMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  inUseAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  inUseAlertIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inUseAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9a3412',
    marginBottom: 2,
  },
  inUseAlertSub: {
    fontSize: 12,
    color: '#9a3412',
    lineHeight: 18,
  },
  weatherCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 14,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dcfce7',
  },
  weatherHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  weatherBody: {
    padding: 16,
    gap: 14,
  },
  weatherMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tempText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
  },
  conditionText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  weatherMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 1,
  },
  weatherUpdatedTime: {
    fontSize: 11,
    color: '#64748b',
  },
  weatherUnavailable: {
    fontSize: 13,
    color: '#64748b',
  },
  sectionHeaderRow: {
    marginTop: 6,
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  logBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
  },
  logDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },
  empty: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
});

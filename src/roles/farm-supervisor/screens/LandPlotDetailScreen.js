import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { extractItems, getApiErrorMessage, getEntityId, unwrapPayload } from '../../../shared/api/response';
import { formatVietnamDateTime } from '../../../features/notifications/utils/dateTime';
import supervisorApi from '../api/supervisorApi';

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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#15803d" /></View>;
  const active = ['ACTIVE', 'AVAILABLE', 'IN_USE'].includes(String(plot?.status || '').toUpperCase());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết vùng trồng</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} colors={['#15803d']} />}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {plot?.imageUrl ? <Image source={{ uri: plot.imageUrl }} style={styles.cover} /> : <View style={styles.coverFallback}><Feather name="map" size={45} color="#15803d" /><Text style={styles.coverText}>Vùng trồng EAPLS</Text></View>}

        <View style={styles.titleCard}>
          <View style={styles.titleLine}><View style={styles.pin}><Feather name="map-pin" size={21} color="#15803d" /></View><View style={styles.titleText}><Text style={styles.name}>{plot?.name || 'Vùng trồng'}</Text><Text style={styles.code}>{plot?.code || 'Chưa có mã vùng'}</Text></View><View style={[styles.status, active && styles.statusActive]}><Text style={[styles.statusText, active && styles.statusTextActive]}>{active ? 'Hoạt động' : plot?.status || 'Không rõ'}</Text></View></View>
          {plot?.description ? <Text style={styles.description}>{plot.description}</Text> : null}
        </View>

        <Text style={styles.sectionHeading}>Thông tin vùng trồng</Text>
        <View style={styles.card}>
          <Info icon="maximize" label="Diện tích" value={`${valueOf(plot?.area, '--')} ${plot?.areaUnit || 'ha'}`} />
          <Info icon="layers" label="Loại đất" value={valueOf(plot?.soilTypeName, plot?.soilType?.name, plot?.soilTypeId)} />
          <Info icon="home" label="Hình thức sở hữu" value={plot?.ownershipType} />
          <Info icon="map-pin" label="Địa chỉ" value={plot?.address} />
          <Info icon="navigation" label="Tọa độ GPS" value={plot?.latitude != null && plot?.longitude != null ? `${plot.latitude}, ${plot.longitude}` : null} last />
        </View>

        <Text style={styles.sectionHeading}>Thời tiết hiện tại</Text>
        <View style={styles.weatherCard}>
          {weather ? <>
            <View style={styles.weatherMain}><Feather name="cloud" size={32} color="#fff" /><View><Text style={styles.temperature}>{weather.temperature ?? '--'}°C</Text><Text style={styles.condition}>{weather.weatherCondition || 'Đang cập nhật'}</Text></View></View>
            <View style={styles.weatherDetails}><WeatherItem icon="droplet" label="Độ ẩm" value={`${weather.humidity ?? '--'}%`} /><WeatherItem icon="wind" label="Gió" value={`${weather.windSpeed ?? '--'} km/h`} /></View>
            <Text style={styles.weatherTime}>Cập nhật: {formatVietnamDateTime(weather.updatedAt, 'Không xác định')}</Text>
          </> : <Text style={styles.weatherUnavailable}>Chưa có dữ liệu thời tiết hoặc vùng trồng chưa có tọa độ.</Text>}
        </View>

        <Text style={styles.sectionHeading}>Nhật ký phát sinh ({logs.length})</Text>
        {logs.map((log, index) => (
          <View key={getEntityId(log) || index} style={styles.logCard}>
            <View style={styles.logHeader}><Feather name="file-text" size={17} color="#15803d" /><Text style={styles.logTitle}>{valueOf(log.taskName, log.activityName, log.title, 'Nhật ký canh tác')}</Text></View>
            <Text style={styles.logBody}>{valueOf(log.description, log.notes, log.content, 'Không có mô tả')}</Text>
            <Text style={styles.logDate}>{formatVietnamDateTime(valueOf(log.createdAt, log.logDate, log.performedAt), 'Không xác định')}</Text>
          </View>
        ))}
        {!logs.length ? <Text style={styles.empty}>Vùng trồng chưa có nhật ký phát sinh.</Text> : null}
      </ScrollView>
    </View>
  );
}

function Info({ icon, label, value, last }) {
  return <View style={[styles.info, last && styles.infoLast]}><Feather name={icon} size={17} color="#64748b" /><View style={styles.infoText}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text></View></View>;
}

function WeatherItem({ icon, label, value }) {
  return <View style={styles.weatherItem}><Feather name={icon} size={18} color="#dcfce7" /><View><Text style={styles.weatherLabel}>{label}</Text><Text style={styles.weatherValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6fbf7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6fbf7' },
  header: { backgroundColor: '#15803d', paddingTop: 50, paddingHorizontal: 10, paddingBottom: 13, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', textAlign: 'center', fontSize: 19, fontWeight: '900' },
  content: { padding: 15, paddingBottom: 40 },
  error: { color: '#b91c1c', marginBottom: 12 },
  cover: { width: '100%', height: 180, borderRadius: 17, backgroundColor: '#e2e8f0' },
  coverFallback: { height: 155, borderRadius: 17, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  coverText: { color: '#15803d', fontWeight: '800', marginTop: 8 },
  titleCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginTop: 12 },
  titleLine: { flexDirection: 'row', alignItems: 'center' },
  pin: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  titleText: { flex: 1 },
  name: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  code: { color: '#64748b', fontSize: 12, marginTop: 3 },
  status: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusActive: { backgroundColor: '#dcfce7' },
  statusText: { color: '#64748b', fontSize: 10, fontWeight: '900' },
  statusTextActive: { color: '#15803d' },
  description: { color: '#475569', lineHeight: 20, marginTop: 12 },
  sectionHeading: { color: '#0f172a', fontSize: 15, fontWeight: '900', marginTop: 18, marginBottom: 9 },
  card: { backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 15 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLast: { borderBottomWidth: 0 },
  infoText: { flex: 1 },
  infoLabel: { color: '#94a3b8', fontSize: 11 },
  infoValue: { color: '#334155', fontWeight: '700', marginTop: 2 },
  weatherCard: { backgroundColor: '#15803d', borderRadius: 16, padding: 16 },
  weatherMain: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  temperature: { color: '#fff', fontSize: 25, fontWeight: '900' },
  condition: { color: '#dcfce7', fontSize: 12, marginTop: 2 },
  weatherDetails: { flexDirection: 'row', marginTop: 16, gap: 12 },
  weatherItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff18', borderRadius: 11, padding: 10 },
  weatherLabel: { color: '#bbf7d0', fontSize: 10 },
  weatherValue: { color: '#fff', fontWeight: '800', marginTop: 2 },
  weatherTime: { color: '#bbf7d0', fontSize: 10, marginTop: 12 },
  weatherUnavailable: { color: '#dcfce7', lineHeight: 20 },
  logCard: { backgroundColor: '#fff', borderRadius: 13, padding: 13, marginBottom: 9 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logTitle: { flex: 1, color: '#1e293b', fontWeight: '900' },
  logBody: { color: '#475569', lineHeight: 19, marginTop: 8 },
  logDate: { color: '#94a3b8', fontSize: 11, marginTop: 7 },
  empty: { color: '#94a3b8', textAlign: 'center', paddingVertical: 28 },
});

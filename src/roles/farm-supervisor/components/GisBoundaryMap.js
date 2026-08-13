import { Feather } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { formatNumber } from '../../../shared/utils/format';

/**
 * Extracts array of [lat, lng] coordinates from plot object
 */
export function parseBoundaryCoordinates(plot) {
  if (!plot) return [];

  const rawJson = plot.boundaryJson || plot.boundary || plot.geoJson || plot.geojson || plot.polygon || plot.coordinates;
  let parsed = null;

  if (typeof rawJson === 'string' && rawJson.trim()) {
    try {
      parsed = JSON.parse(rawJson);
    } catch (e) {
      // Not JSON string
    }
  } else if (typeof rawJson === 'object' && rawJson !== null) {
    parsed = rawJson;
  }

  if (parsed) {
    // GeoJSON FeatureCollection
    if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
      parsed = parsed.features[0]?.geometry;
    }
    // GeoJSON Feature
    if (parsed?.type === 'Feature') {
      parsed = parsed.geometry;
    }
    // GeoJSON Polygon: coordinates = [[[lng, lat], [lng, lat], ...]]
    if (parsed?.type === 'Polygon' && Array.isArray(parsed.coordinates)) {
      const ring = parsed.coordinates[0];
      if (Array.isArray(ring)) {
        return ring
          .map((pt) => [Number(pt[1]), Number(pt[0])])
          .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
      }
    }
    // GeoJSON MultiPolygon: coordinates = [[[[lng, lat], ...]]]
    if (parsed?.type === 'MultiPolygon' && Array.isArray(parsed.coordinates)) {
      const ring = parsed.coordinates[0]?.[0];
      if (Array.isArray(ring)) {
        return ring
          .map((pt) => [Number(pt[1]), Number(pt[0])])
          .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
      }
    }
    // Array of points: [[lat, lng], ...] or [{lat, lng}, ...]
    if (Array.isArray(parsed)) {
      return parsed
        .map((pt) => {
          if (Array.isArray(pt)) return [Number(pt[0]), Number(pt[1])];
          return [Number(pt.lat || pt.latitude), Number(pt.lng || pt.longitude)];
        })
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    }
  }

  // Single latitude & longitude fallback (create default box polygon)
  const lat = Number(plot.latitude || plot.lat || plot.centerLat || plot.centerLatitude);
  const lng = Number(plot.longitude || plot.lng || plot.centerLng || plot.centerLongitude);

  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    const d = 0.0015; // ~150 meters box
    return [
      [lat + d, lng - d],
      [lat + d, lng + d],
      [lat - d, lng + d],
      [lat - d, lng - d],
      [lat + d, lng - d],
    ];
  }

  return [];
}

export default function GisBoundaryMap({ plot, height = 300 }) {
  const coords = useMemo(() => parseBoundaryCoordinates(plot), [plot]);

  const centerLat = Number(plot?.latitude || plot?.lat) || (coords.length > 0 ? coords[0][0] : 21.0285);
  const centerLng = Number(plot?.longitude || plot?.lng) || (coords.length > 0 ? coords[0][1] : 105.8542);
  const plotName = plot?.name || 'Vùng trồng';
  const plotArea = plot?.area != null ? `${formatNumber(plot.area)} m²` : null;

  const htmlContent = useMemo(() => {
    const coordsJson = JSON.stringify(coords);

    return `
      <!DOCTYPE html>
      <html>
      <head>

        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
          }
          .leaflet-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .custom-popup {
            font-size: 13px;
            font-weight: 700;
            color: #15803d;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            var map = L.map('map', { zoomControl: true }).setView([${centerLat}, ${centerLng}], 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; OpenStreetMap'
            }).addTo(map);

            var coords = ${coordsJson};

            if (coords && coords.length > 0) {
              var polygon = L.polygon(coords, {
                color: '#15803d',
                weight: 3,
                fillColor: '#22c55e',
                fillOpacity: 0.35
              }).addTo(map);

              polygon.bindPopup('<div class="custom-popup"><b>${plotName}</b><br/>${plotArea ? plotArea : ''}</div>');
              map.fitBounds(polygon.getBounds(), { padding: [25, 25] });
            } else {
              L.marker([${centerLat}, ${centerLng}])
                .addTo(map)
                .bindPopup('<div class="custom-popup"><b>${plotName}</b></div>')
                .openPopup();
            }
          });
        </script>
      </body>
      </html>
    `;
  }, [coords, centerLat, centerLng, plotName, plotArea]);

  if (coords.length === 0 && !plot?.latitude && !plot?.longitude) {
    return (
      <View style={[styles.fallbackCard, { height }]}>
        <View style={styles.fallbackIconCircle}>
          <Feather name="map-pin" size={24} color="#15803d" />
        </View>
        <Text style={styles.fallbackTitle}>Bản đồ ranh giới (GIS)</Text>
        <Text style={styles.fallbackText}>Vùng trồng chưa có tọa độ ranh giới GIS hoặc tọa độ địa lý.</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapHeaderRow}>
        <Feather name="map" size={16} color="#15803d" />
        <Text style={styles.mapHeaderTitle}>Bản đồ ranh giới (GIS)</Text>
      </View>

      <View style={[styles.mapContainer, { height }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={{ flex: 1 }}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {plotArea ? (
        <View style={styles.mapFooter}>
          <Text style={styles.mapFooterText}>Diện tích ước tính: <Text style={{ fontWeight: '800', color: '#15803d' }}>{plotArea}</Text></Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginTop: 14,
    marginBottom: 10,
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  mapHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  mapContainer: {
    width: '100%',
    backgroundColor: '#f8fafc',
  },
  mapFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  mapFooterText: {
    fontSize: 13,
    color: '#475569',
  },
  fallbackCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  fallbackIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  fallbackText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});

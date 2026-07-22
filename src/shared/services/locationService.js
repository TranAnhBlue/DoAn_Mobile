import * as Location from 'expo-location';

const GEOCODE_TIMEOUT_MS = 3000;

/**
 * Lấy vị trí GPS hiện tại.
 * Trả về null nếu người dùng từ chối quyền hoặc thiết bị không hỗ trợ.
 * @returns {Promise<{ lat: number, lng: number, accuracy: number | null } | null>}
 */
export async function getCurrentLocation() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Reverse geocode tọa độ → tên địa điểm (xã/huyện/tỉnh).
 * Có timeout 3 giây; trả về null nếu thất bại hoặc offline.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string | null>}
 */
export async function reverseGeocode(lat, lng) {
  try {
    const result = await Promise.race([
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), GEOCODE_TIMEOUT_MS)
      ),
    ]);

    if (!result || !result.length) return null;
    const place = result[0];

    // Ghép: subregion (xã/phường) + city (huyện/quận) + region (tỉnh)
    const parts = [place.subregion, place.city, place.region].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  } catch {
    return null;
  }
}

/**
 * Lấy GPS + thử reverse geocode (với timeout).
 * @returns {Promise<{ lat: number, lng: number, accuracy: number | null, address: string | null } | null>}
 */
export async function getLocationWithAddress() {
  const coords = await getCurrentLocation();
  if (!coords) return null;

  const address = await reverseGeocode(coords.lat, coords.lng);
  return { ...coords, address };
}

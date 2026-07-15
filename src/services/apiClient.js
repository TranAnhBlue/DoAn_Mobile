import {API_BASE_CANDIDATES, API_BASE_URL, DEVICE_ID} from '../config/api';

let accessToken = null;
let refreshToken = null;
let preferredBaseUrl = API_BASE_URL;

export const setTokens = tokens => {
  accessToken = tokens?.accessToken || accessToken;
  refreshToken = tokens?.refreshToken || refreshToken;
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
};

const buildHeaders = options => ({
  Accept: 'application/json',
  'X-Device-Id': DEVICE_ID,
  ...(options.body instanceof FormData ? {} : {'Content-Type': 'application/json'}),
  ...(accessToken ? {Authorization: `Bearer ${accessToken}`} : {}),
  ...(options.headers || {}),
});

const parseJsonSafe = async response => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Phản hồi không hợp lệ từ server (${response.status})`);
  }
};

const tryRequest = async (baseUrl, path, options) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: buildHeaders(options),
  });

  const json = await parseJsonSafe(response);
  if (!response.ok || json.success === false) {
    const message = json?.error?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  preferredBaseUrl = baseUrl;
  return json;
};

const request = async (path, options = {}) => {
  const orderedBaseUrls = [
    preferredBaseUrl,
    ...API_BASE_CANDIDATES.filter(baseUrl => baseUrl !== preferredBaseUrl),
  ];

  let lastError;

  for (const baseUrl of orderedBaseUrls) {
    try {
      return await tryRequest(baseUrl, path, options);
    } catch (error) {
      lastError = error;

      // Retry other local candidates only for network-level failures.
      if (error instanceof TypeError) {
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

export const apiClient = {
  login: async ({phone, password}) => {
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({phone, password, deviceId: DEVICE_ID}),
    });
    setTokens(result.data);
    return result.data;
  },

  bootstrap: async ({cursor} = {}) => {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const result = await request(`/api/mobile/bootstrap${query}`);
    return result.data;
  },

  bulkSync: async ({userId, operations, cursor}) => {
    const result = await request('/api/sync/bulk', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: DEVICE_ID,
        userId,
        clientTime: new Date().toISOString(),
        cursor,
        operations,
      }),
    });
    return result.data;
  },

  uploadMedia: async ({mediaId, ownerType, ownerId, localUri, fileName, mimeType, caption, takenAt}) => {
    const form = new FormData();
    form.append('mediaId', mediaId);
    form.append('ownerType', ownerType);
    form.append('ownerId', ownerId);
    form.append('mediaType', 'IMAGE');
    if (caption) form.append('caption', caption);
    if (takenAt) form.append('takenAt', takenAt);
    form.append('file', {
      uri: localUri,
      name: fileName || `${mediaId}.jpg`,
      type: mimeType || 'image/jpeg',
    });

    const result = await request('/api/media/upload', {
      method: 'POST',
      body: form,
    });
    return result.data;
  },

  get refreshToken() {
    return refreshToken;
  },
};

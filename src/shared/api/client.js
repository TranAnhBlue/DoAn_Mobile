import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.eapls.io.vn/api';
export const ACCESS_TOKEN_KEY = 'token';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const USER_KEY = 'user';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

export const authSessionClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

let refreshPromise = null;
let sessionHandlers = {
  onTokensRefreshed: null,
  onSessionExpired: null,
};

const unwrapData = (body) => body?.data ?? body;

const extractTokens = (body, fallbackRefreshToken = null) => {
  const payload = unwrapData(body) || {};
  const tokenPayload = payload.tokens && typeof payload.tokens === 'object'
    ? payload.tokens
    : payload.token && typeof payload.token === 'object'
      ? payload.token
      : payload;

  return {
    accessToken: tokenPayload.accessToken
      || tokenPayload.token
      || payload.accessToken
      || (typeof payload.token === 'string' ? payload.token : null),
    refreshToken: tokenPayload.refreshToken || payload.refreshToken || fallbackRefreshToken,
  };
};

export const configureAuthSession = (handlers) => {
  sessionHandlers = { ...sessionHandlers, ...handlers };
};

export const persistTokens = async (accessToken, refreshToken) => {
  const entries = [[ACCESS_TOKEN_KEY, accessToken]];
  if (refreshToken) entries.push([REFRESH_TOKEN_KEY, refreshToken]);
  await AsyncStorage.multiSet(entries);
  if (!refreshToken) await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearStoredSession = async () => {
  await AsyncStorage.multiRemove([USER_KEY, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
};

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const refreshAccessToken = async () => {
  const currentRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  if (!currentRefreshToken) throw new Error('Missing refresh token');

  const response = await authSessionClient.post('/auth/refresh-token', {
    refreshToken: currentRefreshToken,
  });
  const tokens = extractTokens(response.data, currentRefreshToken);

  if (!tokens.accessToken) throw new Error('Refresh response does not contain an access token');

  await persistTokens(tokens.accessToken, tokens.refreshToken);
  await sessionHandlers.onTokensRefreshed?.(tokens);
  return tokens;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || '');
    const isRefreshable401 = error.response?.status === 401
      && originalRequest
      && !originalRequest._retry
      && !requestUrl.includes('/auth/login')
      && !requestUrl.includes('/auth/refresh-token');

    if (!isRefreshable401) return Promise.reject(error);

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const tokens = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      await clearStoredSession();
      await sessionHandlers.onSessionExpired?.();
      return Promise.reject(refreshError);
    }
  }
);

export default api;

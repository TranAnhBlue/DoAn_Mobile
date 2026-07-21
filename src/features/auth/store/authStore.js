import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  clearStoredSession,
  configureAuthSession,
  persistTokens,
} from '../../../shared/api/client';
import authApi, { extractAuthSession, normalizeUser, unwrapApiData } from '../api/authApi';

const persistUser = (user) => AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  
  initialize: async () => {
    set({ isLoading: true });

    try {
      const [[, storedUser], [, storedToken], [, storedRefreshToken]] = await AsyncStorage.multiGet([
        USER_KEY,
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
      ]);

      if (!storedToken) {
        await clearStoredSession();
        set({ user: null, token: null, refreshToken: null });
        return;
      }

      const cachedUser = storedUser ? JSON.parse(storedUser) : null;
      set({ user: cachedUser, token: storedToken, refreshToken: storedRefreshToken });

      try {
        await get().refreshCurrentUser();
      } catch (error) {
        if (error.response || !cachedUser) {
          await get().clearSession();
        }
      }
    } catch {
      await get().clearSession();
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (identifier, password) => {
    const response = await authApi.login(identifier, password);
    const session = extractAuthSession(response.data);

    if (!session.accessToken) {
      throw new Error('Phản hồi đăng nhập không có access token.');
    }
    if (!session.refreshToken) {
      throw new Error('Phản hồi đăng nhập không có refresh token.');
    }

    try {
      await persistTokens(session.accessToken, session.refreshToken);

      let user = normalizeUser(session.user);
      if (!user.id && !user.email && !user.fullname) {
        const meResponse = await authApi.getCurrentUser();
        user = normalizeUser(unwrapApiData(meResponse.data));
      }

      await persistUser(user);
      set({
        user,
        token: session.accessToken,
        refreshToken: session.refreshToken,
      });

      return user;
    } catch (error) {
      await get().clearSession();
      throw error;
    }
  },

  setUser: async (user) => {
    await persistUser(user);
    set({ user });
  },

  refreshCurrentUser: async () => {
    const response = await authApi.getCurrentUser();
    const user = normalizeUser(unwrapApiData(response.data));
    await persistUser(user);
    set({ user });
    return user;
  },

  clearSession: async () => {
    await clearStoredSession();
    set({ user: null, token: null, refreshToken: null });
  },

  logout: async () => {
    const currentRefreshToken = get().refreshToken
      || await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

    try {
      if (currentRefreshToken) {
        await authApi.logout(currentRefreshToken);
      }
    } catch {
      // Logout vẫn phải hoàn tất trên thiết bị nếu máy chủ tạm thời không phản hồi.
    } finally {
      await get().clearSession();
    }
  },
}));

configureAuthSession({
  onTokensRefreshed: async ({ accessToken, refreshToken }) => {
    useAuthStore.setState({ token: accessToken, refreshToken });
  },
  onSessionExpired: async () => {
    useAuthStore.setState({ user: null, token: null, refreshToken: null });
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

// Get API URL from app config (loaded from .env via app.config.js)
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.eapls.io.vn/api';

console.log('🌐 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds timeout for slow backend
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Logic handle unauthorized / token expired
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
      // Dispatch logout or navigate to login...
    }
    return Promise.reject(error);
  }
);

export default api;

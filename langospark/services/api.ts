import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Constants from 'expo-constants';

// Get the API URL from environment variables or fallback to development
const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  (__DEV__ ? 'http://localhost:3000/api' : 'https://api.langospark.com/api');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken
          });
          
          const { token, refreshToken: newRefreshToken } = response.data;
          await AsyncStorage.multiSet([
            ['token', token],
            ['refreshToken', newRefreshToken]
          ]);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        router.replace('/auth/login');
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      await AsyncStorage.multiRemove(['token', 'refreshToken']);
      router.replace('/auth/login');
    }

    return Promise.reject(error);
  }
); 
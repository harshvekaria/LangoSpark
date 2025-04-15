import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get the API URL from environment variables or fallback to development
const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  (__DEV__ ? 'http://localhost:3000/api' : 'https://api.langospark.com/api');

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  timeout: 60000, // 60 seconds timeout for large audio files
});

// Helper function to get token based on platform
export const getToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('token');
  } else {
    return await AsyncStorage.getItem('token');
  }
};

// Helper function to set token based on platform
export const setToken = async (token: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem('token', token);
  } else {
    await AsyncStorage.setItem('token', token);
  }
};

// Helper function to remove token based on platform
export const removeToken = async () => {
  if (Platform.OS === 'web') {
    localStorage.removeItem('token');
  } else {
    await AsyncStorage.removeItem('token');
  }
};

// Add a request interceptor to handle authentication
api.interceptors.request.use(
  async (config) => {
    try {
      // Get the token using the helper function
      const token = await getToken();
      
      // If token exists, add it to the headers
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      console.error('Error getting token:', error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      await removeToken();
      // Redirect to login page
      router.replace('/auth/login');
    }
    return Promise.reject(error);
  }
); 
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { api } from '../services/api';
import { Alert } from 'react-native';

interface User {
  id: string;
  email: string;
  name: string;
  nativeLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          await AsyncStorage.multiRemove(['token', 'refreshToken']);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Token check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, refreshToken, user } = response.data.data;

      await AsyncStorage.setItem("token", token);

      if (refreshToken) {
        await AsyncStorage.setItem("refreshToken", refreshToken);
      } else {
        await AsyncStorage.removeItem("refreshToken");
      }

      setUser(user);
      if (isInitialized) {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      console.error("Sign in failed:", error);
      Alert.alert(
        "Login Failed",
        error.response?.data?.message || "An error occurred during login"
      );
      throw error;
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const response = await api.post('/auth/register', { fullName: name, email, password });
      const { token, refreshToken, user } = response.data.data;
      
      await AsyncStorage.multiSet([
        ['token', token],
        ['refreshToken', refreshToken]
      ]);
      
      setUser(user);
      if (isInitialized) {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      Alert.alert(
        'Registration Failed',
        error.response?.data?.message || 'An error occurred during registration'
      );
      throw error;
    }
  }

  async function signOut() {
    try {
      await api.post('/auth/logout');
      await AsyncStorage.multiRemove(['token', 'refreshToken']);
      setUser(null);
      if (isInitialized) {
        router.replace('/auth/login');
      }
    } catch (error: any) {
      console.error('Sign out failed:', error);
      Alert.alert(
        'Logout Failed',
        error.response?.data?.message || 'An error occurred during logout'
      );
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isInitialized,
        signIn,
        signOut,
        register
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
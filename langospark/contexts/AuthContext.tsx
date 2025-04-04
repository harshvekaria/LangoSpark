import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
          setUser(response.data);
        } catch (error) {
          console.error('Auth check failed:', error);
          // If token is invalid, clear it
          await AsyncStorage.removeItem('token');
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
      const response = await api.post('/auth/login', { email, password });
      const { token, refreshToken, user } = response.data;
      
      // Store both tokens
      await AsyncStorage.multiSet([
        ['token', token],
        ['refreshToken', refreshToken]
      ]);
      
      setUser(user);
      if (isInitialized) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await AsyncStorage.multiRemove(['token', 'refreshToken']);
      setUser(null);
      if (isInitialized) {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
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
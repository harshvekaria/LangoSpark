import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  nativeLanguage?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setAuthState(prev => ({ ...prev, token }));
      fetchUser(token);
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const fetchUser = async (token: string) => {
    try {
      const response = await api.get('/auth/me');
      setAuthState({
        user: response.data,
        token,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setAuthState({
        user: null,
        token: null,
        loading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setAuthState({
        user,
        token,
        loading: false,
      });
      return true;
    } catch (error) {
      console.error('Error logging in:', error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setAuthState({
        user,
        token,
        loading: false,
      });
      return true;
    } catch (error) {
      console.error('Error registering:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      setAuthState({
        user: null,
        token: null,
        loading: false,
      });
      return true;
    } catch (error) {
      console.error('Error logging out:', error);
      return false;
    }
  };

  return {
    user: authState.user,
    token: authState.token,
    loading: authState.loading,
    login,
    register,
    logout,
  };
} 
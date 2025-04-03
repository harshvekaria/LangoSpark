import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../../../services/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';

interface Language {
  id: string;
  name: string;
  code: string;
  level?: string;
  progress?: number;
}

interface ApiResponse {
  success: boolean;
  data: Language[];
}

export default function LanguagesScreen() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLanguages();
  }, []);

  async function fetchLanguages() {
    try {
      const response = await api.get<ApiResponse>('/languages/list');
      if (response.data.success) {
        setLanguages(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLanguageSelect = async (language: Language) => {
    try {
      // Check if we have a valid token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        router.replace('/auth/login');
        return;
      }

      const response = await api.post('/ai-lessons/generate-lesson', {
        languageId: language.id,
        level: 'BEGINNER',
        topic: 'Basic Greetings'
      });
      
      if (response.data.success) {
        // Navigate to the lesson screen with the generated lesson data
        router.push({
          pathname: '/languages/[id]',
          params: { id: language.id }
        });
      }
    } catch (error) {
      console.error('Error generating lesson:', error);
      // If we get a 403, redirect to login
      if ((error as AxiosError)?.response?.status === 403) {
        router.replace('/auth/login');
      }
    }
  };

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={styles.languageCard}
      onPress={() => handleLanguageSelect(item)}
    >
      <View style={styles.languageHeader}>
        <Text style={styles.languageName}>{item.name}</Text>
        <Text style={styles.languageCode}>{item.code.toUpperCase()}</Text>
      </View>
      <View style={styles.progressContainer}>
        <View style={styles.levelContainer}>
          <Text style={[styles.levelText, { color: '#4CAF50' }]}>
            BEGINNER
          </Text>
        </View>
        <Text style={styles.progressText}>Start Learning</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2f95dc" />
      </View>
    );
  }

  if (languages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="language" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No languages available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={languages}
        renderItem={renderLanguageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  languageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  languageCode: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  progressContainer: {
    gap: 8,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
}); 
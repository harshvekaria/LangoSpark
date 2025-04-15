import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { languageService, lessonService } from '../../../services/endpointService';
import { api } from '../../../services/api';

interface Language {
  id: string;
  name: string;
  code: string;
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  progress?: number;
}

export default function LanguagesScreen() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [userLanguages, setUserLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/languages/list');
      if (response.data.success) {
        setLanguages(response.data.data);
      } else {
        Alert.alert('Error', 'Failed to fetch languages');
      }
    } catch (error) {
      console.error('Error fetching languages:', error);
      Alert.alert('Error', 'Failed to load languages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguagePress = (language: Language) => {
    router.push({
      pathname: '/languages/[id]',
      params: { id: language.id }
    });
  };

  const handleLanguageSelect = async (language: Language) => {
    try {
      // Navigate to the language detail screen
      router.push({
        pathname: '/languages/[id]',
        params: { id: language.id }
      });

      // Then try to generate a lesson in the background
      try {
        await lessonService.generateLesson({
          languageId: language.id,
          level: language.level || 'BEGINNER',
          topic: 'Basic Greetings'
        });
      } catch (error) {
        console.error('Error generating lesson:', error);
        // Don't show error to user since this is background operation
      }
    } catch (error) {
      console.error('Error selecting language:', error);
    }
  };

  const renderLanguageItem = ({ item }: { item: Language }) => {
    const isUserLanguage = userLanguages.some(lang => lang.id === item.id);
    
    return (
      <TouchableOpacity
        style={[styles.languageCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => handleLanguageSelect(item)}
      >
        <View style={styles.languageHeader}>
          <Text style={[styles.languageName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.languageCode, { color: colors.secondaryText, backgroundColor: colors.navBackground }]}>
            {item.code.toUpperCase()}
          </Text>
        </View>
        <View style={styles.progressContainer}>
          {isUserLanguage ? (
            <>
              <View style={styles.levelContainer}>
                <Text style={[styles.levelText, { color: colors.tint }]}>
                  {item.level || 'BEGINNER'}
                </Text>
              </View>
              <Text style={[styles.progressText, { color: colors.secondaryText }]}>
                {item.progress ? `${item.progress}% complete` : 'Continue learning'}
              </Text>
            </>
          ) : (
            <Text style={[styles.progressText, { color: colors.tint }]}>Start Learning</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (languages.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <FontAwesome name="language" size={64} color={colors.secondaryText} />
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No languages available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Practice</Text>
      </View>
      
      {userLanguages.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Languages</Text>
          <FlatList
            data={userLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => `user-${item.id}`}
            contentContainerStyle={styles.listContainer}
            horizontal={false}
            scrollEnabled={false}
          />
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Languages</Text>
        <FlatList
          data={languages}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginBottom: 10,
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
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  languageCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
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
  },
  languageCode: {
    fontSize: 14,
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
  },
}); 
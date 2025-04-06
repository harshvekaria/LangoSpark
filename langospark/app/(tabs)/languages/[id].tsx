import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../../services/api';
import { useRouter } from 'expo-router';

interface Lesson {
  id: string;
  title: string;
  description: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  progress?: {
    completed: boolean;
    score: number;
  };
}

interface Language {
  id: string;
  name: string;
  code: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

export default function LanguageDetailScreen() {
  const { id } = useLocalSearchParams();
  const [language, setLanguage] = useState<Language | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLanguageDetails();
  }, [id]);

  const fetchLanguageDetails = async () => {
    try {
      setLoading(true);
      // First get all languages to find the selected one
      const languagesResponse = await api.get('/languages/list');
      if (languagesResponse.data.success) {
        const selectedLanguage = languagesResponse.data.data.find(
          (lang: Language) => lang.id === id
        );
        if (selectedLanguage) {
          setLanguage(selectedLanguage);
        } else {
          console.error('Language not found');
          Alert.alert('Error', 'Language not found');
        }
      }

      // Then get the progress
      try {
        const progressResponse = await api.get(`/progress/language/${id}`);
        if (progressResponse.data.success) {
          // Transform the progress data into the expected format
          const transformedLessons = progressResponse.data.data.map((item: any) => ({
            id: item.lesson.id,
            title: item.lesson.title,
            description: item.lesson.description,
            level: item.lesson.level,
            progress: item.progress
          }));
          setLessons(transformedLessons);
        }
      } catch (error) {
        console.error('Error fetching progress:', error);
        // Don't show error for progress since it's optional
      }
    } catch (error) {
      console.error('Error fetching language details:', error);
      Alert.alert(
        'Error',
        'Failed to load language details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const generateNewLesson = async () => {
    try {
      setLoading(true);
      console.log('Generating new lesson with params:', {
        languageId: id,
        level: language?.level || 'BEGINNER',
        topic: 'Basic Greetings'
      });

      const response = await api.post('/ai-lessons/generate-lesson', {
        languageId: id,
        level: language?.level || 'BEGINNER',
        topic: 'Basic Greetings'
      }, {
        timeout: 60000 // Increase timeout to 60 seconds
      });
      
      console.log('Lesson generation response:', response.data);

      if (response.data.success) {
        // Add the new lesson to the lessons list
        const newLesson = {
          id: response.data.lesson.id,
          title: response.data.lesson.title,
          description: response.data.lesson.description,
          level: response.data.lesson.level,
          progress: {
            completed: false,
            score: 0
          }
        };
        setLessons(prevLessons => [...prevLessons, newLesson]);
        
        Alert.alert(
          'Success',
          'New lesson generated successfully!',
          [
            {
              text: 'View Lesson',
              onPress: () => {
                router.push({
                  pathname: '/languages/[id]/lesson/[lessonId]',
                  params: { id: id as string, lessonId: response.data.lesson.id }
                });
              }
            },
            {
              text: 'Stay Here',
              style: 'cancel'
            }
          ]
        );
      } else {
        console.error('Lesson generation failed:', response.data);
        Alert.alert('Error', response.data.message || 'Failed to generate lesson');
      }
    } catch (error: any) {
      console.error('Error generating lesson:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.code === 'ECONNABORTED') {
        Alert.alert(
          'Timeout',
          'The lesson generation is taking longer than expected. Please check if the server is running and try again.'
        );
      } else if (error.response?.status === 401) {
        Alert.alert(
          'Authentication Error',
          'Please log in again to continue.'
        );
      } else {
        Alert.alert(
          'Error',
          error.response?.data?.message || 'Failed to generate lesson. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      const response = await api.post('/ai-lessons/conversation-prompt', {
        languageId: id,
        level: language?.level || 'BEGINNER'
      });
      
      // Navigate to conversation screen with the generated prompt
      // router.push(`/languages/${id}/conversation`);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!language) {
    return (
      <View style={styles.container}>
        <Text>Language not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.languageName}>{language.name}</Text>
        <Text style={[
          styles.level,
          language.level ? styles[language.level.toLowerCase() as keyof typeof styles] : styles.beginner
        ]}>
          {language.level || 'BEGINNER'}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={generateNewLesson}>
          <Text style={styles.actionButtonText}>Generate New Lesson</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={startConversation}>
          <Text style={styles.actionButtonText}>Practice Conversation</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.lessonsContainer}>
        <Text style={styles.sectionTitle}>Your Lessons</Text>
        {lessons.map((lesson) => (
          <TouchableOpacity
            key={lesson.id}
            style={styles.lessonCard}
            onPress={() => {
              router.push({
                pathname: '/languages/[id]/lesson/[lessonId]',
                params: { id: id as string, lessonId: lesson.id }
              });
            }}
          >
            <View style={styles.lessonHeader}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              {lesson.progress?.completed && (
                <Text style={styles.completedBadge}>Completed</Text>
              )}
            </View>
            <Text style={styles.lessonDescription}>{lesson.description}</Text>
            {lesson.progress && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Score: {lesson.progress.score}%
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  languageName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  level: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  beginner: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  intermediate: {
    backgroundColor: '#fff3e0',
    color: '#f57c00',
  },
  advanced: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  lessonsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  lessonCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  lessonDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
}); 
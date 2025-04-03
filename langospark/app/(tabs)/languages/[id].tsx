import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../../services/api';

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

  useEffect(() => {
    fetchLanguageDetails();
  }, [id]);

  const fetchLanguageDetails = async () => {
    try {
      const [languageResponse, progressResponse] = await Promise.all([
        api.get(`/languages/${id}`),
        api.get(`/progress/language/${id}`)
      ]);

      setLanguage(languageResponse.data);
      setLessons(progressResponse.data.data);
    } catch (error) {
      console.error('Error fetching language details:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewLesson = async () => {
    try {
      const response = await api.post('/ai-lessons/generate-lesson', {
        languageId: id,
        level: language?.level || 'BEGINNER'
      });
      
      // Refresh lessons after generating a new one
      fetchLanguageDetails();
    } catch (error) {
      console.error('Error generating lesson:', error);
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
        <Text style={[styles.level, styles[language.level.toLowerCase()]]}>
          {language.level}
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
            onPress={() => {/* Navigate to lesson detail */}}
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
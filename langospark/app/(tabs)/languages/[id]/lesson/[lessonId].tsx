import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../../../../services/api';
import { Colors } from '../../../../../constants/Colors';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SpotifyButton } from '../../../../../components/ui/SpotifyButton';

interface LessonContent {
  vocabulary: Array<{
    word: string;
    translation: string;
    example: string;
  }>;
  grammar: string;
  examples: string[];
  exercises: string[];
  culturalNotes: string;
}

interface Quiz {
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }>;
}

export default function LessonDetailScreen() {
  const { id, lessonId } = useLocalSearchParams();
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<string>('');
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    fetchLessonContent();
  }, [lessonId]);

  const fetchLessonContent = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/ai-lessons/lesson/${lessonId}`);
      if (response.data.success) {
        setLessonContent(response.data.lesson.content);
        setQuiz(response.data.lesson.quiz);
        setTitle(response.data.lesson.title);
        setLevel(response.data.lesson.level);
        setLoading(false);
      } else {
        console.error('Error fetching lesson content:', response.data.message);
        Alert.alert('Error', response.data.message || 'Failed to load lesson content');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching lesson content:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load lesson content. Please try again.');
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    try {
      setLoading(true);
      const response = await api.post('/ai-lessons/generate-quiz', {
        lessonId: lessonId,
        numberOfQuestions: 5
      });
      
      if (response.data.success) {
        setQuiz(response.data.quiz);
        // Navigate to quiz page
        router.push(`/languages/${id}/lesson/${lessonId}/quiz`);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to generate quiz');
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToQuiz = () => {
    if (quiz) {
      router.push(`/languages/${id}/lesson/${lessonId}/quiz`);
    } else {
      generateQuiz();
    }
  };

  const getLevelColor = (lessonLevel?: string) => {
    if (!lessonLevel) return colors.tint;
    
    switch (lessonLevel) {
      case 'BEGINNER':
        return '#4CAF50';
      case 'INTERMEDIATE':
        return '#FF9800';
      case 'ADVANCED':
        return '#F44336';
      default:
        return colors.tint;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!lessonContent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Lesson not found</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.tint }]} onPress={fetchLessonContent}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[getLevelColor(level), colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={[styles.lessonTitle, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
            {title}
          </Text>
          <View style={[
            styles.levelBadge,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }
          ]}>
            <Text style={[
              styles.levelText,
              { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
            ]}>
              {level}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="book" size={20} color={colors.tint} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Vocabulary</Text>
            </View>
            {lessonContent.vocabulary.map((item, index) => (
              <View key={index} style={[styles.vocabularyItem, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                <Text style={[styles.word, { color: colors.text }]}>{item.word}</Text>
                <Text style={[styles.translation, { color: colors.secondaryText }]}>{item.translation}</Text>
                <Text style={[styles.example, { color: colors.secondaryText }]}>{item.example}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="chalkboard-teacher" size={20} color={colors.tint} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Grammar</Text>
            </View>
            <Text style={[styles.grammarText, { color: colors.text }]}>{lessonContent.grammar}</Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="comment-dots" size={20} color={colors.tint} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Examples</Text>
            </View>
            {lessonContent.examples.map((example, index) => (
              <Text key={index} style={[styles.exampleText, { color: colors.text }]}>{example}</Text>
            ))}
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <FontAwesome5 name="tasks" size={20} color={colors.tint} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Exercises</Text>
            </View>
            {lessonContent.exercises.map((exercise, index) => (
              <Text key={index} style={[styles.exerciseText, { color: colors.text }]}>{exercise}</Text>
            ))}
          </View>

          {lessonContent.culturalNotes && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.sectionHeader}>
                <FontAwesome5 name="globe-americas" size={20} color={colors.tint} style={styles.sectionIcon} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Cultural Notes</Text>
              </View>
              <Text style={[styles.culturalNotes, { color: colors.text }]}>{lessonContent.culturalNotes}</Text>
            </View>
          )}

          <SpotifyButton
            title={quiz ? "Take Quiz" : "Generate Quiz"}
            variant="primary"
            size="large"
            style={styles.quizButton}
            onPress={navigateToQuiz}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 30,
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  vocabularyItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  word: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  translation: {
    fontSize: 16,
    marginBottom: 4,
  },
  example: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  grammarText: {
    fontSize: 16,
    lineHeight: 24,
  },
  exampleText: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  exerciseText: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  culturalNotes: {
    fontSize: 16,
    lineHeight: 24,
  },
  quizButton: {
    marginVertical: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 
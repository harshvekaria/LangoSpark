import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../../../../../services/api';

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
  }>;
}

export default function LessonDetailScreen() {
  const { id, lessonId } = useLocalSearchParams();
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    fetchLessonContent();
  }, [lessonId]);

  const fetchLessonContent = async () => {
    try {
      const response = await api.get(`/lessons/${lessonId}`);
      setLessonContent(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lesson content:', error);
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    try {
      const response = await api.post('/ai-lessons/generate-quiz', {
        languageId: id,
        lessonId: lessonId
      });
      setQuiz(response.data);
      setShowQuiz(true);
    } catch (error) {
      console.error('Error generating quiz:', error);
    }
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const submitQuiz = async () => {
    if (!quiz) return;

    const score = quiz.questions.reduce((acc, question, index) => {
      return acc + (quizAnswers[index] === question.correctAnswer ? 1 : 0);
    }, 0);

    const percentage = (score / quiz.questions.length) * 100;

    try {
      await api.post('/progress/lesson', {
        lessonId,
        score: Math.round(percentage),
        completed: true
      });
      setQuizSubmitted(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!lessonContent) {
    return (
      <View style={styles.container}>
        <Text>Lesson not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vocabulary</Text>
        {lessonContent.vocabulary.map((item, index) => (
          <View key={index} style={styles.vocabularyItem}>
            <Text style={styles.word}>{item.word}</Text>
            <Text style={styles.translation}>{item.translation}</Text>
            <Text style={styles.example}>{item.example}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grammar</Text>
        <Text style={styles.grammarText}>{lessonContent.grammar}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Examples</Text>
        {lessonContent.examples.map((example, index) => (
          <Text key={index} style={styles.exampleText}>{example}</Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exercises</Text>
        {lessonContent.exercises.map((exercise, index) => (
          <Text key={index} style={styles.exerciseText}>{exercise}</Text>
        ))}
      </View>

      {lessonContent.culturalNotes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cultural Notes</Text>
          <Text style={styles.culturalNotes}>{lessonContent.culturalNotes}</Text>
        </View>
      )}

      {!showQuiz && !quizSubmitted && (
        <TouchableOpacity style={styles.quizButton} onPress={generateQuiz}>
          <Text style={styles.quizButtonText}>Take Quiz</Text>
        </TouchableOpacity>
      )}

      {showQuiz && quiz && !quizSubmitted && (
        <View style={styles.quizSection}>
          <Text style={styles.sectionTitle}>Quiz</Text>
          {quiz.questions.map((question, qIndex) => (
            <View key={qIndex} style={styles.questionContainer}>
              <Text style={styles.questionText}>{question.question}</Text>
              {question.options.map((option, oIndex) => (
                <TouchableOpacity
                  key={oIndex}
                  style={[
                    styles.optionButton,
                    quizAnswers[qIndex] === oIndex && styles.selectedOption
                  ]}
                  onPress={() => handleAnswerSelect(qIndex, oIndex)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={submitQuiz}
            disabled={quizAnswers.length !== quiz.questions.length}
          >
            <Text style={styles.submitButtonText}>Submit Quiz</Text>
          </TouchableOpacity>
        </View>
      )}

      {quizSubmitted && (
        <View style={styles.completedSection}>
          <Text style={styles.completedText}>Quiz Completed!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  vocabularyItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  word: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  translation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  example: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  grammarText: {
    fontSize: 16,
    lineHeight: 24,
  },
  exampleText: {
    fontSize: 16,
    marginBottom: 8,
  },
  exerciseText: {
    fontSize: 16,
    marginBottom: 8,
  },
  culturalNotes: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  quizButton: {
    backgroundColor: '#2196f3',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  quizButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quizSection: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  optionText: {
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completedSection: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#388e3c',
  },
}); 
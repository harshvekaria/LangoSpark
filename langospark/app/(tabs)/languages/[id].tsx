import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../../../services/api';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../constants/Colors';
import { useColorScheme } from 'react-native';
import { SpotifyButton } from '../../../components/ui/SpotifyButton';

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
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    fetchLanguageDetails();
  }, [id]);

  const fetchLanguageDetails = async () => {
    try {
      setLoading(true);
      console.log(`Fetching language details for ID: ${id}`);
      
      // Get language details
      try {
        const languageResponse = await api.get(`/languages/${id}`);
        console.log('Language response:', languageResponse.data);
        
        if (languageResponse.data && languageResponse.data.success) {
          setLanguage(languageResponse.data.data);
          console.log('Language data set successfully:', languageResponse.data.data);
        } else {
          console.error('Language API returned unsuccessful response:', languageResponse.data);
          Alert.alert('Error', 'Language not found');
          return;
        }
      } catch (langError) {
        console.error('Error fetching language details:', langError);
        // Try alternative API endpoint
        try {
          console.log('Trying alternative language endpoint...');
          const altResponse = await api.get(`/language/${id}`);
          if (altResponse.data && altResponse.data.success) {
            setLanguage(altResponse.data.data);
            console.log('Alternative language endpoint succeeded:', altResponse.data.data);
          } else {
            throw new Error('Alternative endpoint also failed');
          }
        } catch (altError) {
          console.error('Alternative language endpoint failed:', altError);
          Alert.alert('Error', 'Language not found. Please try again.');
          return;
        }
      }

      // Get lessons for this language
      await fetchLanguageProgress();
    } catch (error) {
      console.error('Error in fetchLanguageDetails:', error);
      Alert.alert(
        'Error',
        'Failed to load language details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch lesson progress data
  const fetchLanguageProgress = async () => {
    try {
      console.log(`Fetching lessons and progress for language: ${id}`);
      
      try {
        const progressResponse = await api.get(`/progress/language/${id}`);
        
        if (progressResponse.data && progressResponse.data.success) {
          console.log(`Received ${progressResponse.data.data.length} lessons with progress data`);
          
          // Map the response to our Lesson interface
          const lessonsWithProgress = progressResponse.data.data.map((item: any) => ({
            id: item.lesson.id,
            title: item.lesson.title,
            description: item.lesson.description,
            level: item.lesson.level,
            progress: item.progress
          }));
          
          setLessons(lessonsWithProgress);
          console.log('Lessons with progress set successfully');
        } else {
          console.error('Failed to fetch progress data:', progressResponse.data);
          // Try to get lessons without progress as fallback
          await fetchLessonsWithoutProgress();
        }
      } catch (progressError) {
        console.error('Error fetching language progress from primary endpoint:', progressError);
        // Try alternative endpoint for progress
        try {
          console.log('Trying alternative progress endpoint...');
          const altProgressResponse = await api.get(`/language/${id}/lessons`);
          
          if (altProgressResponse.data && altProgressResponse.data.success) {
            console.log(`Alternative endpoint returned ${altProgressResponse.data.data.length} lessons`);
            
            // Map the response to our Lesson interface with default progress
            const lessonsFromAlt = altProgressResponse.data.data.map((lesson: any) => ({
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              level: lesson.level,
              progress: {
                completed: false,
                score: 0
              }
            }));
            
            setLessons(lessonsFromAlt);
            console.log('Lessons set from alternative endpoint');
          } else {
            throw new Error('Alternative progress endpoint also failed');
          }
        } catch (altProgressError) {
          console.error('Alternative progress endpoint failed:', altProgressError);
          // Last resort: Try to get lessons without progress
          await fetchLessonsWithoutProgress();
        }
      }
    } catch (error) {
      console.error('Error in fetchLanguageProgress:', error);
    }
  };
  
  // Fallback function to get lessons without progress
  const fetchLessonsWithoutProgress = async () => {
    try {
      console.log('Attempting to fetch lessons without progress...');
      const lessonsResponse = await api.get(`/ai-lessons/lessons/${id}`);
      
      if (lessonsResponse.data && lessonsResponse.data.success && lessonsResponse.data.data) {
        console.log(`Retrieved ${lessonsResponse.data.data.length} lessons without progress data`);
        
        // Add default progress to lessons
        const lessonsWithDefaultProgress = lessonsResponse.data.data.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          level: lesson.level || 'BEGINNER',
          progress: {
            completed: false,
            score: 0
          }
        }));
        
        setLessons(lessonsWithDefaultProgress);
        console.log('Lessons with default progress set successfully');
      } else {
        console.error('Failed to fetch lessons without progress:', lessonsResponse?.data);
        setLessons([]);
      }
    } catch (error) {
      console.error('Error fetching lessons without progress:', error);
      setLessons([]);
    }
  };

  const generateNewLesson = async (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    try {
      setLoading(true);
      console.log('Generating new lesson with params:', {
        languageId: id,
        level: level,
        topic: getDefaultTopic(level)
      });

      const response = await api.post('/ai-lessons/generate-lesson', {
        languageId: id,
        level: level,
        topic: getDefaultTopic(level)
      }, {
        timeout: 60000 // Increase timeout to 60 seconds
      });
      
      console.log('Lesson generation response:', response.data);

      if (response.data.success) {
        // Add the new lesson to the lessons list with progress information
        const newLesson = {
          id: response.data.lesson.id,
          title: response.data.lesson.title,
          description: response.data.lesson.description,
          level: response.data.lesson.level,
          progress: response.data.progress || {
            completed: false,
            score: 0
          }
        };
        
        console.log('Adding new lesson with progress data:', newLesson);
        setLessons(prevLessons => [...prevLessons, newLesson]);
        
        // Refresh progress data
        fetchLanguageProgress();
        
        Alert.alert(
          'Success',
          `New ${level.toLowerCase()} lesson generated successfully!`,
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
      Alert.alert('Error', error.response?.data?.message || 'Failed to generate lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTopic = (level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'): string => {
    switch (level) {
      case 'BEGINNER':
        return 'Basic Greetings and Introductions';
      case 'INTERMEDIATE':
        return 'Daily Life and Routines';
      case 'ADVANCED':
        return 'Business and Professional Communication';
      default:
        return 'General Conversation';
    }
  };

  const startConversation = async () => {
    try {
      const response = await api.post('/ai-lessons/conversation-prompt', {
        languageId: id,
        level: language?.level || 'BEGINNER'
      });
      
      // Navigate to conversation screen with the generated prompt
      router.push({
        pathname: '/languages/[id]/conversation',
        params: { id: id as string }
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const getLevelColor = (level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') => {
    if (!level) return colors.tint;
    
    switch (level) {
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!language) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Language not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[getLevelColor(language.level), colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={[styles.languageName, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]}>
            {language.name}
          </Text>
          <View style={[
            styles.levelBadge,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)' }
          ]}>
            <Text style={[
              styles.level,
              { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }
            ]}>
              {language.level || 'BEGINNER'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Generate New Lessons</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
            Choose a difficulty level to generate a personalized lesson
          </Text>
          <View style={styles.levelButtons}>
            <TouchableOpacity 
              style={[styles.levelButton, { backgroundColor: '#4CAF50' }]} 
              onPress={() => generateNewLesson('BEGINNER')}
            >
              <FontAwesome5 name="baby" size={18} color="white" style={styles.buttonIcon} />
              <Text style={styles.levelButtonText}>Beginner</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.levelButton, { backgroundColor: '#FF9800' }]} 
              onPress={() => generateNewLesson('INTERMEDIATE')}
            >
              <FontAwesome5 name="user" size={18} color="white" style={styles.buttonIcon} />
              <Text style={styles.levelButtonText}>Intermediate</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.levelButton, { backgroundColor: '#F44336' }]} 
              onPress={() => generateNewLesson('ADVANCED')}
            >
              <FontAwesome5 name="user-graduate" size={18} color="white" style={styles.buttonIcon} />
              <Text style={styles.levelButtonText}>Advanced</Text>
            </TouchableOpacity>
          </View>
        </View>

        <SpotifyButton
          title="Practice Conversation"
          variant="primary"
          size="large"
          style={styles.conversationButton}
          onPress={startConversation}
        />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Lessons</Text>
          
          {lessons.length === 0 ? (
            <View style={styles.emptyLessons}>
              <FontAwesome5 name="book" size={32} color={colors.secondaryText} />
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                No lessons yet. Generate your first lesson above!
              </Text>
            </View>
          ) : (
            <>
              {lessons.map((lesson) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={[styles.lessonCard, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}
                  onPress={() => {
                    router.push({
                      pathname: '/languages/[id]/lesson/[lessonId]',
                      params: { id: id as string, lessonId: lesson.id }
                    });
                  }}
                >
                  <View style={styles.lessonHeader}>
                    <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
                    <View style={[
                      styles.lessonLevelBadge, 
                      { backgroundColor: getLevelColor(lesson.level) }
                    ]}>
                      <Text style={styles.lessonLevelText}>
                        {lesson.level.charAt(0)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.lessonDescription, { color: colors.secondaryText }]}>
                    {lesson.description}
                  </Text>
                  {lesson.progress && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: `${lesson.progress.score}%`, backgroundColor: colors.tint }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.progressText, { color: colors.secondaryText }]}>
                        {lesson.progress.completed 
                          ? `Completed - ${lesson.progress.score}%` 
                          : 'Not started'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 30,
    paddingBottom: 40,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageName: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  level: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    marginTop: -20,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    marginBottom: 16,
  },
  levelButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  levelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  levelButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  conversationButton: {
    marginBottom: 16,
  },
  emptyLessons: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
  },
  lessonCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    flex: 1,
  },
  lessonLevelBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  lessonLevelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  lessonDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
  },
}); 
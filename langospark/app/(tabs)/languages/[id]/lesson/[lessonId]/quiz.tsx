import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Animated,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { api } from '../../../../../../services/api';
import { Colors } from '../../../../../../constants/Colors';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SpotifyButton } from '../../../../../../components/ui/SpotifyButton';
import { progressService } from '../../../../../../services/endpointService';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export default function QuizScreen() {
  const { id, lessonId } = useLocalSearchParams();
  const [quiz, setQuiz] = useState<{ questions: Question[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Quiz');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  useEffect(() => {
    fetchQuiz();
  }, []);
  
  useEffect(() => {
    if (currentQuestionIndex >= 0) {
      animateQuestion();
    }
  }, [currentQuestionIndex]);
  
  const animateQuestion = () => {
    // Reset animations
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.95);
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const fetchQuiz = async () => {
    try {
      setLoading(true);
      
      // First try to get the quiz if it exists
      const response = await api.get(`/ai-lessons/lesson/${lessonId}`);
      
      if (response.data.success && response.data.lesson.quiz) {
        // Ensure quiz data has the expected structure
        if (response.data.lesson.quiz && Array.isArray(response.data.lesson.quiz.questions)) {
          setQuiz({
            questions: response.data.lesson.quiz.questions
          });
          setTitle(response.data.lesson.title || 'Quiz');
        } else {
          console.error('Invalid quiz format:', response.data.lesson.quiz);
          // Generate a new quiz if the format is invalid
          await generateNewQuiz();
        }
      } else {
        // Generate a new quiz if it doesn't exist
        await generateNewQuiz();
      }
    } catch (error: any) {
      console.error('Error fetching quiz:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load quiz. Please try again.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const generateNewQuiz = async () => {
    try {
      const generateResponse = await api.post('/ai-lessons/generate-quiz', {
        lessonId: lessonId,
        numberOfQuestions: 5
      });
      
      if (generateResponse.data.success && generateResponse.data.quiz && 
          generateResponse.data.quiz.questions && 
          Array.isArray(generateResponse.data.quiz.questions)) {
        setQuiz({
          questions: generateResponse.data.quiz.questions
        });
      } else {
        throw new Error('Failed to generate valid quiz');
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      Alert.alert('Error', 'Failed to generate quiz. Please try again.');
      router.back();
    }
  };
  
  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null || isAnswerCorrect !== null || !quiz || !quiz.questions) return;
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const correctAnswer = currentQuestion.correctAnswer;
    const isCorrect = answerIndex === correctAnswer;
    
    setSelectedAnswer(answerIndex);
    setIsAnswerCorrect(isCorrect);
    
    // Update quiz answers and score
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
    
    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
    }
  };
  
  const moveToNextQuestion = () => {
    if (!quiz || !quiz.questions) return;
    
    setShowExplanation(false);
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
    } else {
      submitQuiz();
    }
  };
  
  const submitQuiz = async () => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return;
    
    const percentage = (score / quiz.questions.length) * 100;
    const roundedScore = Math.round(percentage);
    const lessonIdString = Array.isArray(lessonId) ? lessonId[0] : lessonId;
    
    try {
      console.log(`Submitting quiz result for lesson ${lessonIdString}: score=${roundedScore}, completed=true`);
      
      // First try using the service
      try {
        const response = await progressService.updateLessonProgress({
          lessonId: lessonIdString,
          score: roundedScore,
          completed: true
        });
        
        console.log('Progress update response:', response);
        
        if (!response.success) {
          throw new Error('Progress update via service failed');
        }
      } catch (serviceError) {
        console.error('Error updating progress via service:', serviceError);
        
        // Fallback to direct API call
        console.log('Falling back to direct API call...');
        const directResponse = await api.post('/progress/lesson', {
          lessonId: lessonIdString,
          score: roundedScore,
          completed: true
        });
        
        console.log('Direct API response:', directResponse.data);
        
        // If this also fails, throw an error
        if (!directResponse.data.success) {
          throw new Error('Direct progress update also failed');
        }
      }
      
      setQuizCompleted(true);
      
      // Show confetti for good scores
      if (percentage >= 60) {
        setShowConfetti(true);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
      Alert.alert(
        'Progress Update Error',
        'There was an issue saving your progress. Your score may not be reflected in your profile.'
      );
      
      // Still mark as completed in the UI
      setQuizCompleted(true);
    }
  };
  
  const returnToLesson = () => {
    router.back();
  };
  
  const returnToDashboard = () => {
    // Navigate back to dashboard to see updated progress
    router.push('/');
  };
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }
  
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Quiz not available</Text>
        <SpotifyButton
          title="Return to Lesson"
          variant="primary"
          size="medium"
          onPress={returnToLesson}
        />
      </View>
    );
  }
  
  if (quizCompleted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Quiz Results' }} />
        
        <View style={styles.resultContainer}>
          <LinearGradient
            colors={[colors.tint, colorScheme === 'dark' ? colors.background : '#f5f5f5']}
            style={styles.resultGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <Text style={[styles.congratsText, { color: '#FFFFFF' }]}>
              {score === quiz.questions.length
                ? 'Perfect Score!'
                : score >= Math.ceil(quiz.questions.length * 0.7)
                ? 'Great Job!'
                : 'Quiz Completed'}
            </Text>
            
            <View style={styles.scoreCircle}>
              <Text style={styles.scorePercent}>{Math.round((score / quiz.questions.length) * 100)}%</Text>
              <Text style={styles.scoreDetail}>
                {score} of {quiz.questions.length} correct
              </Text>
            </View>
            
            <Text style={styles.resultMessage}>
              {score === quiz.questions.length
                ? 'You aced it! Amazing work!'
                : score >= Math.ceil(quiz.questions.length * 0.7)
                ? 'Well done! You\'re making great progress!'
                : 'Keep practicing! You\'ll improve next time.'}
            </Text>

            {showConfetti && (
              <View style={styles.confettiContainer}>
                {Array.from({ length: 50 }).map((_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.confettiPiece, 
                      { 
                        backgroundColor: [
                          '#f44336', '#2196f3', '#ffeb3b', 
                          '#4caf50', '#9c27b0', '#ff9800'
                        ][i % 6],
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        transform: [
                          { rotate: `${Math.random() * 360}deg` },
                          { scale: Math.random() * 0.5 + 0.5 }
                        ]
                      }
                    ]} 
                  />
                ))}
              </View>
            )}
          </LinearGradient>
          
          <View style={styles.resultButtons}>
            <SpotifyButton
              title="Review Quiz"
              variant="secondary"
              size="large"
              style={styles.resultButton}
              onPress={() => {
                setQuizCompleted(false);
                setCurrentQuestionIndex(0);
                setSelectedAnswer(null);
                setIsAnswerCorrect(null);
              }}
            />
            
            <SpotifyButton
              title="Continue Learning"
              variant="primary"
              size="large"
              style={styles.resultButton}
              onPress={returnToDashboard}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  // Get the current question with a safety check
  if (currentQuestionIndex < 0 || currentQuestionIndex >= quiz.questions.length) {
    // Reset to first question if current index is invalid
    setCurrentQuestionIndex(0);
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  
  // Additional check for the current question
  if (!currentQuestion || !Array.isArray(currentQuestion.options)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Invalid question format</Text>
        <SpotifyButton
          title="Return to Lesson"
          variant="primary"
          size="medium"
          onPress={returnToLesson}
        />
      </View>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Quiz' }} />
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${((currentQuestionIndex + (selectedAnswer !== null ? 1 : 0)) / quiz.questions.length) * 100}%`,
                backgroundColor: colors.tint 
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: colors.secondaryText }]}>
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </Text>
      </View>
      
      <ScrollView style={styles.content}>
        <Animated.View 
          style={[
            styles.questionCard,
            { 
              backgroundColor: colors.card,
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={[styles.questionText, { color: colors.text }]}>{currentQuestion.question}</Text>
          
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  { borderColor: colors.cardBorder },
                  selectedAnswer === index && 
                    (isAnswerCorrect ? styles.correctOption : styles.incorrectOption),
                  selectedAnswer !== null && 
                    index === currentQuestion.correctAnswer && 
                    styles.correctOption
                ]}
                onPress={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.optionIndicator,
                    selectedAnswer === index 
                      ? (isAnswerCorrect ? styles.correctIndicator : styles.incorrectIndicator)
                      : { backgroundColor: colors.cardBorder }
                  ]}>
                    <Text style={styles.optionIndicatorText}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  </View>
                  <Text 
                    style={[
                      styles.optionText,
                      { color: colors.text }
                    ]}
                  >
                    {option}
                  </Text>
                </View>
                
                {selectedAnswer === index && (
                  <View style={styles.feedbackIcon}>
                    {isAnswerCorrect ? (
                      <FontAwesome5 name="check-circle" size={20} color="#4CAF50" />
                    ) : (
                      <FontAwesome5 name="times-circle" size={20} color="#F44336" />
                    )}
                  </View>
                )}
                
                {selectedAnswer !== null && 
                 index === currentQuestion.correctAnswer && 
                 selectedAnswer !== index && (
                  <View style={styles.feedbackIcon}>
                    <FontAwesome5 name="check-circle" size={20} color="#4CAF50" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          {selectedAnswer !== null && currentQuestion.explanation && (
            <View style={styles.explanationContainer}>
              <TouchableOpacity 
                style={styles.explanationToggle}
                onPress={() => setShowExplanation(!showExplanation)}
              >
                <Text style={[styles.explanationToggleText, { color: colors.tint }]}>
                  {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
                </Text>
                <FontAwesome5 
                  name={showExplanation ? 'chevron-up' : 'chevron-down'} 
                  size={14} 
                  color={colors.tint} 
                />
              </TouchableOpacity>
              
              {showExplanation && (
                <View style={[styles.explanationBox, { backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                  <Text style={[styles.explanationText, { color: colors.text }]}>
                    {currentQuestion.explanation}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
      
      {selectedAnswer !== null && (
        <View style={styles.buttonContainer}>
          <SpotifyButton
            title={currentQuestionIndex < quiz.questions.length - 1 ? "Next Question" : "Complete Quiz"}
            variant="primary"
            size="large"
            onPress={moveToNextQuestion}
            style={styles.nextButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 14,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionButton: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionIndicatorText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  correctOption: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  incorrectOption: {
    borderColor: '#F44336',
    borderWidth: 2,
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
  },
  correctIndicator: {
    backgroundColor: '#4CAF50',
  },
  incorrectIndicator: {
    backgroundColor: '#F44336',
  },
  feedbackIcon: {
    marginLeft: 8,
  },
  explanationContainer: {
    marginTop: 20,
  },
  explanationToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  explanationToggleText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  explanationBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
  },
  nextButton: {
    width: '100%',
  },
  resultContainer: {
    flex: 1,
  },
  resultGradient: {
    padding: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  scorePercent: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1DB954',
  },
  scoreDetail: {
    fontSize: 14,
    color: '#333',
  },
  resultMessage: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginTop: 20,
  },
  resultButtons: {
    padding: 20,
    gap: 16,
  },
  resultButton: {
    marginVertical: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
}); 
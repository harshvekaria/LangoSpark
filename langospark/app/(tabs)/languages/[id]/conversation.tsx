import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api, getToken } from '../../../../services/api';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Colors } from '../../../../constants/Colors';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { lessonService } from '../../../../services/endpointService';

interface ConversationPrompt {
  context: string;
  vocabulary: Array<{
    word: string;
    translation: string;
  }>;
  script: Array<{
    target: string;
    translation: string;
  }>;
  culturalNotes: string;
}

interface PronunciationFeedback {
  accuracy: number;
  feedback: string;
  suggestions: string[];
  phonemes: Array<{
    sound: string;
    accuracy: number;
    feedback: string;
  }>;
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [languageName, setLanguageName] = useState('Conversation');
  const [prompt, setPrompt] = useState<ConversationPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    text: string;
    isUser: boolean;
    feedback?: PronunciationFeedback;
  }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [webRecording, setWebRecording] = useState<MediaRecorder | null>(null);
  const [nativeRecording, setNativeRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  // Use a ref to store the current recording script to avoid state sync issues
  const activeScriptRef = useRef<{ target: string; translation: string } | null>(null);

  useEffect(() => {
    generateConversationPrompt();
    fetchLanguageName();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (webRecording) {
        webRecording.stop();
      }
      if (nativeRecording) {
        nativeRecording.stopAndUnloadAsync();
      }
    };
  }, [id]);

  const fetchLanguageName = async () => {
    try {
      const response = await api.get(`/languages/${id}`);
      if (response.data && response.data.language) {
        setLanguageName(response.data.language.name);
      }
    } catch (error) {
      console.error('Error fetching language name:', error);
    }
  };

  const generateConversationPrompt = async () => {
    try {
      setLoading(true);
      const response = await api.post('/ai-lessons/conversation-prompt', {
        languageId: id,
        level: 'BEGINNER'
      });
      
      if (response.data.success) {
        const conversationData = response.data.conversation.content;
        const formattedPrompt = {
          context: conversationData.context || '',
          vocabulary: conversationData.vocabulary || [],
          script: conversationData.script?.map((item: Record<string, string>) => {
            const languageCode = Object.keys(item).find(key => key !== 'english') || 'target';
            return {
              target: item[languageCode] || '',
              translation: item.english || ''
            };
          }) || [],
          culturalNotes: conversationData.culturalNotes || ''
        };
        
        setPrompt(formattedPrompt);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to generate conversation');
      }
    } catch (error: any) {
      console.error('Error generating conversation prompt:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to generate conversation prompt'
      );
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async (scriptItem: { target: string; translation: string }) => {
    try {
      // Always require a script item
      if (!scriptItem || !scriptItem.target) {
        Alert.alert('Error', 'Please select a phrase to practice');
        return;
      }

      // Store script in ref for usage in callbacks
      activeScriptRef.current = scriptItem;
      console.log('Script selected for recording:', scriptItem.target);

      // Check if user is authenticated
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Please log in to use the pronunciation feature');
        return;
      }

      if (Platform.OS === 'web') {
        // Web platform handling
        console.log('Starting web recording...');
        try {
          // Request microphone access
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1 // Mono audio to reduce size
            } 
          });

          // Create MediaRecorder with optimal settings for voice
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 64000 // Reduced bitrate for smaller file size but still good for speech
          });

          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
            console.log('Data available:', e.data.size);
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          // Set a time limit for recording (15 seconds max)
          const recordingTimeout = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              console.log('Recording time limit reached, stopping...');
              mediaRecorder.stop();
            }
          }, 15000); // 15 second limit

          mediaRecorder.onstop = async () => {
            try {
              clearTimeout(recordingTimeout);
              console.log('Recording stopped, processing audio...');
              
              // Get current script from ref
              const currentScript = activeScriptRef.current;
              if (!currentScript) {
                console.error('No script found for this recording');
                Alert.alert('Error', 'No practice phrase selected for this recording');
                return;
              }
              
              console.log('Using script for feedback:', currentScript.target);
              
              const blob = new Blob(chunks, { type: 'audio/webm' });
              console.log('Blob size:', blob.size);
              
              // Check if file is too large
              if (blob.size > 10 * 1024 * 1024) { // 10MB
                console.error('Audio file too large');
                Alert.alert('Error', 'Recording too large. Please try a shorter phrase.');
                return;
              }

              const reader = new FileReader();
              
              // Convert blob to base64 using a Promise
              const base64Audio = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  try {
                    const base64 = reader.result as string;
                    console.log('Audio data processed, length:', base64.length);
                    resolve(base64);
                  } catch (error) {
                    reject(error);
                  }
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(blob);
              });

              setFeedbackLoading(true);
              console.log('Sending audio data to server...');
              
              try {
                const response = await lessonService.getPronunciationFeedback({
                  languageId: id as string,
                  audioData: base64Audio,
                  targetText: currentScript.target,
                  level: 'BEGINNER'
                });
                
                console.log('Server response received');
                if (response.success && response.feedback) {
                  setConversationHistory(prev => [
                    ...prev,
                    { 
                      text: currentScript.target, 
                      isUser: true,
                      feedback: response.feedback
                    }
                  ]);
                } else {
                  console.error('Invalid server response:', response);
                  Alert.alert('Error', response.error || 'Failed to analyze pronunciation');
                }
              } catch (apiError: any) {
                console.error('API error:', apiError.message);
                Alert.alert('Error', apiError.message || 'Failed to process pronunciation. Please try again.');
              }
            } catch (error: any) {
              console.error('Error processing audio:', error);
              Alert.alert('Error', error.message || 'Failed to process audio. Please try again.');
            } finally {
              setFeedbackLoading(false);
              chunks.length = 0; // Clear the chunks array
              // Stop all tracks in the stream
              stream.getTracks().forEach(track => track.stop());
            }
          };

          // Start recording with a timeslice to ensure we get data (smaller chunks)
          mediaRecorder.start(500); // Get data every 500ms for better handling
          console.log('MediaRecorder started');
          setWebRecording(mediaRecorder);
          setIsRecording(true);
        } catch (error) {
          console.error('Failed to initialize web recording:', error);
          Alert.alert('Error', 'Failed to access microphone. Please check permissions.');
        }
      } else {
        // Native platform handling for Expo
        console.log('Starting native recording...');
        try {
          await Audio.requestPermissionsAsync();
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });

          // Use lower quality recording options to reduce file size
          const recordingOptions = {
            ...Audio.RecordingOptionsPresets.LOW_QUALITY,
            android: {
              ...Audio.RecordingOptionsPresets.LOW_QUALITY.android,
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 22050,
              numberOfChannels: 1,
              bitRate: 64000,
            },
            ios: {
              ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
              extension: '.m4a',
              outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
              audioQuality: Audio.IOSAudioQuality.LOW,
              sampleRate: 22050,
              numberOfChannels: 1,
              bitRate: 64000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
          };

          const { recording } = await Audio.Recording.createAsync(recordingOptions);
          
          console.log('Native recording created with script:', activeScriptRef.current?.target);
          setNativeRecording(recording);
          setIsRecording(true);
          
          // Set a time limit for recording
          setTimeout(() => {
            if (nativeRecording) {
              console.log('Recording time limit reached, stopping...');
              stopRecording();
            }
          }, 15000); // 15 second limit
        } catch (error) {
          console.error('Failed to initialize native recording:', error);
          Alert.alert('Error', 'Failed to access microphone. Please check permissions.');
        }
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', error.message || 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        if (webRecording) {
          console.log('Stopping web recording...');
          webRecording.stop();
          setWebRecording(null);
        }
      } else {
        if (nativeRecording) {
          console.log('Stopping native recording...');
          try {
            await nativeRecording.stopAndUnloadAsync();
            const uri = nativeRecording.getURI();
            console.log('Recording URI:', uri);
            
            if (!uri) {
              throw new Error('No recording URI found');
            }
            
            // Get current script from ref
            const currentScript = activeScriptRef.current;
            if (!currentScript) {
              console.error('No script found for this recording');
              throw new Error('No practice phrase selected for this recording');
            }
            
            console.log('Using script for native feedback:', currentScript.target);

            try {
              setFeedbackLoading(true);
              console.log('Reading audio file...');
              const base64Audio = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64
              });
              console.log('Audio data length:', base64Audio.length);

              if (!base64Audio) {
                throw new Error('Failed to read audio file');
              }

              console.log('Sending audio data to server...');
              const response = await lessonService.getPronunciationFeedback({
                languageId: id as string,
                audioData: base64Audio,
                targetText: currentScript.target,
                level: 'BEGINNER'
              });
              
              console.log('Server response received');
              if (response.success && response.feedback) {
                setConversationHistory(prev => [
                  ...prev,
                  { 
                    text: currentScript.target, 
                    isUser: true,
                    feedback: response.feedback
                  }
                ]);
              } else {
                console.error('Invalid server response:', response);
                Alert.alert('Error', response.error || 'Failed to analyze pronunciation');
              }
            } catch (error: any) {
              console.error('Error processing audio:', error);
              Alert.alert('Error', error.message || 'Failed to process audio. Please try again.');
            } finally {
              setFeedbackLoading(false);
              // Clean up recording file
              try {
                await FileSystem.deleteAsync(uri);
              } catch (error) {
                console.error('Error deleting recording file:', error);
              }
            }
          } catch (error: any) {
            console.error('Error stopping recording:', error);
            Alert.alert('Error', error.message || 'Failed to stop recording. Please try again.');
          }
        }
      }
    } catch (error: any) {
      console.error('Error in stopRecording:', error);
      Alert.alert('Error', error.message || 'Failed to process recording. Please try again.');
    } finally {
      setIsRecording(false);
      setWebRecording(null);
      setNativeRecording(null);
      // DO NOT clear the activeScriptRef here
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    setConversationHistory(prev => [
      ...prev,
      { text: userInput, isUser: true }
    ]);
    setUserInput('');

    try {
      const response = await api.post('/ai-lessons/conversation-response', {
        languageId: id,
        message: userInput
      });
      
      setConversationHistory(prev => [
        ...prev,
        { text: response.data.data.response, isUser: false }
      ]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send message'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === 'dark' 
          ? [colors.tint, '#0f7433', colors.background] 
          : [colors.tint, '#0f7433', '#f5f5f5']
        }
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
          >
            <FontAwesome name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{languageName}</Text>
          <View style={styles.rightPlaceholder} />
        </View>
      </LinearGradient>
      <ScrollView 
        style={[styles.conversationContainer, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        {prompt && (
          <>
            <View style={[styles.contextContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.contextTitle, { color: colors.text }]}>Context</Text>
              <Text style={[styles.contextText, { color: colors.text }]}>{prompt.context}</Text>
            </View>

            <View style={[styles.vocabularyContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.vocabularyTitle, { color: colors.text }]}>Vocabulary</Text>
              {prompt.vocabulary.map((item, index) => (
                <View key={index} style={styles.vocabularyItem}>
                  <Text style={[styles.vocabularyWord, { color: colors.text }]}>{item.word}</Text>
                  <Text style={[styles.vocabularyTranslation, { color: colors.secondaryText }]}>{item.translation}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.scriptContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.scriptTitle, { color: colors.text }]}>Practice Phrases</Text>
              {prompt.script.map((item, index) => (
                <View key={index} style={styles.scriptItem}>
                  <View style={styles.scriptTextContainer}>
                    <Text style={[styles.scriptTarget, { color: colors.text }]}>{item.target}</Text>
                    <Text style={[styles.scriptTranslation, { color: colors.secondaryText }]}>{item.translation}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.recordButton,
                      isRecording && activeScriptRef.current?.target === item.target
                        ? [styles.recordingButton, { backgroundColor: '#F44336' }]
                        : { backgroundColor: colors.tint }
                    ]}
                    onPress={() => isRecording && activeScriptRef.current?.target === item.target 
                      ? stopRecording() 
                      : startRecording(item)}
                  >
                    <FontAwesome
                      name={isRecording && activeScriptRef.current?.target === item.target ? 'stop-circle' : 'microphone'}
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.conversationHistory}>
          {conversationHistory.map((message, index) => (
            <View key={index}>
              <View
                style={[
                  styles.messageContainer,
                  message.isUser 
                    ? [styles.userMessage, { backgroundColor: colors.tint }] 
                    : [styles.botMessage, { backgroundColor: colors.card }]
                ]}
              >
                <Text style={[
                  styles.messageText, 
                  { color: message.isUser ? '#FFFFFF' : colors.text }
                ]}>
                  {message.text}
                </Text>
              </View>
              {message.feedback && (
                <View style={[styles.feedbackContainer, { backgroundColor: colors.card, borderColor: colors.tint }]}>
                  <View style={styles.feedbackHeader}>
                    <Text style={[styles.feedbackTitle, { color: colors.tint }]}>
                      Pronunciation Feedback
                    </Text>
                    <Text style={[styles.accuracyText, { color: colors.tint }]}>
                      {Math.round(message.feedback.accuracy * 100)}% Accuracy
                    </Text>
                  </View>
                  <Text style={[styles.feedbackText, { color: colors.text }]}>
                    {message.feedback.feedback}
                  </Text>
                  {message.feedback.suggestions && message.feedback.suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <Text style={[styles.suggestionsTitle, { color: colors.text }]}>Suggestions:</Text>
                      {message.feedback.suggestions.map((suggestion, idx) => (
                        <Text key={idx} style={[styles.suggestionText, { color: colors.text }]}>
                          • {suggestion}
                        </Text>
                      ))}
                    </View>
                  )}
                  {message.feedback.phonemes && message.feedback.phonemes.length > 0 && (
                    <View style={styles.phonemesContainer}>
                      <Text style={[styles.phonemesTitle, { color: colors.text }]}>Sound Analysis:</Text>
                      {message.feedback.phonemes.map((phoneme, idx) => (
                        <View key={idx} style={styles.phonemeItem}>
                          <Text style={[styles.phonemeSound, { color: colors.text }]}>
                            {phoneme.sound}
                          </Text>
                          <View style={styles.phonemeAccuracyContainer}>
                            <View 
                              style={[
                                styles.phonemeAccuracyBar,
                                { 
                                  width: `${phoneme.accuracy * 100}%`,
                                  backgroundColor: colors.tint 
                                }
                              ]} 
                            />
                          </View>
                          <Text style={[styles.phonemeFeedback, { color: colors.secondaryText }]}>
                            {phoneme.feedback}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {feedbackLoading && (
        <View style={[styles.feedbackLoadingContainer, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.feedbackLoadingText, { color: colors.text }]}>
            Analyzing pronunciation...
          </Text>
        </View>
      )}

      <View style={[styles.inputContainer, { backgroundColor: colors.background, borderTopColor: colors.cardBorder }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.cardBorder }]}
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Type your message..."
          placeholderTextColor={colors.secondaryText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: userInput.trim() ? colors.tint : colors.cardBorder }]}
          onPress={sendMessage}
          disabled={!userInput.trim()}
        >
          <FontAwesome name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  rightPlaceholder: {
    width: 36,
    height: 36,
  },
  conversationContainer: {
    flex: 1,
    padding: 16,
    marginTop: -20, // Overlap with gradient
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  contextContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  contextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contextText: {
    fontSize: 16,
    lineHeight: 22,
  },
  vocabularyContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  vocabularyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  vocabularyItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  vocabularyWord: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  vocabularyTranslation: {
    fontSize: 14,
  },
  conversationHistory: {
    marginBottom: 16,
  },
  messageContainer: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '85%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  botMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  feedbackContainer: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  accuracyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  suggestionsContainer: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 8,
  },
  phonemesContainer: {
    marginTop: 12,
  },
  phonemesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  phonemeItem: {
    marginBottom: 8,
  },
  phonemeSound: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  phonemeAccuracyContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 4,
  },
  phonemeAccuracyBar: {
    height: '100%',
    borderRadius: 2,
  },
  phonemeFeedback: {
    fontSize: 12,
  },
  feedbackLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  feedbackLoadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
  },
  recordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  recordingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scriptContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scriptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  scriptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  scriptTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  scriptTarget: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scriptTranslation: {
    fontSize: 14,
  },
}); 
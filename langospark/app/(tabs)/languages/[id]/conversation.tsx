import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../../../../services/api';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Colors } from '../../../../constants/Colors';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const [prompt, setPrompt] = useState<ConversationPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{
    text: string;
    isUser: boolean;
  }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    generateConversationPrompt();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [id]);

  const generateConversationPrompt = async () => {
    try {
      setLoading(true);
      const response = await api.post('/ai-lessons/conversation-prompt', {
        languageId: id,
        level: 'BEGINNER'
      });
      
      if (response.data.success) {
        // Extract the content from the conversation data
        const conversationData = response.data.conversation.content;
        
        // Transform the data to match our expected format
        const formattedPrompt = {
          context: conversationData.context || '',
          vocabulary: conversationData.vocabulary || [],
          script: conversationData.script?.map((item: Record<string, string>) => {
            // Handle different language code formats
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

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setFeedbackLoading(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        try {
          console.log('Sending pronunciation feedback request with URI:', uri);
          const response = await api.post('/ai-lessons/pronunciation-feedback', {
            languageId: id,
            audioUri: uri
          });
          
          console.log('Pronunciation feedback response:', response.data);
          
          if (response.data.success && response.data.feedback) {
            // Format the feedback to display in the UI
            const feedbackData = response.data.feedback;
            const formattedFeedback = `
              ${feedbackData.feedback}
              
              Accuracy: ${Math.round(feedbackData.accuracy * 100)}%
              
              ${feedbackData.suggestions ? 'Suggestions:' : ''}
              ${feedbackData.suggestions ? feedbackData.suggestions.map((s: string) => `• ${s}`).join('\n') : ''}
            `;
            
            setFeedback(formattedFeedback.trim());
          } else {
            throw new Error(response.data.message || 'Invalid response format');
          }
        } catch (apiError: any) {
          console.error('API error during pronunciation feedback:', apiError);
          throw apiError;
        }
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to process recording'
      );
    } finally {
      setFeedbackLoading(false);
    }
  };

  const playExample = async (text: string) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: `https://api.langospark.com/tts?text=${encodeURIComponent(text)}` }
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play example');
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
      <ScrollView style={styles.conversationContainer}>
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
          </>
        )}

        <View style={styles.conversationHistory}>
          {conversationHistory.map((message, index) => (
            <View
              key={index}
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

      {feedback && !feedbackLoading && (
        <View style={[styles.feedbackContainer, { backgroundColor: colors.card, borderColor: colors.tint }]}>
          <Text style={[styles.feedbackTitle, { color: colors.tint }]}>Pronunciation Feedback</Text>
          <Text style={[styles.feedbackText, { color: colors.text }]}>{feedback}</Text>
          <TouchableOpacity 
            style={styles.closeFeedbackButton}
            onPress={() => setFeedback(null)}
          >
            <FontAwesome name="close" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
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
          style={[
            styles.recordButton, 
            isRecording ? [styles.recordingButton, { backgroundColor: '#F44336' }] : { backgroundColor: colors.tint }
          ]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <FontAwesome
            name={isRecording ? 'stop-circle' : 'microphone'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
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
  conversationContainer: {
    flex: 1,
    padding: 16,
  },
  contextContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  feedbackContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeFeedbackButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
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
    marginRight: 8,
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
}); 
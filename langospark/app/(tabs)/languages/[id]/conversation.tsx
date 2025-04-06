import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../../../../services/api';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

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
      const response = await api.post('/ai-lessons/conversation-prompt', {
        languageId: id
      });
      setPrompt(response.data.data);
      setLoading(false);
    } catch (error: any) {
      console.error('Error generating conversation prompt:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to generate conversation prompt'
      );
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
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        const response = await api.post('/ai-lessons/pronunciation-feedback', {
          languageId: id,
          audioUri: uri
        });
        setFeedback(response.data.data.feedback);
      }
    } catch (error: any) {
      console.error('Error stopping recording:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to process recording'
      );
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
    <View style={styles.container}>
      <ScrollView style={styles.conversationContainer}>
        {prompt && (
          <>
            <View style={styles.contextContainer}>
              <Text style={styles.contextTitle}>Context</Text>
              <Text style={styles.contextText}>{prompt.context}</Text>
            </View>

            <View style={styles.vocabularyContainer}>
              <Text style={styles.vocabularyTitle}>Vocabulary</Text>
              {prompt.vocabulary.map((item, index) => (
                <View key={index} style={styles.vocabularyItem}>
                  <Text style={styles.vocabularyWord}>{item.word}</Text>
                  <Text style={styles.vocabularyTranslation}>{item.translation}</Text>
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
                message.isUser ? styles.userMessage : styles.botMessage
              ]}
            >
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackTitle}>Pronunciation Feedback</Text>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Type your message..."
          multiline
        />
        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <FontAwesome
            name={isRecording ? 'stop-circle' : 'microphone'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sendButton}
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
    backgroundColor: '#fff',
  },
  conversationContainer: {
    flex: 1,
    padding: 16,
  },
  contextContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  contextTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contextText: {
    fontSize: 16,
    lineHeight: 24,
  },
  vocabularyContainer: {
    marginBottom: 20,
  },
  vocabularyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  vocabularyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  vocabularyWord: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vocabularyTranslation: {
    fontSize: 16,
    color: '#666',
  },
  conversationHistory: {
    flex: 1,
    marginBottom: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  feedbackContainer: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderTopWidth: 1,
    borderTopColor: '#ffeeba',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#856404',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  recordButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  recordingButton: {
    backgroundColor: '#dc3545',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 
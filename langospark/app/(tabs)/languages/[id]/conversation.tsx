import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { api } from '../../../../services/api';

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

  useEffect(() => {
    generateConversationPrompt();
  }, [id]);

  const generateConversationPrompt = async () => {
    try {
      const response = await api.post('/ai-lessons/conversation-prompt', {
        languageId: id
      });
      setPrompt(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error generating conversation prompt:', error);
      setLoading(false);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    // Implement speech recognition here
  };

  const stopRecording = async () => {
    setIsRecording(false);
    // Implement speech recognition stop and feedback here
    try {
      const response = await api.post('/ai-lessons/pronunciation-feedback', {
        languageId: id,
        sentence: userInput
      });
      setFeedback(response.data.feedback);
    } catch (error) {
      console.error('Error getting pronunciation feedback:', error);
    }
  };

  const sendMessage = () => {
    if (!userInput.trim()) return;

    setConversationHistory(prev => [
      ...prev,
      { text: userInput, isUser: true }
    ]);
    setUserInput('');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!prompt) {
    return (
      <View style={styles.container}>
        <Text>Failed to load conversation prompt</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Context</Text>
          <Text style={styles.contextText}>{prompt.context}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vocabulary</Text>
          {prompt.vocabulary.map((item, index) => (
            <View key={index} style={styles.vocabularyItem}>
              <Text style={styles.word}>{item.word}</Text>
              <Text style={styles.translation}>{item.translation}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conversation Script</Text>
          {prompt.script.map((line, index) => (
            <View key={index} style={styles.scriptItem}>
              <Text style={styles.targetText}>{line.target}</Text>
              <Text style={styles.translationText}>{line.translation}</Text>
            </View>
          ))}
        </View>

        {prompt.culturalNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cultural Notes</Text>
            <Text style={styles.culturalNotes}>{prompt.culturalNotes}</Text>
          </View>
        )}

        <View style={styles.conversationHistory}>
          {conversationHistory.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageContainer,
                message.isUser ? styles.userMessage : styles.aiMessage
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
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
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
    marginBottom: 12,
  },
  contextText: {
    fontSize: 16,
    lineHeight: 24,
  },
  vocabularyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  word: {
    fontSize: 16,
    fontWeight: '600',
  },
  translation: {
    fontSize: 16,
    color: '#666',
  },
  scriptItem: {
    marginBottom: 12,
  },
  targetText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  translationText: {
    fontSize: 14,
    color: '#666',
  },
  culturalNotes: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  conversationHistory: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userMessage: {
    backgroundColor: '#e3f2fd',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
  },
  feedbackContainer: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    margin: 16,
    borderRadius: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388e3c',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  recordButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    marginRight: 8,
  },
  recordingButton: {
    backgroundColor: '#f44336',
  },
  recordButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#4caf50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 
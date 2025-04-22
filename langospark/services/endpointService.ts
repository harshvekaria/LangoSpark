import { api, getToken } from './api';

// User profile
export const userService = {
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  updateProfile: async (data: { name?: string; nativeLanguage?: string }) => {
    const response = await api.put('/auth/me', data);
    return response.data;
  },
  
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const response = await api.put('/auth/me/password', data);
    return response.data;
  }
};

// Language service
export const languageService = {
  getAllLanguages: async () => {
    const response = await api.get('/language/list');
    return response.data;
  },
  
  getUserLanguages: async () => {
    const response = await api.get('/language/my-languages');
    return response.data;
  },
  
  getMyLanguages: async () => {
    const response = await api.get('/languages/my-languages');
    return response.data;
  },
  
  updateLanguageLevel: async (data: { languageId: string; level: string }) => {
    const response = await api.put('/language/level', data);
    return response.data;
  },
  
  removeUserLanguage: async (languageId: string) => {
    const response = await api.delete(`/language/${languageId}`);
    return response.data;
  }
};

// Progress service
export const progressService = {
  getDashboard: async () => {
    const response = await api.get('/progress/dashboard');
    return response.data;
  },
  
  getLanguageProgress: async (languageId: string) => {
    const response = await api.get(`/progress/language/${languageId}`);
    return response.data;
  },
  
  updateLessonProgress: async (data: { lessonId: string; completed: boolean; score?: number }) => {
    const response = await api.post('/progress/lesson', data);
    return response.data;
  },
  
  updateQuizProgress: async (data: { quizId: string; score: number; timeTaken?: number }) => {
    const response = await api.post('/progress/quiz', data);
    return response.data;
  }
};

// Leaderboard service
export const leaderboardService = {
  getGlobalLeaderboard: async () => {
    const response = await api.get('/leaderboard/global');
    return response.data;
  },
  
  getQuizLeaderboard: async (quizId: string) => {
    const response = await api.get(`/leaderboard/quiz/${quizId}`);
    return response.data;
  },
  
  getLanguageLeaderboard: async (languageId: string) => {
    const response = await api.get(`/leaderboard/language/${languageId}`);
    return response.data;
  },
  
  getUserStats: async () => {
    const response = await api.get('/leaderboard/user-stats');
    return response.data;
  },
  
  submitLeaderboardEntry: async (data: { quizId: string; score: number; timeTaken?: number }) => {
    const response = await api.post('/leaderboard/entry', data);
    return response.data;
  }
};

// AI Lessons service
export const lessonService = {
  generateLesson: async (data: { languageId: string; level: string; topic?: string }) => {
    const response = await api.post('/ai-lessons/generate-lesson', data);
    return response.data;
  },
  
  getLessonContent: async (lessonId: string) => {
    const response = await api.get(`/ai-lessons/lesson/${lessonId}`);
    return response.data;
  },
  
  generateQuiz: async (data: { lessonId: string; difficulty?: string }) => {
    const response = await api.post('/ai-lessons/generate-quiz', data);
    return response.data;
  },
  
  getConversationPrompt: async (data: { languageId: string; level: string; topic?: string }) => {
    const response = await api.post('/ai-lessons/conversation-prompt', data);
    return response.data;
  },
  
  getPronunciationFeedback: async (data: {
    languageId: string; 
    audioData: string; 
    targetText: string;
    level: string;
  }) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Validate input data
      if (!data.languageId || !data.audioData || !data.targetText || !data.level) {
        throw new Error('Missing required parameters for pronunciation feedback');
      }

      // Log data for debugging (excluding audio data for brevity)
      console.log('Sending pronunciation feedback request:', {
        languageId: data.languageId,
        targetText: data.targetText,
        level: data.level,
        audioDataLength: data.audioData.length
      });

      // Process and optimize audio data
      let processedAudioData = data.audioData;
      
      // Handle different audio data formats
      if (data.audioData.startsWith('data:audio')) {
        // Remove data URL prefix if present
        processedAudioData = data.audioData.split(',')[1];
      } else if (data.audioData.startsWith('data:application/octet-stream')) {
        // Handle base64 encoded audio
        processedAudioData = data.audioData.split(',')[1];
      }

      // Validate processed audio data
      if (!processedAudioData || processedAudioData.length < 100) {
        throw new Error('Invalid audio data format or size');
      }

      // Check if audio data is too large (more than 10MB)
      if (processedAudioData.length > 10 * 1024 * 1024) {
        console.log('Audio data too large, reducing quality');
        // Audio data is too large, we'll need to reduce the data
        throw new Error('Audio data too large. Please try recording a shorter phrase or use a lower quality setting.');
      }

      const requestData = {
        languageId: data.languageId,
        audioData: processedAudioData,
        targetText: data.targetText,
        level: data.level
      };

      const response = await api.post('/ai-lessons/pronunciation-feedback', requestData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        maxContentLength: 50 * 1024 * 1024, // 50MB max content length
        maxBodyLength: 50 * 1024 * 1024, // 50MB max body length
        timeout: 60000 // 60 second timeout
      });

      console.log('Pronunciation feedback response:', {
        success: response.data.success,
        status: response.status,
        hasData: !!response.data.feedback
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get pronunciation feedback');
      }

      // Validate response data structure
      const feedback = response.data.feedback;
      if (!feedback || typeof feedback.accuracy !== 'number' || !feedback.feedback || !Array.isArray(feedback.suggestions)) {
        throw new Error('Invalid feedback data structure received from server');
      }

      return response.data;
    } catch (error: any) {
      console.error('Pronunciation feedback error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error('Please log in to use the pronunciation feature');
      } else if (error.response?.status === 413) {
        throw new Error('Audio file too large. Please try a shorter recording (less than 10 seconds)');
      } else if (error.message.includes('timeout')) {
        throw new Error('Request timed out. Please try recording a shorter phrase.');
      } else if (error.message.includes('Audio data too large')) {
        throw new Error('Audio file too large. Please try a shorter recording (less than 10 seconds)');
      } else if (error.message.includes('Invalid audio data')) {
        throw new Error('Invalid audio format. Please try recording again');
      } else {
        throw new Error(error.message || 'Failed to analyze pronunciation. Please try again.');
      }
    }
  }
}; 
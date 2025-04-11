import { api } from './api';

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
    level: string; 
    recordingUrl: string; 
    targetText: string 
  }) => {
    const response = await api.post('/ai-lessons/pronunciation-feedback', data);
    return response.data;
  }
}; 
import { prisma, request } from './setup';
import bcrypt from 'bcryptjs';

describe('AI Lessons Routes', () => {
  let authToken: string;
  let userId: string;
  let testLanguageId: string;
  let testLessonId: string;

  // Helper function to create a test user
  async function createTestUser(email: string, password: string, name: string = 'Test User') {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    return await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: name,
      }
    });
  }

  // Helper function to login and get token
  async function loginTestUser(email: string, password: string) {
    const response = await request
      .post('/api/auth/login')
      .send({ email, password });
    
    return response.body.data;
  }

  beforeAll(async () => {
    // Create a test user
    const userData = await createTestUser('ailesson@test.com', 'password123');
    userId = userData.id;
    
    // Login to get auth token
    const loginResponse = await loginTestUser('ailesson@test.com', 'password123');
    authToken = loginResponse.token;

    // Find or create test language - handle unique constraint
    let language = await prisma.language.findFirst({
      where: {
        code: 'fr'
      }
    });

    if (!language) {
      try {
        language = await prisma.language.create({
          data: {
            name: 'French',
            code: 'fr',
          }
        });
      } catch (error) {
        // If unique constraint error, try to find by name
        language = await prisma.language.findFirst({
          where: {
            name: 'French'
          }
        });
      }
    }

    // Make sure we have a language to work with
    if (!language) {
      throw new Error('Could not find or create French language');
    }

    testLanguageId = language.id;

    // Add language to user if not already added
    const existingUserLanguage = await prisma.userLanguage.findFirst({
      where: {
        userId,
        languageId: testLanguageId
      }
    });

    if (!existingUserLanguage) {
      await prisma.userLanguage.create({
        data: {
          userId,
          languageId: testLanguageId,
          level: 'BEGINNER',
        }
      });
    }
  });

  afterAll(async () => {
    // Cleanup test data - careful with foreign key constraints
    if (testLessonId) {
      await prisma.quiz.deleteMany({ where: { lessonId: testLessonId } });
      await prisma.progress.deleteMany({ where: { lessonId: testLessonId } });
      await prisma.lesson.deleteMany({ where: { id: testLessonId } });
    }
    await prisma.userLanguage.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    // Do not delete language to avoid foreign key constraint issues
  });

  describe('POST /api/ai-lessons/generate-lesson', () => {
    it('should generate a new AI lesson', async () => {
      const lessonData = {
        languageId: testLanguageId,
        topic: 'Greetings and Introductions',
        level: 'BEGINNER',
      };

      const response = await request
        .post('/api/ai-lessons/generate-lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(lessonData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lesson');
      expect(response.body.lesson).toHaveProperty('id');
      expect(response.body.lesson).toHaveProperty('title');
      expect(response.body.lesson).toHaveProperty('content');
      
      // Save the lesson ID for future tests
      testLessonId = response.body.lesson.id;
    }, 30000); // Increase timeout for AI generation

    it('should return 401 if not authenticated', async () => {
      const lessonData = {
        languageId: testLanguageId,
        topic: 'Greetings',
        level: 'BEGINNER',
      };

      const response = await request
        .post('/api/ai-lessons/generate-lesson')
        .send(lessonData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/ai-lessons/lesson/:lessonId', () => {
    it('should retrieve a specific lesson by ID', async () => {
      // Skip test if we don't have a lesson ID from previous test
      if (!testLessonId) {
        return;
      }

      const response = await request
        .get(`/api/ai-lessons/lesson/${testLessonId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLessonId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('content');
    });

    it('should return 404 if lesson not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request
        .get(`/api/ai-lessons/lesson/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/ai-lessons/generate-quiz', () => {
    it('should generate a quiz for a lesson', async () => {
      // Skip test if we don't have a lesson ID from previous test
      if (!testLessonId) {
        return;
      }

      const quizData = {
        lessonId: testLessonId,
        numberOfQuestions: 5
      };

      const response = await request
        .post('/api/ai-lessons/generate-quiz')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quizData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quiz');
      expect(response.body.quiz).toHaveProperty('questions');
      expect(Array.isArray(response.body.quiz.questions)).toBe(true);
    }, 30000); // Increase timeout for AI generation

    it('should return 401 if not authenticated', async () => {
      const quizData = {
        lessonId: testLessonId || 'some-id',
        numberOfQuestions: 5
      };

      const response = await request
        .post('/api/ai-lessons/generate-quiz')
        .send(quizData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai-lessons/conversation-prompt', () => {
    it('should generate a conversation prompt', async () => {
      const promptData = {
        languageId: testLanguageId,
        topic: 'Ordering food at a restaurant',
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/conversation-prompt')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prompt');
      expect(typeof response.body.prompt).toBe('string');
    }, 30000); // Increase timeout for AI generation

    it('should return 401 if not authenticated', async () => {
      const promptData = {
        languageId: testLanguageId,
        topic: 'Ordering food',
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/conversation-prompt')
        .send(promptData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai-lessons/conversation-response', () => {
    it('should generate a conversation response', async () => {
      const responseData = {
        languageId: testLanguageId,
        conversationHistory: [
          { role: 'system', content: 'You are a helpful French conversation partner.' },
          { role: 'assistant', content: 'Bonjour! Comment allez-vous?' },
          { role: 'user', content: 'Je vais bien, merci!' }
        ],
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/conversation-response')
        .set('Authorization', `Bearer ${authToken}`)
        .send(responseData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(typeof response.body.response).toBe('string');
    }, 30000); // Increase timeout for AI generation

    it('should return 401 if not authenticated', async () => {
      const responseData = {
        languageId: testLanguageId,
        conversationHistory: [],
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/conversation-response')
        .send(responseData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai-lessons/pronunciation-feedback', () => {
    it('should provide pronunciation feedback', async () => {
      const feedbackData = {
        languageId: testLanguageId,
        text: 'Bonjour',
        audioUrl: 'https://example.com/audio.mp3'
      };

      const response = await request
        .post('/api/ai-lessons/pronunciation-feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(feedbackData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('feedback');
    }, 30000); // Increase timeout for AI processing

    it('should return 401 if not authenticated', async () => {
      const feedbackData = {
        languageId: testLanguageId,
        text: 'Bonjour',
        audioUrl: 'https://example.com/audio.mp3'
      };

      const response = await request
        .post('/api/ai-lessons/pronunciation-feedback')
        .send(feedbackData);

      expect(response.status).toBe(401);
    });
  });
}); 
import { prisma, request } from './setup';
import { Level } from '@prisma/client';

describe('AI Lessons Routes', () => {
  let authToken: string;
  let testUserId: string;
  let testLanguageId: string;
  let testLessonId: string;

  beforeAll(async () => {
    // Setup test user and language
    const userData = {
      email: 'ai-test@example.com',
      password: 'password123',
      name: 'AI Test User'
    };

    const userResponse = await request
      .post('/api/auth/register')
      .send(userData);

    authToken = userResponse.body.token;
    testUserId = userResponse.body.user.id;

    // Add a language to user
    const languageData = {
      name: 'Spanish',
      code: 'es',
      level: 'BEGINNER'
    };

    const langResponse = await request
      .post('/api/language/add')
      .set('Authorization', `Bearer ${authToken}`)
      .send(languageData);

    testLanguageId = langResponse.body.data.languageId;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testLessonId) {
      await prisma.lesson.deleteMany({
        where: { id: testLessonId }
      });
    }
    
    await prisma.userLanguage.deleteMany({
      where: { userId: testUserId }
    });
    
    await prisma.user.deleteMany({
      where: { id: testUserId }
    });
  });

  describe('POST /api/ai-lessons/generate-lesson', () => {
    it('should generate a lesson for authenticated user', async () => {
      const lessonRequest = {
        languageId: testLanguageId,
        topic: 'Greetings',
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/generate-lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(lessonRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
      
      // Save lesson ID for future tests
      testLessonId = response.body.data.id;
    }, 15000); // Increase timeout for AI generation

    it('should reject unauthenticated requests', async () => {
      const lessonRequest = {
        languageId: testLanguageId,
        topic: 'Greetings',
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/generate-lesson')
        .send(lessonRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/ai-lessons/lesson/:lessonId', () => {
    it('should retrieve lesson content', async () => {
      // This test depends on the previous test creating a lesson
      if (!testLessonId) {
        throw new Error('Test lesson ID not available');
      }

      const response = await request
        .get(`/api/ai-lessons/lesson/${testLessonId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title');
      expect(response.body.data).toHaveProperty('content');
    });

    it('should return 404 for non-existent lesson', async () => {
      const response = await request
        .get('/api/ai-lessons/lesson/nonexistentid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject unauthenticated requests', async () => {
      if (!testLessonId) {
        throw new Error('Test lesson ID not available');
      }

      const response = await request
        .get(`/api/ai-lessons/lesson/${testLessonId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai-lessons/generate-quiz', () => {
    it('should generate a quiz for a lesson', async () => {
      if (!testLessonId) {
        throw new Error('Test lesson ID not available');
      }

      const quizRequest = {
        lessonId: testLessonId,
        numQuestions: 5
      };

      const response = await request
        .post('/api/ai-lessons/generate-quiz')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quizRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('questions');
      expect(Array.isArray(response.body.data.questions)).toBe(true);
      expect(response.body.data.questions.length).toBeLessThanOrEqual(5);
    }, 15000); // Increase timeout for AI generation

    it('should reject unauthenticated requests', async () => {
      const quizRequest = {
        lessonId: testLessonId,
        numQuestions: 5
      };

      const response = await request
        .post('/api/ai-lessons/generate-quiz')
        .send(quizRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai-lessons/conversation-prompt', () => {
    it('should generate conversation prompt', async () => {
      const promptRequest = {
        languageId: testLanguageId,
        topic: 'Restaurant',
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/conversation-prompt')
        .set('Authorization', `Bearer ${authToken}`)
        .send(promptRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('prompt');
      expect(typeof response.body.data.prompt).toBe('string');
    }, 15000); // Increase timeout for AI generation

    it('should reject unauthenticated requests', async () => {
      const promptRequest = {
        languageId: testLanguageId,
        topic: 'Restaurant',
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/ai-lessons/conversation-prompt')
        .send(promptRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai-lessons/conversation-response', () => {
    it('should generate conversation response', async () => {
      const conversationRequest = {
        languageId: testLanguageId,
        userMessage: '¿Cómo estás?',
        conversationHistory: [
          { role: 'system', content: 'You are a helpful Spanish conversation partner.' },
          { role: 'assistant', content: '¡Hola! ¿Cómo puedo ayudarte hoy?' }
        ]
      };

      const response = await request
        .post('/api/ai-lessons/conversation-response')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversationRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('response');
      expect(typeof response.body.data.response).toBe('string');
    }, 15000); // Increase timeout for AI generation

    it('should reject unauthenticated requests', async () => {
      const conversationRequest = {
        languageId: testLanguageId,
        userMessage: '¿Cómo estás?',
        conversationHistory: []
      };

      const response = await request
        .post('/api/ai-lessons/conversation-response')
        .send(conversationRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai-lessons/pronunciation-feedback', () => {
    it('should generate pronunciation feedback', async () => {
      const feedbackRequest = {
        languageId: testLanguageId,
        recorded: 'Buenos dias', // Simulated recorded text
        expected: 'Buenos días'
      };

      const response = await request
        .post('/api/ai-lessons/pronunciation-feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(feedbackRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('feedback');
      expect(response.body.data).toHaveProperty('accuracy');
      expect(typeof response.body.data.feedback).toBe('string');
      expect(typeof response.body.data.accuracy).toBe('number');
    }, 15000); // Increase timeout for AI generation

    it('should reject unauthenticated requests', async () => {
      const feedbackRequest = {
        languageId: testLanguageId,
        recorded: 'Buenos dias',
        expected: 'Buenos días'
      };

      const response = await request
        .post('/api/ai-lessons/pronunciation-feedback')
        .send(feedbackRequest);

      expect(response.status).toBe(401);
    });
  });
}); 
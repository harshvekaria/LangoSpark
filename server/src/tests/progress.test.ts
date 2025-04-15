import { prisma, request } from './setup';

describe('Progress Routes', () => {
  let authToken: string;
  let testUserId: string;
  let testLanguageId: string;
  let testLessonId: string;

  beforeAll(async () => {
    // Setup: Register a test user, add a language, and create a lesson
    
    // Register user
    const userData = {
      email: 'progress-test@example.com',
      password: 'password123',
      fullName: 'Progress Test User'
    };

    const userResponse = await request
      .post('/api/auth/register')
      .send(userData);

    authToken = userResponse.body.data.token;
    testUserId = userResponse.body.data.user.id;

    // Add a language to user
    const languageData = {
      name: 'French',
      code: 'fr',
      level: 'BEGINNER'
    };

    const langResponse = await request
      .post('/api/language/add')
      .set('Authorization', `Bearer ${authToken}`)
      .send(languageData);

    testLanguageId = langResponse.body.data.languageId;

    // Find or create a lesson for testing progress
    const existingLessons = await prisma.lesson.findMany({
      where: { languageId: testLanguageId, level: 'BEGINNER' },
      take: 1
    });

    if (existingLessons.length > 0) {
      testLessonId = existingLessons[0].id;
    } else {
      // Create a lesson for testing progress
      const lesson = await prisma.lesson.create({
        data: {
          title: 'Test Lesson for Progress',
          description: 'A lesson for testing progress',
          languageId: testLanguageId,
          level: 'BEGINNER',
          content: JSON.stringify({
            words: ['bonjour', 'merci', 'au revoir'],
            translations: ['hello', 'thank you', 'goodbye']
          })
        }
      });

      testLessonId = lesson.id;
    }
  });

  afterAll(async () => {
    // Cleanup test data - order matters for foreign key constraints
    
    // First delete progress records
    if (testUserId) {
      await prisma.learningProgress.deleteMany({
        where: { userId: testUserId }
      });
      
      await prisma.progress.deleteMany({
        where: { userId: testUserId }
      });
    }
    
    // Delete user language associations
    if (testUserId) {
      await prisma.userLanguage.deleteMany({
        where: { userId: testUserId }
      });
    }
    
    // Delete user
    if (testUserId) {
      await prisma.user.deleteMany({
        where: { id: testUserId }
      });
    }
    
    // We don't delete lessons created for tests to avoid foreign key constraints
    // They will be reused in future tests
  });

  describe('GET /api/progress/dashboard', () => {
    it('should return progress dashboard for authenticated user', async () => {
      const response = await request
        .get('/api/progress/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('languages');
      expect(response.body.data).toHaveProperty('recentActivities');
      expect(Array.isArray(response.body.data.languages)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request.get('/api/progress/dashboard');
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/progress/language/:languageId', () => {
    it('should return language-specific progress', async () => {
      const response = await request
        .get(`/api/progress/language/${testLanguageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('language');
      expect(response.body.data).toHaveProperty('completedLessons');
      expect(response.body.data).toHaveProperty('totalLessons');
    });

    it('should return error for non-existent language ID', async () => {
      const response = await request
        .get(`/api/progress/language/nonexistentid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request
        .get(`/api/progress/language/${testLanguageId}`);
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/progress/lesson', () => {
    it('should update lesson progress', async () => {
      const progressData = {
        lessonId: testLessonId,
        status: 'COMPLETED',
        score: 85
      };

      const response = await request
        .post('/api/progress/lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('COMPLETED');
      expect(response.body.data.score).toBe(85);
    });

    it('should update existing lesson progress', async () => {
      const progressData = {
        lessonId: testLessonId,
        status: 'COMPLETED',
        score: 95 // Updated score
      };

      const response = await request
        .post('/api/progress/lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.score).toBe(95);
    });

    it('should return error for non-existent lesson ID', async () => {
      const progressData = {
        lessonId: 'nonexistentid',
        status: 'COMPLETED',
        score: 80
      };

      const response = await request
        .post('/api/progress/lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      const progressData = {
        lessonId: testLessonId,
        status: 'COMPLETED',
        score: 90
      };

      const response = await request
        .post('/api/progress/lesson')
        .send(progressData);
      
      expect(response.status).toBe(401);
    });
  });
}); 
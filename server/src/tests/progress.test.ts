import { prisma, request } from './setup';
import bcrypt from 'bcryptjs';

describe('Progress Routes', () => {
  let authToken: string;
  let userId: string;
  let testLanguageId: string;
  let testLessonId: string;

  // Helper function to create a test user
  async function createTestUser(email: string, password: string, name: string = 'Test User') {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // First check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return existingUser;
    }
    
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
    // Clean up any existing data to avoid conflicts
    await prisma.progress.deleteMany({ where: { userId: { contains: '' } } });
    await prisma.userLanguage.deleteMany({ where: { userId: { contains: '' } } });
    
    // Create a test user
    const userData = await createTestUser('progress@test.com', 'password123');
    userId = userData.id;
    
    // Login to get auth token
    const loginResponse = await loginTestUser('progress@test.com', 'password123');
    authToken = loginResponse.token;

    // Find or create a test language
    let language = await prisma.language.findFirst({
      where: {
        code: 'es'
      }
    });

    if (!language) {
      try {
        language = await prisma.language.create({
          data: {
            name: 'Spanish',
            code: 'es',
          }
        });
      } catch (error) {
        // If constraint error, try to find by name
        language = await prisma.language.findFirst({
          where: {
            name: 'Spanish'
          }
        });
      }
    }

    if (!language) {
      throw new Error("Could not find or create Spanish language");
    }

    testLanguageId = language.id;

    // Add language to user if not already added
    const existingUserLang = await prisma.userLanguage.findFirst({
      where: {
        userId,
        languageId: testLanguageId
      }
    });

    if (!existingUserLang) {
      await prisma.userLanguage.create({
        data: {
          userId,
          languageId: testLanguageId,
          level: 'BEGINNER',
        }
      });
    }

    // Create a test lesson if not exists
    let lesson = await prisma.lesson.findFirst({
      where: {
        languageId: testLanguageId,
        title: 'Test Lesson'
      }
    });

    if (!lesson) {
      lesson = await prisma.lesson.create({
        data: {
          title: 'Test Lesson',
          languageId: testLanguageId,
          content: JSON.stringify({ sections: [] }),
          level: 'BEGINNER',
        }
      });
    }
    
    testLessonId = lesson.id;
  });

  afterAll(async () => {
    // Cleanup test data - consider dependencies
    await prisma.progress.deleteMany({ where: { userId } });
    // Don't delete lessons to avoid foreign key constraint issues
    await prisma.userLanguage.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    // Don't delete languages to avoid foreign key constraints
  });

  describe('GET /api/progress/dashboard', () => {
    it('should return user progress dashboard', async () => {
      const response = await request
        .get('/api/progress/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('languages');
      expect(response.body).toHaveProperty('recentActivity');
      expect(response.body).toHaveProperty('statistics');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request.get('/api/progress/dashboard');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/progress/language/:languageId', () => {
    it('should return language progress for specific language', async () => {
      const response = await request
        .get(`/api/progress/language/${testLanguageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('language');
      expect(response.body).toHaveProperty('lessonsCompleted');
      expect(response.body).toHaveProperty('level');
      expect(response.body.language.id).toBe(testLanguageId);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request.get(`/api/progress/language/${testLanguageId}`);
      expect(response.status).toBe(401);
    });

    it('should return 404 if language not found for user', async () => {
      // Non-existent language ID
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const response = await request
        .get(`/api/progress/language/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/progress/lesson', () => {
    it('should update lesson progress for user', async () => {
      const progressData = {
        lessonId: testLessonId,
        completed: true,
        score: 85,
        timeSpent: 600, // 10 minutes in seconds
      };

      const response = await request
        .post('/api/progress/lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('progress');
      expect(response.body.progress.lessonId).toBe(testLessonId);
      expect(response.body.progress.completed).toBe(true);
      expect(response.body.progress.score).toBe(85);
    });

    it('should update existing lesson progress', async () => {
      const progressData = {
        lessonId: testLessonId,
        completed: true,
        score: 95, // Higher score than before
        timeSpent: 500,
      };

      const response = await request
        .post('/api/progress/lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('progress');
      expect(response.body.progress.score).toBe(95); // Should update to new score
    });

    it('should return 401 if not authenticated', async () => {
      const progressData = {
        lessonId: testLessonId,
        completed: true,
        score: 85,
        timeSpent: 600,
      };

      const response = await request
        .post('/api/progress/lesson')
        .send(progressData);

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid lesson data', async () => {
      const invalidData = {
        lessonId: 'non-existent-lesson-id',
        completed: true,
        score: 85,
        timeSpent: 600,
      };

      const response = await request
        .post('/api/progress/lesson')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });
}); 
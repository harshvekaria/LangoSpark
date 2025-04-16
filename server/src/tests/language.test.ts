import { prisma, request } from './setup';
import bcrypt from 'bcryptjs';

describe('Language Routes', () => {
  let authToken: string;
  let userId: string;
  let testLanguageId: string;

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
    const userData = await createTestUser('language@test.com', 'password123');
    userId = userData.id;
    
    // Login to get auth token
    const loginResponse = await loginTestUser('language@test.com', 'password123');
    authToken = loginResponse.token;

    // Create a test language
    const language = await prisma.language.create({
      data: {
        name: 'Italian',
        code: 'it',
      }
    });
    testLanguageId = language.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.userLanguage.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    // Keep the language in the database for other tests
  });

  describe('GET /api/languages/list', () => {
    it('should return list of all available languages', async () => {
      const response = await request.get('/api/languages/list');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('languages');
      expect(Array.isArray(response.body.languages)).toBe(true);
      // Should at least have the Italian language we created
      expect(response.body.languages.some((lang: any) => lang.code === 'it')).toBe(true);
    });
  });

  describe('GET /api/languages/:id', () => {
    it('should return a specific language by id', async () => {
      const response = await request.get(`/api/languages/${testLanguageId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', testLanguageId);
      expect(response.body).toHaveProperty('name', 'Italian');
      expect(response.body).toHaveProperty('code', 'it');
    });

    it('should return 404 if language not found', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`/api/languages/${nonExistentId}`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/languages/my-languages', () => {
    it('should return empty list if user has no languages', async () => {
      const response = await request
        .get('/api/languages/my-languages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('languages');
      expect(Array.isArray(response.body.languages)).toBe(true);
      expect(response.body.languages.length).toBe(0);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request.get('/api/languages/my-languages');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/languages/add', () => {
    it('should add a language to the user', async () => {
      const languageData = {
        languageId: testLanguageId,
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/languages/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(languageData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userLanguage');
      expect(response.body.userLanguage).toHaveProperty('languageId', testLanguageId);
      expect(response.body.userLanguage).toHaveProperty('level', 'BEGINNER');
    });

    it('should not allow adding the same language twice', async () => {
      const languageData = {
        languageId: testLanguageId,
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/languages/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(languageData);

      // Should return an error since language already added
      expect(response.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const languageData = {
        languageId: testLanguageId,
        level: 'BEGINNER'
      };

      const response = await request
        .post('/api/languages/add')
        .send(languageData);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/languages/level', () => {
    it('should update language level', async () => {
      const updateData = {
        languageId: testLanguageId,
        level: 'INTERMEDIATE'
      };

      const response = await request
        .put('/api/languages/level')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('userLanguage');
      expect(response.body.userLanguage).toHaveProperty('level', 'INTERMEDIATE');
    });

    it('should return 404 if language not found for user', async () => {
      const updateData = {
        languageId: '00000000-0000-0000-0000-000000000000',
        level: 'ADVANCED'
      };

      const response = await request
        .put('/api/languages/level')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const updateData = {
        languageId: testLanguageId,
        level: 'ADVANCED'
      };

      const response = await request
        .put('/api/languages/level')
        .send(updateData);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/languages/:languageId', () => {
    it('should remove language from user', async () => {
      const response = await request
        .delete(`/api/languages/${testLanguageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      // Verify it's removed
      const languagesResponse = await request
        .get('/api/languages/my-languages')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(languagesResponse.body.languages.length).toBe(0);
    });

    it('should return 404 if language not found for user', async () => {
      const response = await request
        .delete(`/api/languages/${testLanguageId}`) // Already deleted
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request.delete(`/api/languages/${testLanguageId}`);
      expect(response.status).toBe(401);
    });
  });
}); 
import { prisma, request } from './setup';
import { Level } from '@prisma/client';

describe('Language Routes', () => {
  let authToken: string;
  let testUserId: string;
  let testLanguageId: string;

  beforeAll(async () => {
    // Clear language tables
    await prisma.userLanguage.deleteMany();
    
    // Register a test user and get token
    const userData = {
      email: 'language-test@example.com',
      password: 'password123',
      name: 'Language Test User'
    };

    const response = await request
      .post('/api/auth/register')
      .send(userData);

    authToken = response.body.token;
    testUserId = response.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.userLanguage.deleteMany();
    await prisma.user.deleteMany({
      where: { email: 'language-test@example.com' }
    });
  });

  describe('GET /api/language/list', () => {
    it('should return list of all languages', async () => {
      const response = await request.get('/api/language/list');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/language/add', () => {
    it('should add a language to user\'s learning list', async () => {
      const languageData = {
        name: 'Spanish',
        code: 'es',
        level: 'BEGINNER' as Level
      };

      const response = await request
        .post('/api/language/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(languageData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.language.code).toBe(languageData.code);
      expect(response.body.data.level).toBe(languageData.level);
      
      // Save language ID for later tests
      testLanguageId = response.body.data.languageId;
    });

    it('should not allow adding the same language twice', async () => {
      const languageData = {
        name: 'Spanish',
        code: 'es',
        level: 'BEGINNER' as Level
      };

      const response = await request
        .post('/api/language/add')
        .set('Authorization', `Bearer ${authToken}`)
        .send(languageData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      const languageData = {
        name: 'French',
        code: 'fr',
        level: 'BEGINNER' as Level
      };

      const response = await request
        .post('/api/language/add')
        .send(languageData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/language/my-languages', () => {
    it('should return user\'s learning languages', async () => {
      const response = await request
        .get('/api/language/my-languages')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].language.code).toBe('es');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request.get('/api/language/my-languages');
      
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/language/level', () => {
    it('should update language proficiency level', async () => {
      const updateData = {
        languageId: testLanguageId,
        level: 'INTERMEDIATE' as Level
      };

      const response = await request
        .put('/api/language/level')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.level).toBe('INTERMEDIATE');
    });

    it('should reject unauthenticated requests', async () => {
      const updateData = {
        languageId: testLanguageId,
        level: 'ADVANCED' as Level
      };

      const response = await request
        .put('/api/language/level')
        .send(updateData);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/language/:languageId', () => {
    it('should remove language from user\'s list', async () => {
      const response = await request
        .delete(`/api/language/${testLanguageId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request
        .delete(`/api/language/${testLanguageId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/language/:id', () => {
    it('should return language by ID', async () => {
      // First get a valid language ID from the list
      const listResponse = await request.get('/api/language/list');
      const languageId = listResponse.body.data[0]?.id;
      
      if (languageId) {
        const response = await request.get(`/api/language/${languageId}`);
        
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(languageId);
      }
    });

    it('should return 404 for non-existent language ID', async () => {
      const response = await request.get('/api/language/nonexistentid');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
}); 
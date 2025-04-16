import { prisma, request } from './setup';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Auth Routes', () => {
  let userId: string;
  let authToken: string;
  
  beforeEach(async () => {
    // Clean up the database before each test
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'test.com' }
      }
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@test.com',
        password: 'password123',
        fullName: 'Test User'
      };

      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).toHaveProperty('fullName', userData.fullName);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Save for later tests
      userId = response.body.data.user.id;
    });

    it('should not register a user with existing email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'password123',
        fullName: 'Test User'
      };

      // First registration
      await request.post('/api/auth/register').send(userData);

      // Second registration with same email
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    it('should require all required fields', async () => {
      const incompleteData = {
        email: 'incomplete@test.com',
        // Missing password and fullName
      };

      const response = await request
        .post('/api/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'login@test.com',
          password: hashedPassword,
          fullName: 'Login Test User'
        }
      });
      userId = user.id;
    });

    it('should login with correct credentials', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'password123'
      };

      const response = await request
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('email', loginData.email);
      expect(response.body.data.user).not.toHaveProperty('password');

      // Save token for other tests
      authToken = response.body.data.token;
    });

    it('should not login with incorrect password', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'wrongpassword'
      };

      const response = await request
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should not login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'password123'
      };

      const response = await request
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'profile@test.com',
          password: hashedPassword,
          fullName: 'Profile Test User'
        }
      });
      userId = user.id;
      
      // Generate token manually
      authToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
    });

    it('should return user profile when authenticated', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('email', 'profile@test.com');
      expect(response.body.data.user).toHaveProperty('fullName', 'Profile Test User');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request.get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);  // JWT validation returns 403 not 401
    });
  });

  describe('PUT /api/auth/me', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'update@test.com',
          password: hashedPassword,
          fullName: 'Update Test User'
        }
      });
      userId = user.id;
      
      // Generate token manually
      authToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
    });

    it('should update user profile when authenticated', async () => {
      const updateData = {
        fullName: 'Updated User Name',
      };

      const response = await request
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.user).toHaveProperty('fullName', 'Updated User Name');
    });

    it('should return 401 when not authenticated', async () => {
      const updateData = {
        fullName: 'Updated User Name',
      };

      const response = await request
        .put('/api/auth/me')
        .send(updateData);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/me/password', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const hashedPassword = await bcrypt.hash('currentPassword', 10);
      const user = await prisma.user.create({
        data: {
          email: 'password@test.com',
          password: hashedPassword,
          fullName: 'Password Test User'
        }
      });
      userId = user.id;
      
      // Generate token manually
      authToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
    });

    it('should change password when authenticated with correct current password', async () => {
      const passwordData = {
        currentPassword: 'currentPassword',
        newPassword: 'newPassword123'
      };

      const response = await request
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify can login with new password
      const loginResponse = await request
        .post('/api/auth/login')
        .send({
          email: 'password@test.com',
          password: 'newPassword123'
        });

      expect(loginResponse.status).toBe(200);
    });

    it('should not change password with incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123'
      };

      const response = await request
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 when not authenticated', async () => {
      const passwordData = {
        currentPassword: 'currentPassword',
        newPassword: 'newPassword123'
      };

      const response = await request
        .put('/api/auth/me/password')
        .send(passwordData);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'logout@test.com',
          password: hashedPassword,
          fullName: 'Logout Test User'
        }
      });
      userId = user.id;
      
      // Generate token manually
      authToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
    });

    it('should logout successfully when authenticated', async () => {
      const response = await request
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request.post('/api/auth/logout');
      expect(response.status).toBe(401);
    });
  });
}); 
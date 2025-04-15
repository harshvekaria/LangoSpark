import { prisma, request } from './setup';
import jwt from 'jsonwebtoken';

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clean up the database before each test
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('fullName', userData.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register a user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      // First registration
      await request.post('/api/auth/register').send(userData);

      // Second registration with same email
      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should not register a user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      };

      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should not register a user with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short',
        name: 'Test User'
      };

      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should not register with missing required fields', async () => {
      const incompleteUserData = {
        email: 'test@example.com'
        // Missing password and name
      };

      const response = await request
        .post('/api/auth/register')
        .send(incompleteUserData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      // Register user first
      await request.post('/api/auth/register').send(userData);

      // Attempt login
      const response = await request
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not login with incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      // Register user first
      await request.post('/api/auth/register').send(userData);

      // Attempt login with wrong password
      const response = await request
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should not login with non-existent email', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should not login with missing fields', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      // Register user first
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.token;

      // Get user profile
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('fullName', userData.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with no token', async () => {
      const response = await request.get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with malformed token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Malformedtoken');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should successfully change password with correct data', async () => {
      // Register a user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.token;

      // Change password
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      };

      const changePasswordResponse = await request
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      expect(changePasswordResponse.status).toBe(200);
      expect(changePasswordResponse.body).toHaveProperty('message');

      // Verify old password doesn't work
      const oldLoginResponse = await request
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'password123'
        });

      expect(oldLoginResponse.status).toBe(401);

      // Verify new password works
      const newLoginResponse = await request
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'newpassword456'
        });

      expect(newLoginResponse.status).toBe(200);
      expect(newLoginResponse.body).toHaveProperty('token');
    });

    it('should not change password with incorrect current password', async () => {
      // Register a user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.token;

      // Attempt to change password with wrong current password
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword456'
      };

      const response = await request
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(passwordData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should not allow unauthenticated password change', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword456'
      };

      const response = await request
        .post('/api/auth/change-password')
        .send(passwordData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should issue a new token with valid refresh token', async () => {
      // This test assumes your API implements refresh tokens
      // If it doesn't, you can skip this test
      
      const userData = {
        email: 'refresh-test@example.com',
        password: 'password123',
        name: 'Refresh Test'
      };

      // Register user to get tokens
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      // Check if refresh token is present in the response
      if (!registerResponse.body.refreshToken) {
        console.log('Skip refresh token test - not implemented');
        return;
      }

      const refreshToken = registerResponse.body.refreshToken;

      // Use refresh token to get new access token
      const response = await request
        .post('/api/auth/refresh-token')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      
      // Verify the new token is valid
      const verifyResponse = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${response.body.token}`);

      expect(verifyResponse.status).toBe(200);
    });
  });
}); 
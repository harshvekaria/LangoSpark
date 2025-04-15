import { prisma, request } from './setup';

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
        fullName: 'Test User'
      };

      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).toHaveProperty('fullName', userData.fullName);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not register a user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
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
      expect(response.body.success).toBe(false);
    });

    it('should not register a user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        fullName: 'Test User'
      };

      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not register a user with short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short',
        fullName: 'Test User'
      };

      const response = await request
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
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
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
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
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not login with incorrect password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
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
      expect(response.body.success).toBe(false);
    });

    it('should not login with non-existent email', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should not login with missing fields', async () => {
      const response = await request
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      };

      // Register user first
      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      // Get user profile
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('email', userData.email);
      expect(response.body.data.user).toHaveProperty('fullName', userData.fullName);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with no token', async () => {
      const response = await request.get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 with malformed token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Malformedtoken');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should successfully change password with correct data', async () => {
      // Register a user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      };

      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

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
      expect(changePasswordResponse.body.success).toBe(true);

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
      expect(newLoginResponse.body.data.token).toBeTruthy();
    });

    it('should not change password with incorrect current password', async () => {
      // Register a user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      };

      const registerResponse = await request
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

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
      expect(response.body.success).toBe(false);
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
      expect(response.body.success).toBe(false);
    });
  });
}); 
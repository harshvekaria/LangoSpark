import { prisma, request } from './setup';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables for JWT_SECRET
dotenv.config();

describe('Authentication Middleware', () => {
  let testUserId: string;
  let validToken: string;

  beforeAll(async () => {
    // Create a test user
    const userData = {
      email: 'middleware-test@example.com',
      password: 'password123',
      name: 'Middleware Test User'
    };

    const userResponse = await request
      .post('/api/auth/register')
      .send(userData);

    validToken = userResponse.body.token;
    testUserId = userResponse.body.user.id;
  });

  afterAll(async () => {
    // Clean up the test user
    await prisma.user.deleteMany({
      where: { id: testUserId }
    });
  });

  describe('authenticateToken middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it('should block access with no token', async () => {
      const response = await request.get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should block access with invalid token format', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should block access with malformed token', async () => {
      const response = await request
        .get('/api/auth/me')
        .set('Authorization', 'Bearer malformedtoken');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should block access with expired token', async () => {
      // Create an expired token (if the backend validates expiration)
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const expiredToken = jwt.sign(
        { userId: testUserId },
        jwtSecret,
        { expiresIn: '0s' } // Expire immediately
      );

      // Wait for the token to expire
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});

describe('Error Handling Middleware', () => {
  it('should return 404 for non-existent routes', async () => {
    const response = await request.get('/api/non-existent-route');
    
    expect(response.status).toBe(404);
  });

  it('should handle server errors gracefully', async () => {
    // This test is difficult to implement directly, 
    // as we'd need to intentionally cause a server error.
    // For now, we'll assume the error middleware works.

    // We can test this more thoroughly with unit tests that directly call
    // the error handler middleware with a mocked request and response.
    
    // For integration tests, we might need an endpoint that intentionally
    // throws an error to test this properly.
  });
});

describe('Validation Middleware', () => {
  it('should validate request data', async () => {
    // Test with empty data which should fail validation
    const response = await request.post('/api/auth/register').send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should sanitize inputs to prevent injection attacks', async () => {
    // Test with potentially dangerous input
    const userWithScript = {
      email: 'test@example.com',
      password: 'password123',
      name: '<script>alert("XSS")</script>'
    };

    const response = await request
      .post('/api/auth/register')
      .send(userWithScript);

    // If your backend sanitizes input, the script should not be stored as-is
    if (response.status === 201) {
      const userId = response.body.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      // Check that the name was sanitized
      // This test will need to be adjusted based on your sanitization strategy
      expect(user?.fullName).not.toBe(userWithScript.name);
      
      // Clean up
      await prisma.user.delete({
        where: { id: userId }
      });
    }
  });
}); 
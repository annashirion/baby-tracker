import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from './helpers.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import User from '../models/User.js';

// Mock fetch globally
global.fetch = jest.fn();

// Store original console methods
const originalConsoleError = console.error;

describe('Auth Routes', () => {
  let app;

  beforeAll(async () => {
    await setupTestDB();
    app = createTestApp();
    // Suppress console.error during tests
    console.error = jest.fn();
  });

  afterAll(async () => {
    await teardownTestDB();
    // Restore original console.error
    console.error = originalConsoleError;
  });

  beforeEach(async () => {
    await clearDatabase();
    global.fetch.mockClear();
    // Clear console.error mock calls
    console.error.mockClear();
  });

  describe('POST /api/auth/google', () => {
    it('should return 400 if access_token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/google')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Access token is required');
    });

    it('should create a new user when valid mocked Google response is provided', async () => {
      const mockGoogleUser = {
        id: 'google123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        given_name: 'Test',
        family_name: 'User',
      };

      // Mock successful Google API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGoogleUser,
      });

      const response = await request(app)
        .post('/api/auth/google')
        .send({ access_token: 'mocked_token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.googleId).toBe('google123');

      // Verify user was created in database
      const user = await User.findOne({ googleId: 'google123' });
      expect(user).toBeTruthy();
      expect(user.email).toBe('test@example.com');
    });

    it('should update existing user when mocked Google response is provided', async () => {
      // Create existing user
      const existingUser = await User.create({
        googleId: 'google123',
        email: 'old@example.com',
        name: 'Old Name',
      });

      const mockGoogleUser = {
        id: 'google123',
        email: 'new@example.com',
        name: 'New Name',
        picture: 'https://example.com/newpic.jpg',
        given_name: 'New',
        family_name: 'Name',
      };

      // Mock successful Google API response
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGoogleUser,
      });

      const response = await request(app)
        .post('/api/auth/google')
        .send({ access_token: 'mocked_token' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('new@example.com');
      expect(response.body.user.name).toBe('New Name');

      // Verify user was updated in database
      const updatedUser = await User.findById(existingUser._id);
      expect(updatedUser.email).toBe('new@example.com');
      expect(updatedUser.name).toBe('New Name');
    });

    it('should return 401 if mocked Google API returns error', async () => {
      // Mock failed Google API response
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid token',
      });

      const response = await request(app)
        .post('/api/auth/google')
        .send({ access_token: 'invalid_mocked_token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should return 500 if mocked Google user data is invalid', async () => {
      // Mock Google API response with missing required fields
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'google123' }), // Missing email
      });

      const response = await request(app)
        .post('/api/auth/google')
        .send({ access_token: 'mocked_token' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Authentication failed');
    });
  });
});


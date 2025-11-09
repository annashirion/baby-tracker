import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from './helpers.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import User from '../models/User.js';
import BabyProfile from '../models/BabyProfile.js';
import UserBabyRole from '../models/UserBabyRole.js';

describe('Baby Profiles Routes', () => {
  let app;
  let testUser1, testUser2;

  beforeAll(async () => {
    await setupTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Create test users
    testUser1 = await User.create({
      googleId: 'user1',
      email: 'user1@example.com',
      name: 'User 1',
    });
    testUser2 = await User.create({
      googleId: 'user2',
      email: 'user2@example.com',
      name: 'User 2',
    });
  });

  describe('GET /api/baby-profiles/test', () => {
    it('should return test message', async () => {
      const response = await request(app).get('/api/baby-profiles/test');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Baby profiles router is working!');
    });
  });

  describe('GET /api/baby-profiles', () => {
    it('should return 400 if userId is missing', async () => {
      const response = await request(app).get('/api/baby-profiles');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });

    it('should return empty array if user has no profiles', async () => {
      const response = await request(app)
        .get('/api/baby-profiles')
        .query({ userId: testUser1._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profiles).toEqual([]);
    });

    it('should return all profiles for a user with their roles', async () => {
      // Create baby profiles
      const profile1 = await BabyProfile.create({
        name: 'Baby 1',
        birthDate: new Date('2023-01-01'),
        gender: 'male',
      });
      const profile2 = await BabyProfile.create({
        name: 'Baby 2',
        birthDate: new Date('2023-02-01'),
        gender: 'female',
      });

      // Create roles
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile1._id,
        role: 'admin',
      });
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile2._id,
        role: 'viewer',
      });

      const response = await request(app)
        .get('/api/baby-profiles')
        .query({ userId: testUser1._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profiles).toHaveLength(2);
      expect(response.body.profiles[0].name).toBe('Baby 1');
      expect(response.body.profiles[0].role).toBe('admin');
      expect(response.body.profiles[1].name).toBe('Baby 2');
      expect(response.body.profiles[1].role).toBe('viewer');
    });

    it('should filter out deleted baby profiles', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      // Delete the profile
      await BabyProfile.deleteOne({ _id: profile._id });

      const response = await request(app)
        .get('/api/baby-profiles')
        .query({ userId: testUser1._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.profiles).toHaveLength(0);
    });
  });

  describe('POST /api/baby-profiles', () => {
    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/baby-profiles')
        .send({ name: 'Baby 1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId and name are required');
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/baby-profiles')
        .send({ userId: testUser1._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId and name are required');
    });

    it('should create a new baby profile and assign admin role to creator', async () => {
      const response = await request(app)
        .post('/api/baby-profiles')
        .send({
          userId: testUser1._id.toString(),
          name: 'Baby 1',
          birthDate: '2023-01-01',
          gender: 'male',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profile.name).toBe('Baby 1');
      expect(response.body.profile.role).toBe('admin');
      expect(response.body.profile.joinCode).toBeTruthy();

      // Verify profile was created
      const profile = await BabyProfile.findOne({ name: 'Baby 1' });
      expect(profile).toBeTruthy();
      expect(profile.name).toBe('Baby 1');

      // Verify role was created
      const role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeTruthy();
      expect(role.role).toBe('admin');
    });

    it('should create profile with optional fields', async () => {
      const response = await request(app)
        .post('/api/baby-profiles')
        .send({
          userId: testUser1._id.toString(),
          name: 'Baby 2',
        });

      expect(response.status).toBe(200);
      expect(response.body.profile.name).toBe('Baby 2');
      expect(response.body.profile.birthDate).toBeNull();
      expect(response.body.profile.gender).toBeNull();
    });
  });

  describe('POST /api/baby-profiles/join', () => {
    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .send({ joinCode: 'ABC123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId and joinCode are required');
    });

    it('should return 400 if joinCode is missing', async () => {
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .send({ userId: testUser1._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId and joinCode are required');
    });

    it('should return 404 if join code does not exist', async () => {
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .send({
          userId: testUser1._id.toString(),
          joinCode: 'INVALID',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Baby profile not found with this join code');
    });

    it('should join a baby profile with viewer role', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      const response = await request(app)
        .post('/api/baby-profiles/join')
        .send({
          userId: testUser1._id.toString(),
          joinCode: 'ABC123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profile.name).toBe('Baby 1');
      expect(response.body.profile.role).toBe('viewer');

      // Verify role was created
      const role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeTruthy();
      expect(role.role).toBe('viewer');
    });

    it('should join with case-insensitive join code', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      const response = await request(app)
        .post('/api/baby-profiles/join')
        .send({
          userId: testUser1._id.toString(),
          joinCode: 'abc123', // lowercase
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if user already has access', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      const response = await request(app)
        .post('/api/baby-profiles/join')
        .send({
          userId: testUser1._id.toString(),
          joinCode: 'ABC123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You already have access to this baby profile');
    });
  });
});


import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp, generateAuthToken } from './helpers.js';
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
    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/baby-profiles');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return empty array if user has no profiles', async () => {
      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .get('/api/baby-profiles')
        .set('Authorization', `Bearer ${token}`);

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

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .get('/api/baby-profiles')
        .set('Authorization', `Bearer ${token}`);

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

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .get('/api/baby-profiles')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.profiles).toHaveLength(0);
    });
  });

  describe('POST /api/baby-profiles', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/baby-profiles')
        .send({ name: 'Baby 1' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 400 if name is missing', async () => {
      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('name is required');
    });

    it('should create a new baby profile and assign admin role to creator', async () => {
      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
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
      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Baby 2',
        });

      expect(response.status).toBe(200);
      expect(response.body.profile.name).toBe('Baby 2');
      expect(response.body.profile.birthDate).toBeNull();
    });
  });

  describe('POST /api/baby-profiles/join', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .send({ joinCode: 'ABC123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 400 if joinCode is missing', async () => {
      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('joinCode is required');
    });

    it('should return 404 if join code does not exist', async () => {
      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
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

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
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

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
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

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          joinCode: 'ABC123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You already have access to this baby profile');
    });
  });

  describe('PUT /api/baby-profiles/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      const response = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .send({ name: 'Updated Baby' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user does not have access to profile', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Baby',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('do not have access');
    });

    it('should return 403 if user is not admin', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Baby',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 403 if user is editor (not admin)', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'editor',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Baby',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should successfully update profile name by admin', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        birthDate: new Date('2023-01-01'),
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Baby',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profile.name).toBe('Updated Baby');
      expect(response.body.profile.role).toBe('admin');

      // Verify profile was updated in database
      const updatedProfile = await BabyProfile.findById(profile._id);
      expect(updatedProfile.name).toBe('Updated Baby');
    });

    it('should successfully update profile birthDate by admin', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        birthDate: new Date('2023-01-01'),
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          birthDate: '2023-06-15',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(new Date(response.body.profile.birthDate).toISOString()).toBe(new Date('2023-06-15').toISOString());

      // Verify profile was updated in database
      const updatedProfile = await BabyProfile.findById(profile._id);
      expect(updatedProfile.birthDate.toISOString()).toBe(new Date('2023-06-15').toISOString());
    });

    it('should successfully update both name and birthDate by admin', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        birthDate: new Date('2023-01-01'),
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Baby',
          birthDate: '2023-06-15',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.profile.name).toBe('Updated Baby');
      expect(new Date(response.body.profile.birthDate).toISOString()).toBe(new Date('2023-06-15').toISOString());

      // Verify profile was updated in database
      const updatedProfile = await BabyProfile.findById(profile._id);
      expect(updatedProfile.name).toBe('Updated Baby');
      expect(updatedProfile.birthDate.toISOString()).toBe(new Date('2023-06-15').toISOString());
    });

    it('should return 404 if profile does not exist after role check', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: fakeId,
        role: 'admin',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .put(`/api/baby-profiles/${fakeId.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Baby',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Baby profile not found');
    });
  });

  describe('DELETE /api/baby-profiles/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      const response = await request(app)
        .delete(`/api/baby-profiles/${profile._id.toString()}`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user does not have access to profile', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .delete(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('do not have access');
    });

    it('should return 403 if user is not admin', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .delete(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 403 if user is editor (not admin)', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'editor',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .delete(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should successfully delete profile and all user roles by admin', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .delete(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Baby profile deleted successfully');

      // Verify profile was deleted
      const deletedProfile = await BabyProfile.findById(profile._id);
      expect(deletedProfile).toBeNull();

      // Verify all user roles were deleted
      const roles = await UserBabyRole.find({ babyProfileId: profile._id });
      expect(roles).toHaveLength(0);
    });

    it('should return 404 if profile does not exist after role check', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: fakeId,
        role: 'admin',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .delete(`/api/baby-profiles/${fakeId.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Baby profile not found');
    });
  });

  describe('POST /api/baby-profiles/:id/leave', () => {
    it('should return 401 if not authenticated', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      const response = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user does not have access to profile', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('do not have access');
    });

    it('should return 403 if user is admin', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admins cannot leave a profile. Please delete the profile instead.');
    });

    it('should successfully leave profile for viewer', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully left baby profile');

      // Verify role was deleted
      const role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeNull();

      // Verify profile still exists
      const existingProfile = await BabyProfile.findById(profile._id);
      expect(existingProfile).toBeTruthy();
    });

    it('should successfully leave profile for editor', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'editor',
      });

      const token = generateAuthToken(testUser1._id);
      const response = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify role was deleted
      const role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeNull();
    });

    it('should allow user to join again after leaving', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      // User joins as viewer
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      // Verify user has access
      let role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeTruthy();
      expect(role.role).toBe('viewer');

      // User leaves
      const token1 = generateAuthToken(testUser1._id);
      const leaveResponse = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .set('Authorization', `Bearer ${token1}`)
        .send({});

      expect(leaveResponse.status).toBe(200);
      expect(leaveResponse.body.success).toBe(true);

      // Verify role was deleted
      role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeNull();

      // User joins again using join code
      const token2 = generateAuthToken(testUser1._id);
      const joinResponse = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          joinCode: 'ABC123',
        });

      expect(joinResponse.status).toBe(200);
      expect(joinResponse.body.success).toBe(true);
      expect(joinResponse.body.profile.name).toBe('Baby 1');
      expect(joinResponse.body.profile.role).toBe('viewer');

      // Verify role was created again
      role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeTruthy();
      expect(role.role).toBe('viewer');
    });

    it('should not affect other users when one user leaves', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      // User 1 is admin
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      // User 2 is viewer
      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      // User 2 leaves
      const token = generateAuthToken(testUser2._id);
      const response = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify User 2's role was deleted
      const user2Role = await UserBabyRole.findOne({
        userId: testUser2._id,
        babyProfileId: profile._id,
      });
      expect(user2Role).toBeNull();

      // Verify User 1's role still exists
      const user1Role = await UserBabyRole.findOne({
        userId: testUser1._id,
        babyProfileId: profile._id,
      });
      expect(user1Role).toBeTruthy();
      expect(user1Role.role).toBe('admin');
    });
  });

  describe('Blocking and Joining', () => {
    it('should prevent blocked user from joining with join code', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      // Admin creates profile
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      // User 2 joins
      const token2a = generateAuthToken(testUser2._id);
      const joinResponse1 = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${1}`)
        .send({
          joinCode: 'ABC123',
        });

      expect(joinResponse1.status).toBe(200);
      expect(joinResponse1.body.success).toBe(true);

      // Admin blocks User 2
      const token1a = generateAuthToken(testUser1._id);
      const blockResponse = await request(app)
        .put('/api/users/block')
        .set('Authorization', `Bearer ${1}`)
        .send({
          babyProfileId: profile._id.toString(),
          targetUserId: testUser2._id.toString(),
          blocked: true,
        });

      expect(blockResponse.status).toBe(200);
      expect(blockResponse.body.success).toBe(true);

      // Remove User 2 from profile but keep blocked record
      await UserBabyRole.deleteOne({
        userId: testUser2._id,
        babyProfileId: profile._id,
      });

      // Create blocked record to prevent rejoining
      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
        blocked: true,
      });

      // User 2 tries to join again
      const token2b = generateAuthToken(testUser2._id);
      const joinResponse2 = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${1}`)
        .send({
          joinCode: 'ABC123',
        });

      expect(joinResponse2.status).toBe(403);
      expect(joinResponse2.body.error).toBe('You have been blocked from accessing this baby profile');
    });

    it('should allow user to join after being unblocked', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      // Admin creates profile
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      // Block User 2 before they join
      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
        blocked: true,
      });

      // User 2 tries to join (should fail)
      const token2c = generateAuthToken(testUser2._id);
      const joinResponse1 = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${1}`)
        .send({
          joinCode: 'ABC123',
        });

      expect(joinResponse1.status).toBe(403);
      expect(joinResponse1.body.error).toBe('You have been blocked from accessing this baby profile');

      // Admin unblocks User 2
      const token1b = generateAuthToken(testUser1._id);
      const unblockResponse = await request(app)
        .put('/api/users/block')
        .set('Authorization', `Bearer ${1}`)
        .send({
          babyProfileId: profile._id.toString(),
          targetUserId: testUser2._id.toString(),
          blocked: false,
        });

      expect(unblockResponse.status).toBe(200);
      expect(unblockResponse.body.success).toBe(true);

      // User 2 tries to join again (should say they already have access since unblocking gives them access)
      const token2d = generateAuthToken(testUser2._id);
      const joinResponse2 = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${1}`)
        .send({
          joinCode: 'ABC123',
        });

      // They already have access (unblocked means they have a role)
      expect(joinResponse2.status).toBe(400);
      expect(joinResponse2.body.error).toBe('You already have access to this baby profile');
    });

    it('should allow user to join after being deleted (not blocked)', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      // Admin creates profile
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      // User 2 joins
      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      // Admin removes User 2
      const token1c = generateAuthToken(testUser1._id);
      const deleteResponse = await request(app)
        .delete('/api/users')
        .set('Authorization', `Bearer ${1}`)
        .send({
          babyProfileId: profile._id.toString(),
          targetUserId: testUser2._id.toString(),
        });

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify User 2 was removed
      let role = await UserBabyRole.findOne({
        userId: testUser2._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeNull();

      // User 2 tries to join again (should succeed)
      const token2e = generateAuthToken(testUser2._id);
      const joinResponse = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${1}`)
        .send({
          joinCode: 'ABC123',
        });

      expect(joinResponse.status).toBe(200);
      expect(joinResponse.body.success).toBe(true);
      expect(joinResponse.body.profile.name).toBe('Baby 1');
      expect(joinResponse.body.profile.role).toBe('viewer');

      // Verify role was created again
      role = await UserBabyRole.findOne({
        userId: testUser2._id,
        babyProfileId: profile._id,
      });
      expect(role).toBeTruthy();
      expect(role.role).toBe('viewer');
      expect(role.blocked).toBe(false);
    });

    it('should prevent blocked user from accessing profile after being removed', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      // Admin creates profile
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      // User 2 joins
      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
      });

      // Admin blocks User 2
      const token1d = generateAuthToken(testUser1._id);
      const blockResponse = await request(app)
        .put('/api/users/block')
        .set('Authorization', `Bearer ${1}`)
        .send({
          babyProfileId: profile._id.toString(),
          targetUserId: testUser2._id.toString(),
          blocked: true,
        });

      expect(blockResponse.status).toBe(200);

      // Admin removes User 2
      const token1e = generateAuthToken(testUser1._id);
      const deleteResponse = await request(app)
        .delete('/api/users')
        .set('Authorization', `Bearer ${1}`)
        .send({
          babyProfileId: profile._id.toString(),
          targetUserId: testUser2._id.toString(),
        });

      expect(deleteResponse.status).toBe(200);

      // Create blocked record to prevent rejoining
      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
        blocked: true,
      });

      // User 2 tries to join again (should fail)
      const token2f = generateAuthToken(testUser2._id);
      const joinResponse = await request(app)
        .post('/api/baby-profiles/join')
        .set('Authorization', `Bearer ${1}`)
        .send({
          joinCode: 'ABC123',
        });

      expect(joinResponse.status).toBe(403);
      expect(joinResponse.body.error).toBe('You have been blocked from accessing this baby profile');
    });

    it('should prevent blocked user from accessing profile endpoints', async () => {
      const profile = await BabyProfile.create({
        name: 'Baby 1',
        joinCode: 'ABC123',
      });

      // Admin creates profile
      await UserBabyRole.create({
        userId: testUser1._id,
        babyProfileId: profile._id,
        role: 'admin',
      });

      // User 2 joins and is blocked
      await UserBabyRole.create({
        userId: testUser2._id,
        babyProfileId: profile._id,
        role: 'viewer',
        blocked: true,
      });

      // User 2 tries to update profile (should fail)
      const token2g = generateAuthToken(testUser2._id);
      const updateResponse = await request(app)
        .put(`/api/baby-profiles/${profile._id.toString()}`)
        .set('Authorization', `Bearer ${1}`)
        .send({
          name: 'Updated Name',
        });

      expect(updateResponse.status).toBe(403);
      expect(updateResponse.body.error).toBe('You have been blocked from accessing this baby profile');

      // User 2 tries to leave profile (should fail)
      const token2h = generateAuthToken(testUser2._id);
      const leaveResponse = await request(app)
        .post(`/api/baby-profiles/${profile._id.toString()}/leave`)
        .set('Authorization', `Bearer ${1}`)
        .send({});

      expect(leaveResponse.status).toBe(403);
      expect(leaveResponse.body.error).toBe('You have been blocked from accessing this baby profile');

      // User 2 should not see profile in GET /api/baby-profiles list
      const token2i = generateAuthToken(testUser2._id);
      const getResponse = await request(app)
        .get('/api/baby-profiles')
        .set('Authorization', `Bearer ${1}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      // Blocked profiles should be filtered out
      expect(getResponse.body.profiles).toHaveLength(0);
    });
  });

  describe('Join Code Enable/Disable', () => {
    describe('Default behavior', () => {
      it('should create profile with joinCodeEnabled defaulting to true', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        expect(profile.joinCodeEnabled).toBe(true);
      });

      it('should return joinCodeEnabled in GET response', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .get('/api/baby-profiles')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.profiles[0].joinCodeEnabled).toBe(true);
      });

      it('should return joinCodeEnabled in create response', async () => {
        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .post('/api/baby-profiles')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Baby 1',
          });

        expect(response.status).toBe(200);
        expect(response.body.profile.joinCodeEnabled).toBe(true);
      });
    });

    describe('POST /api/baby-profiles/join with disabled join code', () => {
      it('should return 403 if join code is disabled', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          joinCodeEnabled: false,
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .post('/api/baby-profiles/join')
          .set('Authorization', `Bearer ${token}`)
          .send({
            joinCode: 'ABC123',
          });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Join code is disabled for this baby profile');
      });

      it('should allow joining when join code is enabled', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          joinCodeEnabled: true,
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .post('/api/baby-profiles/join')
          .set('Authorization', `Bearer ${token}`)
          .send({
            joinCode: 'ABC123',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.profile.name).toBe('Baby 1');
      });

      it('should allow joining when joinCodeEnabled is undefined (defaults to true)', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          // joinCodeEnabled not set, should default to true
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .post('/api/baby-profiles/join')
          .set('Authorization', `Bearer ${token}`)
          .send({
            joinCode: 'ABC123',
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('PUT /api/baby-profiles/:id/toggle-join-code', () => {
      it('should return 401 if not authenticated', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .send({});

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Authentication required');
      });

      it('should return 403 if user does not have access to profile', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('do not have access');
      });

      it('should return 403 if user is not admin (viewer)', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'viewer',
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Access denied');
      });

      it('should return 403 if user is not admin (editor)', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'editor',
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('Access denied');
      });

      it('should return 403 if user is blocked', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
          blocked: true,
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('You have been blocked from accessing this baby profile');
      });

      it('should toggle join code from enabled to disabled (admin)', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          joinCodeEnabled: true,
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.profile.joinCodeEnabled).toBe(false);

        // Verify in database
        const updatedProfile = await BabyProfile.findById(profile._id);
        expect(updatedProfile.joinCodeEnabled).toBe(false);
      });

      it('should toggle join code from disabled to enabled (admin)', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          joinCodeEnabled: false,
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.profile.joinCodeEnabled).toBe(true);

        // Verify in database
        const updatedProfile = await BabyProfile.findById(profile._id);
        expect(updatedProfile.joinCodeEnabled).toBe(true);
      });

      it('should toggle join code multiple times', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          joinCodeEnabled: true,
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
        });

        const token = generateAuthToken(testUser1._id);
        // Toggle to disabled
        const response1 = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response1.status).toBe(200);
        expect(response1.body.profile.joinCodeEnabled).toBe(false);

        // Toggle back to enabled
        const response2 = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response2.status).toBe(200);
        expect(response2.body.profile.joinCodeEnabled).toBe(true);

        // Toggle to disabled again
        const response3 = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response3.status).toBe(200);
        expect(response3.body.profile.joinCodeEnabled).toBe(false);
      });

      it('should return updated profile with all fields in toggle response', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          birthDate: new Date('2023-01-01'),
          joinCodeEnabled: true,
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
        });

        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token}`)
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.profile).toHaveProperty('id');
        expect(response.body.profile).toHaveProperty('name', 'Baby 1');
        expect(response.body.profile).toHaveProperty('joinCode', 'ABC123');
        expect(response.body.profile).toHaveProperty('joinCodeEnabled', false);
        expect(response.body.profile).toHaveProperty('role', 'admin');
      });
    });

    describe('Integration: Toggle and Join', () => {
      it('should prevent joining after admin disables join code', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          joinCodeEnabled: true,
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
        });

        // Admin disables join code
        const token1 = generateAuthToken(testUser1._id);
        const toggleResponse = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${token1}`)
          .send({});

        expect(toggleResponse.status).toBe(200);
        expect(toggleResponse.body.profile.joinCodeEnabled).toBe(false);

        // User 2 tries to join - should fail
        const token2 = generateAuthToken(testUser2._id);
        const joinResponse = await request(app)
          .post('/api/baby-profiles/join')
          .set('Authorization', `Bearer ${token2}`)
          .send({
            joinCode: 'ABC123',
          });

        expect(joinResponse.status).toBe(403);
        expect(joinResponse.body.error).toBe('Join code is disabled for this baby profile');
      });

      it('should allow joining after admin re-enables join code', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
          joinCodeEnabled: false,
        });

        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'admin',
        });

        // User 2 tries to join - should fail
        const token2a = generateAuthToken(testUser2._id);
        const joinResponse1 = await request(app)
          .post('/api/baby-profiles/join')
          .set('Authorization', `Bearer ${1}`)
          .send({
            joinCode: 'ABC123',
          });

        expect(joinResponse1.status).toBe(403);

        // Admin enables join code
        const token1a = generateAuthToken(testUser1._id);
        const toggleResponse = await request(app)
          .put(`/api/baby-profiles/${profile._id.toString()}/toggle-join-code`)
          .set('Authorization', `Bearer ${1}`)
          .send({});

        expect(toggleResponse.status).toBe(200);
        expect(toggleResponse.body.profile.joinCodeEnabled).toBe(true);

        // Wait for rate limit to expire (3 seconds + small buffer)
        await new Promise(resolve => setTimeout(resolve, 3100));

        // User 2 tries to join again - should succeed
        const token2b = generateAuthToken(testUser2._id);
        const joinResponse2 = await request(app)
          .post('/api/baby-profiles/join')
          .set('Authorization', `Bearer ${1}`)
          .send({
            joinCode: 'ABC123',
          });

        expect(joinResponse2.status).toBe(200);
        expect(joinResponse2.body.success).toBe(true);
      });
    });
  });

  describe('Additional edge cases', () => {
    describe('POST /api/baby-profiles', () => {
      it('should handle invalid birthDate format gracefully', async () => {
        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .post('/api/baby-profiles')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'Baby 1',
            birthDate: 'invalid-date',
          });

        // Invalid date strings create Invalid Date objects
        // Mongoose may accept or reject Invalid Date objects
        // If accepted, JSON serialization may convert to null or cause issues
        // The route should handle this gracefully (either success or proper error)
        if (response.status === 200) {
          expect(response.body.success).toBe(true);
          expect(response.body.profile.name).toBe('Baby 1');
          // birthDate might be null, undefined, or an Invalid Date string
        } else {
          // If Mongoose rejects Invalid Date, expect a 500 error
          expect(response.status).toBe(500);
          expect(response.body.error).toBe('Failed to create baby profile');
        }
      });
    });

    describe('POST /api/baby-profiles/join', () => {
      it('should handle database errors gracefully', async () => {
        const profile = await BabyProfile.create({
          name: 'Baby 1',
          joinCode: 'ABC123',
        });

        // Create a role to trigger duplicate key error scenario
        await UserBabyRole.create({
          userId: testUser1._id,
          babyProfileId: profile._id,
          role: 'viewer',
        });

        // Try to join again - should be caught by the existing check, but test error handling
        const token = generateAuthToken(testUser1._id);
        const response = await request(app)
          .post('/api/baby-profiles/join')
          .set('Authorization', `Bearer ${token}`)
          .send({
            joinCode: 'ABC123',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('You already have access to this baby profile');
      });
    });

    describe('GET /api/baby-profiles', () => {
      it('should handle invalid token format', async () => {
        const response = await request(app)
          .get('/api/baby-profiles')
          .set('Authorization', 'Bearer invalid-token');

        // Invalid token should return 401
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Invalid or expired token');
      });
    });
  });
});


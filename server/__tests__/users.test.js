import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from './helpers.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import User from '../models/User.js';
import BabyProfile from '../models/BabyProfile.js';
import UserBabyRole from '../models/UserBabyRole.js';

describe('Users Routes', () => {
  let app;
  let adminUser, viewerUser, editorUser, otherUser;
  let babyProfile;

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
    adminUser = await User.create({
      googleId: 'admin',
      email: 'admin@example.com',
      name: 'Admin User',
    });
    viewerUser = await User.create({
      googleId: 'viewer',
      email: 'viewer@example.com',
      name: 'Viewer User',
    });
    editorUser = await User.create({
      googleId: 'editor',
      email: 'editor@example.com',
      name: 'Editor User',
    });
    otherUser = await User.create({
      googleId: 'other',
      email: 'other@example.com',
      name: 'Other User',
    });

    // Create baby profile
    babyProfile = await BabyProfile.create({
      name: 'Test Baby',
      birthDate: new Date('2023-01-01'),
      gender: 'male',
    });

    // Create roles
    await UserBabyRole.create({
      userId: adminUser._id,
      babyProfileId: babyProfile._id,
      role: 'admin',
    });
    await UserBabyRole.create({
      userId: viewerUser._id,
      babyProfileId: babyProfile._id,
      role: 'viewer',
    });
    await UserBabyRole.create({
      userId: editorUser._id,
      babyProfileId: babyProfile._id,
      role: 'editor',
    });
  });

  describe('GET /api/users', () => {
    it('should return 400 if userId is missing', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ babyProfileId: babyProfile._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId and babyProfileId are required');
    });

    it('should return 400 if babyProfileId is missing', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ userId: adminUser._id.toString() });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId and babyProfileId are required');
    });

    it('should return 400 if userId format is invalid', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({
          userId: 'invalid',
          babyProfileId: babyProfile._id.toString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid userId or babyProfileId format');
    });

    it('should return 403 if user is not an admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({
          userId: viewerUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this baby profile');
    });

    it('should return 403 if user has no access', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({
          userId: otherUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this baby profile');
    });

    it('should return all users for a baby profile if user is admin', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(3);
      expect(response.body.users).toHaveLength(3);

      // Verify user data structure
      const adminUserData = response.body.users.find(u => u.id === adminUser._id.toString());
      expect(adminUserData).toBeTruthy();
      expect(adminUserData.email).toBe('admin@example.com');
      expect(adminUserData.role).toBe('admin');
    });

    it('should filter out deleted users', async () => {
      // Delete a user
      await User.deleteOne({ _id: viewerUser._id });

      const response = await request(app)
        .get('/api/users')
        .query({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.users).toHaveLength(2);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 404 if user not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app).get(`/api/users/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return user by id', async () => {
      const response = await request(app).get(`/api/users/${adminUser._id.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(adminUser._id.toString());
      expect(response.body.user.email).toBe('admin@example.com');
      expect(response.body.user.name).toBe('Admin User');
    });
  });

  describe('PUT /api/users/role', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .put('/api/users/role')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId, babyProfileId, targetUserId, and newRole are required');
    });

    it('should return 400 if role is invalid', async () => {
      const response = await request(app)
        .put('/api/users/role')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: viewerUser._id.toString(),
          newRole: 'invalid_role',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid role. Must be admin, editor, or viewer');
    });

    it('should return 403 if user is not an admin', async () => {
      const response = await request(app)
        .put('/api/users/role')
        .send({
          userId: viewerUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: editorUser._id.toString(),
          newRole: 'viewer',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only admins can change user roles');
    });

    it('should return 400 if admin tries to change their own role', async () => {
      const response = await request(app)
        .put('/api/users/role')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: adminUser._id.toString(),
          newRole: 'viewer',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You cannot change your own role');
    });

    it('should return 404 if target user is not part of baby profile', async () => {
      const response = await request(app)
        .put('/api/users/role')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: otherUser._id.toString(),
          newRole: 'viewer',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User is not part of this baby profile');
    });

    it('should update user role successfully', async () => {
      const response = await request(app)
        .put('/api/users/role')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: viewerUser._id.toString(),
          newRole: 'editor',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.userRole.role).toBe('editor');

      // Verify role was updated in database
      const role = await UserBabyRole.findOne({
        userId: viewerUser._id,
        babyProfileId: babyProfile._id,
      });
      expect(role.role).toBe('editor');
    });
  });

  describe('DELETE /api/users', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId, babyProfileId, and targetUserId are required');
    });

    it('should return 403 if user is not an admin', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({
          userId: viewerUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: editorUser._id.toString(),
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only admins can remove users');
    });

    it('should return 400 if admin tries to remove themselves', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: adminUser._id.toString(),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You cannot remove yourself from the baby profile');
    });

    it('should return 404 if target user is not part of baby profile', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: otherUser._id.toString(),
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User is not part of this baby profile');
    });

    it('should remove user from baby profile successfully', async () => {
      const response = await request(app)
        .delete('/api/users')
        .send({
          userId: adminUser._id.toString(),
          babyProfileId: babyProfile._id.toString(),
          targetUserId: viewerUser._id.toString(),
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User removed from baby profile successfully');

      // Verify role was deleted
      const role = await UserBabyRole.findOne({
        userId: viewerUser._id,
        babyProfileId: babyProfile._id,
      });
      expect(role).toBeNull();
    });
  });
});


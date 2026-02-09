import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp, generateAuthToken } from './helpers.js';
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

  describe('GET /baby-profiles/:id/members', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get(`/baby-profiles/${babyProfile._id.toString()}/members`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user is not an admin', async () => {
      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${babyProfile._id.toString()}/members`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 403 if user has no access', async () => {
      const token = generateAuthToken(otherUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${babyProfile._id.toString()}/members`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this baby profile');
    });

    it('should return all users for a baby profile if user is admin', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${babyProfile._id.toString()}/members`)
        .set('Authorization', `Bearer ${token}`);

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

      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${babyProfile._id.toString()}/members`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
      expect(response.body.users).toHaveLength(2);
    });
  });

  describe('GET /users/:id', () => {
    it('should return 404 if user not found', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app).get(`/users/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return user by id', async () => {
      const response = await request(app).get(`/users/${adminUser._id.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(adminUser._id.toString());
      expect(response.body.user.email).toBe('admin@example.com');
      expect(response.body.user.name).toBe('Admin User');
    });
  });

  describe('PATCH /baby-profiles/:id/members/:userId (role)', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .send({ role: 'editor' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 400 if neither role nor blocked provided', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Provide role or blocked in body');
    });

    it('should return 400 if role is invalid', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'invalid_role' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid role. Must be admin, editor, or viewer');
    });

    it('should return 403 if user is not an admin', async () => {
      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${editorUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 400 if admin tries to change their own role', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${adminUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You cannot change your own role');
    });

    it('should return 404 if target user is not part of baby profile', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${otherUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'viewer' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User is not part of this baby profile');
    });

    it('should update user role successfully', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'editor' });

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

  describe('DELETE /baby-profiles/:id/members/:userId', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user is not an admin', async () => {
      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .delete(`/baby-profiles/${babyProfile._id.toString()}/members/${editorUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 400 if admin tries to remove themselves', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .delete(`/baby-profiles/${babyProfile._id.toString()}/members/${adminUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You cannot remove yourself from the baby profile');
    });

    it('should return 404 if target user is not part of baby profile', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .delete(`/baby-profiles/${babyProfile._id.toString()}/members/${otherUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User is not part of this baby profile');
    });

    it('should remove user from baby profile successfully', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .delete(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

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

  describe('PATCH /baby-profiles/:id/members/:userId (blocked)', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .send({ blocked: true });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user is not an admin', async () => {
      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${editorUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ blocked: true });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should return 400 if admin tries to block themselves', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${adminUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ blocked: true });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You cannot block yourself');
    });

    it('should block a user successfully', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ blocked: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User blocked successfully');
      expect(response.body.userRole.blocked).toBe(true);

      // Verify user is blocked in database
      const role = await UserBabyRole.findOne({
        userId: viewerUser._id,
        babyProfileId: babyProfile._id,
      });
      expect(role.blocked).toBe(true);
    });

    it('should unblock a user successfully', async () => {
      // First block the user
      await UserBabyRole.updateOne(
        {
          userId: viewerUser._id,
          babyProfileId: babyProfile._id,
        },
        { blocked: true }
      );

      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ blocked: false });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User unblocked successfully');
      expect(response.body.userRole.blocked).toBe(false);

      // Verify user is unblocked in database
      const role = await UserBabyRole.findOne({
        userId: viewerUser._id,
        babyProfileId: babyProfile._id,
      });
      expect(role.blocked).toBe(false);
    });

    it('should create blocked record for user not in profile', async () => {
      // Remove otherUser from profile first (if exists)
      await UserBabyRole.deleteOne({
        userId: otherUser._id,
        babyProfileId: babyProfile._id,
      });

      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${otherUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ blocked: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify blocked record was created
      const role = await UserBabyRole.findOne({
        userId: otherUser._id,
        babyProfileId: babyProfile._id,
      });
      expect(role).toBeTruthy();
      expect(role.blocked).toBe(true);
    });

    it('should return 404 when unblocking user who is not blocked', async () => {
      // Ensure otherUser is not in profile
      await UserBabyRole.deleteOne({
        userId: otherUser._id,
        babyProfileId: babyProfile._id,
      });

      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${otherUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ blocked: false });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User is not blocked for this baby profile');
    });

    it('should return 400 when unblocking user who is already unblocked', async () => {
      // Ensure viewerUser is not blocked
      await UserBabyRole.updateOne(
        {
          userId: viewerUser._id,
          babyProfileId: babyProfile._id,
        },
        { blocked: false }
      );

      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .patch(`/baby-profiles/${babyProfile._id.toString()}/members/${viewerUser._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ blocked: false });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User is not blocked');
    });
  });
});


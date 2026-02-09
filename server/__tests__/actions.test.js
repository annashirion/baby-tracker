import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp, generateAuthToken } from './helpers.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import User from '../models/User.js';
import BabyProfile from '../models/BabyProfile.js';
import Action from '../models/Action.js';
import UserBabyRole from '../models/UserBabyRole.js';

describe('Actions Routes', () => {
  let app;
  let adminUser, editorUser, viewerUser, otherUser;
  let testBabyProfile;

  beforeAll(async () => {
    await setupTestDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    // Create test users with different roles
    adminUser = await User.create({
      googleId: 'admin',
      email: 'admin@example.com',
      name: 'Admin User',
    });
    editorUser = await User.create({
      googleId: 'editor',
      email: 'editor@example.com',
      name: 'Editor User',
    });
    viewerUser = await User.create({
      googleId: 'viewer',
      email: 'viewer@example.com',
      name: 'Viewer User',
    });
    otherUser = await User.create({
      googleId: 'other',
      email: 'other@example.com',
      name: 'Other User',
    });
    
    // Create test baby profile
    testBabyProfile = await BabyProfile.create({
      name: 'Baby 1',
      birthDate: new Date('2023-01-01'),
    });

    // Create roles
    await UserBabyRole.create({
      userId: adminUser._id,
      babyProfileId: testBabyProfile._id,
      role: 'admin',
    });
    await UserBabyRole.create({
      userId: editorUser._id,
      babyProfileId: testBabyProfile._id,
      role: 'editor',
    });
    await UserBabyRole.create({
      userId: viewerUser._id,
      babyProfileId: testBabyProfile._id,
      role: 'viewer',
    });
  });

  describe('POST /baby-profiles/:id/actions', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .send({
          actionType: 'diaper',
          details: { type: 'pee' },
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user has no access to baby profile', async () => {
      const token = generateAuthToken(otherUser._id);
      const response = await request(app)
        .post(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          actionType: 'diaper',
          details: { type: 'pee' },
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this baby profile');
    });

    it('should return 403 if user is blocked', async () => {
      // Block viewer user
      await UserBabyRole.updateOne(
        { userId: viewerUser._id, babyProfileId: testBabyProfile._id },
        { blocked: true }
      );

      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .post(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          actionType: 'diaper',
          details: { type: 'pee' },
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You have been blocked from accessing this baby profile');
    });

    it('should return 403 if viewer tries to create action', async () => {
      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .post(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          actionType: 'diaper',
          details: { type: 'pee' },
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should successfully create action as admin', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .post(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          actionType: 'diaper',
          details: { type: 'pee', comments: 'Wet diaper' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.actionType).toBe('diaper');
      expect(response.body.action.details.type).toBe('pee');
      expect(response.body.action.userId.toString()).toBe(adminUser._id.toString());
    });

    it('should successfully create action as editor', async () => {
      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .post(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          actionType: 'feed',
          details: { amount: 100, unit: 'ml' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.actionType).toBe('feed');
      expect(response.body.action.userId.toString()).toBe(editorUser._id.toString());
    });

    it('should create action with custom timestamp (stored in details, real createdAt/updatedAt)', async () => {
      const token = generateAuthToken(adminUser._id);
      const customTimestamp = '2023-06-15T10:00:00Z';
      const beforeCreate = Date.now();
      const response = await request(app)
        .post(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          actionType: 'sleep',
          details: { duration: 120 },
          timestamp: customTimestamp,
        });

      expect(response.status).toBe(200);
      // Timestamp from params is stored in details only; logic uses only timestamp
      expect(response.body.action.details.timestamp).toBe(customTimestamp);
      // Backend saves real createdAt/updatedAt (server time)
      const createdAtMs = new Date(response.body.action.createdAt).getTime();
      expect(createdAtMs).toBeGreaterThanOrEqual(beforeCreate - 1000);
      expect(createdAtMs).toBeLessThanOrEqual(Date.now() + 1000);
    });
  });

  describe('GET /baby-profiles/:id/actions', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get(`/baby-profiles/${testBabyProfile._id.toString()}/actions`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 403 if user has no access', async () => {
      const token = generateAuthToken(otherUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this baby profile');
    });

    it('should return actions for viewer', async () => {
      // Create some actions
      await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: adminUser._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });
      await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: editorUser._id,
        actionType: 'feed',
        details: { amount: 100 },
      });

      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.actions).toHaveLength(2);
    });

    it('should return actions for editor', async () => {
      await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: adminUser._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });

      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return actions for admin', async () => {
      await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: adminUser._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });

      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .get(`/baby-profiles/${testBabyProfile._id.toString()}/actions`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /actions/:id', () => {
    let testAction;

    beforeEach(async () => {
      testAction = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: editorUser._id,
        actionType: 'diaper',
        details: { type: 'pee', comments: 'Original' },
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .put(`/actions/${testAction._id.toString()}`)
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          details: { type: 'poo' },
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should allow update without babyProfileId in body (gets it from action)', async () => {
      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .put(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          details: { type: 'poo', comments: 'Updated without babyProfileId' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.details.type).toBe('poo');
      expect(response.body.action.details.comments).toBe('Updated without babyProfileId');
    });

    it('should return 403 if viewer tries to update', async () => {
      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .put(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          details: { type: 'poo' },
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to edit this action');
    });

    it('should return 403 if editor tries to update another user\'s action', async () => {
      const adminAction = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: adminUser._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });

      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .put(`/actions/${adminAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          details: { type: 'poo' },
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have permission to edit this action');
    });

    it('should allow editor to update their own action', async () => {
      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .put(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          details: { type: 'poo', comments: 'Updated' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.details.type).toBe('poo');
      expect(response.body.action.details.comments).toBe('Updated');
    });

    it('should allow admin to update any action', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .put(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          details: { type: 'poo', comments: 'Admin updated' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.details.comments).toBe('Admin updated');
    });

    it('should return 404 if action does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .put(`/actions/${fakeId.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          details: { type: 'poo' },
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action not found');
    });

    it('should return 403 if user has no access to action\'s baby profile', async () => {
      const otherProfile = await BabyProfile.create({ name: 'Other Baby' });
      const otherAction = await Action.create({
        babyProfileId: otherProfile._id,
        userId: adminUser._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });

      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .put(`/actions/${otherAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          details: { type: 'poo' },
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this baby profile');
    });
  });

  describe('DELETE /actions/:id', () => {
    let testAction;

    beforeEach(async () => {
      testAction = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: editorUser._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .delete(`/actions/${testAction._id.toString()}`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should allow delete without babyProfileId in body (gets it from action)', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .delete(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Action deleted successfully');

      // Verify action was deleted
      const deletedAction = await Action.findById(testAction._id);
      expect(deletedAction).toBeNull();
    });

    it('should return 403 if viewer tries to delete', async () => {
      const token = generateAuthToken(viewerUser._id);
      const response = await request(app)
        .delete(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only admins can delete actions');
    });

    it('should return 403 if editor tries to delete', async () => {
      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .delete(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only admins can delete actions');
    });

    it('should allow admin to delete action', async () => {
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .delete(`/actions/${testAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Action deleted successfully');

      // Verify action was deleted
      const deletedAction = await Action.findById(testAction._id);
      expect(deletedAction).toBeNull();
    });

    it('should return 404 if action does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const token = generateAuthToken(adminUser._id);
      const response = await request(app)
        .delete(`/actions/${fakeId.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action not found');
    });

    it('should return 403 if user has no access to action\'s baby profile', async () => {
      const otherProfile = await BabyProfile.create({ name: 'Other Baby' });
      const otherAction = await Action.create({
        babyProfileId: otherProfile._id,
        userId: adminUser._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });

      const token = generateAuthToken(editorUser._id);
      const response = await request(app)
        .delete(`/actions/${otherAction._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('You do not have access to this baby profile');
    });
  });
});

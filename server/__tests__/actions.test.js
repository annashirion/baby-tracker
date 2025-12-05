import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp } from './helpers.js';
import { setupTestDB, teardownTestDB, clearDatabase } from './setup.js';
import User from '../models/User.js';
import BabyProfile from '../models/BabyProfile.js';
import Action from '../models/Action.js';

describe('Actions Routes', () => {
  let app;
  let testUser1, testUser2;
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
    // Create test baby profile
    testBabyProfile = await BabyProfile.create({
      name: 'Baby 1',
      birthDate: new Date('2023-01-01'),
    });
  });

  describe('PUT /api/actions/:id', () => {
    it('should return 404 if action does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/actions/${fakeId.toString()}`)
        .send({
          details: { type: 'pee', comments: 'Updated comment' },
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action not found');
    });

    it('should return 404 if action id is invalid', async () => {
      const response = await request(app)
        .put('/api/actions/invalid-id')
        .send({
          details: { type: 'pee', comments: 'Updated comment' },
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update action');
    });

    it('should successfully update action details', async () => {
      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'diaper',
        details: { type: 'pee', comments: 'Original comment' },
      });

      const response = await request(app)
        .put(`/api/actions/${action._id.toString()}`)
        .send({
          details: { type: 'poo', comments: 'Updated comment' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.id).toBe(action._id.toString());
      expect(response.body.action.details.type).toBe('poo');
      expect(response.body.action.details.comments).toBe('Updated comment');
      expect(response.body.action.actionType).toBe('diaper');
      expect(response.body.action.babyProfileId.toString()).toBe(testBabyProfile._id.toString());
      expect(response.body.action.userId.toString()).toBe(testUser1._id.toString());

      // Verify action was updated in database
      const updatedAction = await Action.findById(action._id);
      expect(updatedAction.details.type).toBe('poo');
      expect(updatedAction.details.comments).toBe('Updated comment');
    });

    it('should update action with empty details object', async () => {
      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'feed',
        details: { amount: 100, unit: 'ml' },
      });

      const response = await request(app)
        .put(`/api/actions/${action._id.toString()}`)
        .send({
          details: {},
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.details).toEqual({});

      // Verify action was updated in database
      const updatedAction = await Action.findById(action._id);
      expect(updatedAction.details).toEqual({});
    });

    it('should update action details without changing other fields', async () => {
      const originalTimestamp = new Date('2023-06-15T10:00:00Z');
      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'sleep',
        details: { duration: 120, unit: 'minutes' },
        userEmoji: '😴',
        createdAt: originalTimestamp,
        updatedAt: originalTimestamp,
      });

      const response = await request(app)
        .put(`/api/actions/${action._id.toString()}`)
        .send({
          details: { duration: 180, unit: 'minutes', notes: 'Long nap' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.actionType).toBe('sleep');
      expect(response.body.action.userEmoji).toBe('😴');
      expect(response.body.action.babyProfileId.toString()).toBe(testBabyProfile._id.toString());
      expect(response.body.action.userId.toString()).toBe(testUser1._id.toString());
      expect(response.body.action.details.duration).toBe(180);
      expect(response.body.action.details.unit).toBe('minutes');
      expect(response.body.action.details.notes).toBe('Long nap');

      // Verify updatedAt was changed
      const updatedAction = await Action.findById(action._id);
      expect(updatedAction.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
    });

    it('should update action with complex nested details', async () => {
      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'other',
        details: { title: 'Medicine', notes: 'Took vitamins' },
      });

      const complexDetails = {
        title: 'Doctor Visit',
        notes: 'Regular checkup',
        location: 'Pediatric Clinic',
        doctor: 'Dr. Smith',
        medications: ['Vitamin D', 'Iron'],
      };

      const response = await request(app)
        .put(`/api/actions/${action._id.toString()}`)
        .send({
          details: complexDetails,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.details).toEqual(complexDetails);

      // Verify action was updated in database
      const updatedAction = await Action.findById(action._id);
      expect(updatedAction.details).toEqual(complexDetails);
    });

    it('should handle update when details is not provided (defaults to empty object)', async () => {
      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });

      const response = await request(app)
        .put(`/api/actions/${action._id.toString()}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action.details).toEqual({});

      // Verify action was updated in database
      const updatedAction = await Action.findById(action._id);
      expect(updatedAction.details).toEqual({});
    });
  });

  describe('DELETE /api/actions/:id', () => {
    it('should return 404 if action does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/actions/${fakeId.toString()}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action not found');
    });

    it('should return 500 if action id is invalid', async () => {
      const response = await request(app)
        .delete('/api/actions/invalid-id');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete action');
    });

    it('should successfully delete an action', async () => {
      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'diaper',
        details: { type: 'pee', comments: 'Wet diaper' },
      });

      const actionId = action._id.toString();

      const response = await request(app)
        .delete(`/api/actions/${actionId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Action deleted successfully');

      // Verify action was deleted from database
      const deletedAction = await Action.findById(actionId);
      expect(deletedAction).toBeNull();
    });

    it('should delete action with different action types', async () => {
      const diaperAction = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'diaper',
        details: { type: 'poo' },
      });

      const sleepAction = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'sleep',
        details: { duration: 120 },
      });

      const feedAction = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'feed',
        details: { amount: 100 },
      });

      const otherAction = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'other',
        details: { title: 'Medicine' },
      });

      // Delete all actions
      const response1 = await request(app)
        .delete(`/api/actions/${diaperAction._id.toString()}`);
      expect(response1.status).toBe(200);

      const response2 = await request(app)
        .delete(`/api/actions/${sleepAction._id.toString()}`);
      expect(response2.status).toBe(200);

      const response3 = await request(app)
        .delete(`/api/actions/${feedAction._id.toString()}`);
      expect(response3.status).toBe(200);

      const response4 = await request(app)
        .delete(`/api/actions/${otherAction._id.toString()}`);
      expect(response4.status).toBe(200);

      // Verify all actions were deleted
      const actions = await Action.find({
        _id: { $in: [diaperAction._id, sleepAction._id, feedAction._id, otherAction._id] },
      });
      expect(actions).toHaveLength(0);
    });

    it('should delete action with userEmoji', async () => {
      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'diaper',
        details: { type: 'pee' },
        userEmoji: '💧',
      });

      const response = await request(app)
        .delete(`/api/actions/${action._id.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify action was deleted
      const deletedAction = await Action.findById(action._id);
      expect(deletedAction).toBeNull();
    });

    it('should delete action and not affect other actions', async () => {
      const action1 = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'diaper',
        details: { type: 'pee' },
      });

      const action2 = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'feed',
        details: { amount: 100 },
      });

      const action3 = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser2._id,
        actionType: 'sleep',
        details: { duration: 120 },
      });

      // Delete action2
      const response = await request(app)
        .delete(`/api/actions/${action2._id.toString()}`);

      expect(response.status).toBe(200);

      // Verify action2 was deleted
      const deletedAction = await Action.findById(action2._id);
      expect(deletedAction).toBeNull();

      // Verify other actions still exist
      const remainingAction1 = await Action.findById(action1._id);
      expect(remainingAction1).toBeTruthy();
      expect(remainingAction1.actionType).toBe('diaper');

      const remainingAction3 = await Action.findById(action3._id);
      expect(remainingAction3).toBeTruthy();
      expect(remainingAction3.actionType).toBe('sleep');
    });

    it('should delete action with complex details', async () => {
      const complexDetails = {
        title: 'Doctor Visit',
        notes: 'Regular checkup',
        location: 'Pediatric Clinic',
        doctor: 'Dr. Smith',
        medications: ['Vitamin D', 'Iron'],
        measurements: {
          weight: 7.5,
          height: 65,
          unit: 'kg/cm',
        },
      };

      const action = await Action.create({
        babyProfileId: testBabyProfile._id,
        userId: testUser1._id,
        actionType: 'other',
        details: complexDetails,
      });

      const response = await request(app)
        .delete(`/api/actions/${action._id.toString()}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify action was deleted
      const deletedAction = await Action.findById(action._id);
      expect(deletedAction).toBeNull();
    });
  });

  describe('Integration: Create, Update, and Delete', () => {
    it('should create, update, and delete an action', async () => {
      // Create action
      const createResponse = await request(app)
        .post('/api/actions')
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          userId: testUser1._id.toString(),
          actionType: 'diaper',
          details: { type: 'pee', comments: 'Initial comment' },
        });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.success).toBe(true);
      const actionId = createResponse.body.action.id;

      // Update action
      const updateResponse = await request(app)
        .put(`/api/actions/${actionId}`)
        .send({
          details: { type: 'poo', comments: 'Updated comment' },
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.action.details.type).toBe('poo');
      expect(updateResponse.body.action.details.comments).toBe('Updated comment');

      // Delete action
      const deleteResponse = await request(app)
        .delete(`/api/actions/${actionId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify action was deleted
      const deletedAction = await Action.findById(actionId);
      expect(deletedAction).toBeNull();
    });

    it('should handle multiple updates before deletion', async () => {
      // Create action
      const createResponse = await request(app)
        .post('/api/actions')
        .send({
          babyProfileId: testBabyProfile._id.toString(),
          userId: testUser1._id.toString(),
          actionType: 'feed',
          details: { amount: 50 },
        });

      const actionId = createResponse.body.action.id;

      // First update
      const update1 = await request(app)
        .put(`/api/actions/${actionId}`)
        .send({
          details: { amount: 100, unit: 'ml' },
        });
      expect(update1.status).toBe(200);
      expect(update1.body.action.details.amount).toBe(100);

      // Second update
      const update2 = await request(app)
        .put(`/api/actions/${actionId}`)
        .send({
          details: { amount: 150, unit: 'ml', notes: 'Finished bottle' },
        });
      expect(update2.status).toBe(200);
      expect(update2.body.action.details.amount).toBe(150);
      expect(update2.body.action.details.notes).toBe('Finished bottle');

      // Delete action
      const deleteResponse = await request(app)
        .delete(`/api/actions/${actionId}`);
      expect(deleteResponse.status).toBe(200);

      // Verify action was deleted
      const deletedAction = await Action.findById(actionId);
      expect(deletedAction).toBeNull();
    });
  });
});


import express from 'express';
import mongoose from 'mongoose';
import Action from '../models/Action.js';
import { authenticate, checkBabyProfileAccess } from '../middleware/auth.js';
import UserBabyRole from '../models/UserBabyRole.js';

const router = express.Router();

// Create a new action (editors and admins only)
router.post('/', authenticate, checkBabyProfileAccess(['admin', 'editor'], 'body'), async (req, res) => {
  try {
    const { actionType, details, userEmoji, timestamp } = req.body;
    const { babyProfileId, userId } = req.userRole;

    if (!actionType) {
      return res.status(400).json({ error: 'actionType is required' });
    }

    // If a custom timestamp is provided, create the action with custom timestamps
    let action;
    if (timestamp) {
      const customTimestamp = new Date(timestamp);
      action = new Action({
        babyProfileId,
        userId,
        actionType,
        details: details || {},
        userEmoji: userEmoji || null,
        createdAt: customTimestamp,
        updatedAt: customTimestamp,
      });
      // Use save() instead of create() to preserve custom timestamps
      await action.save();
    } else {
      action = await Action.create({
        babyProfileId,
        userId,
        actionType,
        details: details || {},
        userEmoji: userEmoji || null,
      });
    }

    res.json({
      success: true,
      action: {
        id: action._id,
        babyProfileId: action.babyProfileId,
        userId: action.userId,
        actionType: action.actionType,
        details: action.details,
        userEmoji: action.userEmoji,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error creating action:', error);
    res.status(500).json({ error: 'Failed to create action', message: error.message });
  }
});

// Get all actions for a baby profile (all roles can read)
router.get('/', authenticate, checkBabyProfileAccess(['admin', 'editor', 'viewer'], 'query'), async (req, res) => {
  try {
    const { babyProfileId } = req.userRole;

    const actions = await Action.find({ babyProfileId })
      .sort({ createdAt: -1 }) // Most recent first
      .populate('userId', 'name email emoji')
      .lean();

    res.json({
      success: true,
      actions: actions.map(action => ({
        id: action._id,
        babyProfileId: action.babyProfileId,
        userId: action.userId,
        actionType: action.actionType,
        details: action.details,
        userEmoji: action.userEmoji,
        createdAt: action.createdAt,
        updatedAt: action.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching actions:', error);
    res.status(500).json({ error: 'Failed to fetch actions', message: error.message });
  }
});

// Update an action (editors and admins only, and only their own actions unless admin)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { details } = req.body;

    // Get the action first to check ownership and get babyProfileId
    const action = await Action.findById(id);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    // Get babyProfileId from the action (more secure than requiring it in body)
    const babyProfileId = action.babyProfileId.toString();

    // Check user's role for this baby profile
    const userIdObj = new mongoose.Types.ObjectId(req.user.id);
    const babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
    
    const userRole = await UserBabyRole.findOne({
      userId: userIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (!userRole || userRole.blocked) {
      return res.status(403).json({ error: 'You do not have access to this baby profile' });
    }

    // Check if user can edit: admins can edit any action, editors can only edit their own
    const isOwnAction = action.userId.toString() === req.user.id;
    const canEdit = userRole.role === 'admin' || (userRole.role === 'editor' && isOwnAction);

    if (!canEdit) {
      return res.status(403).json({ error: 'You do not have permission to edit this action' });
    }

    // Update the action
    const updatedAction = await Action.findByIdAndUpdate(
      id,
      { 
        details: details || {},
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    res.json({
      success: true,
      action: {
        id: updatedAction._id,
        babyProfileId: updatedAction.babyProfileId,
        userId: updatedAction.userId,
        actionType: updatedAction.actionType,
        details: updatedAction.details,
        userEmoji: updatedAction.userEmoji,
        createdAt: updatedAction.createdAt,
        updatedAt: updatedAction.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating action:', error);
    res.status(500).json({ error: 'Failed to update action', message: error.message });
  }
});

// Delete an action (admins only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Get the action first to get babyProfileId
    const action = await Action.findById(id);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    // Get babyProfileId from the action (more secure than requiring it in body)
    const babyProfileId = action.babyProfileId.toString();

    // Check if user is admin for this baby profile
    const userIdObj = new mongoose.Types.ObjectId(req.user.id);
    const babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
    
    const userRole = await UserBabyRole.findOne({
      userId: userIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (!userRole || userRole.blocked) {
      return res.status(403).json({ error: 'You do not have access to this baby profile' });
    }

    if (userRole.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete actions' });
    }

    await Action.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Action deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting action:', error);
    res.status(500).json({ error: 'Failed to delete action', message: error.message });
  }
});

export default router;


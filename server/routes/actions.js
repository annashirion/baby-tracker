import express from 'express';
import Action from '../models/Action.js';

const router = express.Router();

// Create a new action
router.post('/', async (req, res) => {
  try {
    const { babyProfileId, userId, actionType, details, userEmoji } = req.body;

    if (!babyProfileId || !userId || !actionType) {
      return res.status(400).json({ error: 'babyProfileId, userId, and actionType are required' });
    }

    const action = await Action.create({
      babyProfileId,
      userId,
      actionType,
      details: details || {},
      userEmoji: userEmoji || null,
    });

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

// Get all actions for a baby profile
router.get('/', async (req, res) => {
  try {
    const { babyProfileId } = req.query;

    if (!babyProfileId) {
      return res.status(400).json({ error: 'babyProfileId is required' });
    }

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

export default router;


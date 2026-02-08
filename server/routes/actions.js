import express from 'express';
import { authenticate, checkBabyProfileAccess } from '../middleware/auth.js';
import * as actionsService from '../services/actions.js';
import { AppError } from '../errors.js';

const router = express.Router();

function sendError(res, error) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const body = { error: error.message };
  if (error.profile) body.profile = error.profile;
  if (statusCode === 500) body.message = error.message;
  res.status(statusCode).json(body);
}

// Create a new action (editors and admins only)
router.post('/', authenticate, checkBabyProfileAccess(['admin', 'editor'], 'body'), async (req, res) => {
  try {
    const { actionType, details, userEmoji, timestamp } = req.body;
    const { babyProfileId, userId } = req.userRole;
    const result = await actionsService.createAction({
      babyProfileId,
      userId,
      actionType,
      details,
      userEmoji,
      timestamp,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error creating action:', error);
    sendError(res, error);
  }
});

// Get all actions for a baby profile (all roles can read)
router.get('/', authenticate, checkBabyProfileAccess(['admin', 'editor', 'viewer'], 'query'), async (req, res) => {
  try {
    const { babyProfileId } = req.userRole;
    const { startDate, endDate } = req.query;
    const result = await actionsService.getActions({
      babyProfileId,
      startDate,
      endDate,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching actions:', error);
    sendError(res, error);
  }
});

// Update an action (editors and admins only, and only their own actions unless admin)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { details } = req.body;
    const result = await actionsService.updateAction({
      actionId: id,
      userId: req.user.id,
      details,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating action:', error);
    sendError(res, error);
  }
});

// Delete an action (admins only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await actionsService.deleteAction({
      actionId: id,
      userId: req.user.id,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting action:', error);
    sendError(res, error);
  }
});

export default router;

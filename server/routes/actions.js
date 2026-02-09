import express from 'express';
import { authenticate } from '../middleware/auth.js';
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

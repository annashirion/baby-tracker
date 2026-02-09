import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as usersService from '../services/users.js';
import { AppError } from '../errors.js';

const router = express.Router();

function sendError(res, error) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const body = { error: error.message };
  if (statusCode === 500) body.message = error.message;
  res.status(statusCode).json(body);
}

// Get a single user by ID (public profile)
router.get('/:id', async (req, res) => {
  try {
    const result = await usersService.getUserById(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching user:', error);
    sendError(res, error);
  }
});

// Update user emoji (users can only update their own emoji)
router.put('/:id/emoji', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    const { id } = req.params;
    const result = await usersService.updateUserEmoji({
      userId: req.user.id,
      targetUserId: id,
      emoji,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating emoji:', error);
    sendError(res, error);
  }
});

export default router;

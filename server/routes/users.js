import express from 'express';
import { authenticate, checkBabyProfileAccess } from '../middleware/auth.js';
import * as usersService from '../services/users.js';
import { AppError } from '../errors.js';

const router = express.Router();

function sendError(res, error) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const body = { error: error.message };
  if (statusCode === 500) body.message = error.message;
  res.status(statusCode).json(body);
}

// Get users for a specific baby profile (only admins can access)
router.get('/', authenticate, checkBabyProfileAccess(['admin'], 'query'), async (req, res) => {
  try {
    const { babyProfileId } = req.userRole;
    const result = await usersService.getUsersForBabyProfile(babyProfileId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching users:', error);
    sendError(res, error);
  }
});

// Update a user's role in a baby profile (only admins can do this)
router.put('/role', authenticate, checkBabyProfileAccess(['admin'], 'body'), async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;
    const { userId, babyProfileId } = req.userRole;
    const result = await usersService.updateUserRole({
      userId,
      babyProfileId,
      targetUserId,
      newRole,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating user role:', error);
    sendError(res, error);
  }
});

// Remove a user from a baby profile (only admins can do this)
router.delete('/', authenticate, checkBabyProfileAccess(['admin'], 'body'), async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const { userId, babyProfileId } = req.userRole;
    const result = await usersService.removeUserFromBabyProfile({
      userId,
      babyProfileId,
      targetUserId,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error removing user:', error);
    sendError(res, error);
  }
});

// Get a single user by ID (no auth - public profile?)
router.get('/:id', async (req, res) => {
  try {
    const result = await usersService.getUserById(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching user:', error);
    sendError(res, error);
  }
});

// Block or unblock a user from a baby profile (only admins can do this)
router.put('/block', authenticate, checkBabyProfileAccess(['admin'], 'body'), async (req, res) => {
  try {
    const { targetUserId, blocked } = req.body;
    const { userId, babyProfileId } = req.userRole;
    const result = await usersService.blockUnblockUser({
      userId,
      babyProfileId,
      targetUserId,
      blocked,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
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

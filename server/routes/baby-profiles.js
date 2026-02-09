import express from 'express';
import { authenticate, checkBabyProfileAccess } from '../middleware/auth.js';
import * as babyProfilesService from '../services/baby-profiles.js';
import * as actionsService from '../services/actions.js';
import * as usersService from '../services/users.js';
import { AppError } from '../errors.js';

const router = express.Router();

function sendError(res, error) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const body = { error: error.message };
  if (error.profile) body.profile = error.profile;
  if (statusCode === 500) body.message = error.message;
  if (statusCode === 429) body.message = error.message;
  res.status(statusCode).json(body);
}

router.get('/test', (req, res) => {
  res.json({ message: 'Baby profiles router is working!' });
});

// Get all baby profiles for a user (with their roles)
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await babyProfilesService.getProfilesForUser(req.user.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching baby profiles:', error);
    sendError(res, error);
  }
});

// Create a new baby profile
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, birthDate } = req.body;
    const result = await babyProfilesService.createProfile({
      userId: req.user.id,
      name,
      birthDate,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error creating baby profile:', error);
    if (error instanceof AppError) {
      sendError(res, error);
    } else {
      res.status(500).json({
        error: 'Failed to create baby profile',
        message: error.message,
      });
    }
  }
});

// Join a baby profile using join code
router.post('/join', authenticate, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const result = await babyProfilesService.joinByCode({
      userId: req.user.id,
      joinCode,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error joining baby profile:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You already have access to this baby profile' });
    }
    sendError(res, error);
  }
});

// --- Nested under :id (profile id in URL) ---

// Leave a baby profile (remove current user's membership)
router.delete('/:id/members/me', authenticate, checkBabyProfileAccess(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const profileId = req.params.id;
    const result = await babyProfilesService.leaveProfile({
      profileId,
      userId: req.user.id,
      userRole: req.userRole.role,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error leaving baby profile:', error);
    sendError(res, error);
  }
});

// List members of a baby profile (admin only)
router.get('/:id/members', authenticate, checkBabyProfileAccess(['admin']), async (req, res) => {
  try {
    const babyProfileId = req.params.id;
    const result = await usersService.getUsersForBabyProfile(babyProfileId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching users:', error);
    sendError(res, error);
  }
});

// Update a member (role or blocked) - admin only
router.patch('/:id/members/:userId', authenticate, checkBabyProfileAccess(['admin']), async (req, res) => {
  try {
    const babyProfileId = req.params.id;
    const targetUserId = req.params.userId;
    const { role, blocked } = req.body;
    const { userId } = req.userRole;

    if (role !== undefined) {
      const result = await usersService.updateUserRole({
        userId,
        babyProfileId,
        targetUserId,
        newRole: role,
      });
      return res.json({ success: true, ...result });
    }
    if (typeof blocked === 'boolean') {
      const result = await usersService.blockUnblockUser({
        userId,
        babyProfileId,
        targetUserId,
        blocked,
      });
      return res.json({ success: true, ...result });
    }
    return res.status(400).json({ error: 'Provide role or blocked in body' });
  } catch (error) {
    console.error('Error updating member:', error);
    sendError(res, error);
  }
});

// Remove a member from a baby profile - admin only
router.delete('/:id/members/:userId', authenticate, checkBabyProfileAccess(['admin']), async (req, res) => {
  try {
    const babyProfileId = req.params.id;
    const targetUserId = req.params.userId;
    const { userId } = req.userRole;
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

// List actions for a baby profile
router.get('/:id/actions', authenticate, checkBabyProfileAccess(['admin', 'editor', 'viewer']), async (req, res) => {
  try {
    const babyProfileId = req.params.id;
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

// Create an action for a baby profile (editors and admins only)
router.post('/:id/actions', authenticate, checkBabyProfileAccess(['admin', 'editor']), async (req, res) => {
  try {
    const babyProfileId = req.params.id;
    const { actionType, details, userEmoji, timestamp } = req.body;
    const result = await actionsService.createAction({
      babyProfileId,
      userId: req.user.id,
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

// Update a baby profile (admin only) - full update
router.put('/:id', authenticate, checkBabyProfileAccess(['admin']), async (req, res) => {
  try {
    const profileId = req.params.id;
    const { name, birthDate } = req.body;
    const result = await babyProfilesService.updateProfile({
      profileId,
      name,
      birthDate,
    });
    res.json({
      success: true,
      ...result,
      profile: { ...result.profile, role: req.userRole.role },
    });
  } catch (error) {
    console.error('Error updating baby profile:', error);
    sendError(res, error);
  }
});

// Partial update (e.g. joinCodeEnabled) - admin only
router.patch('/:id', authenticate, checkBabyProfileAccess(['admin']), async (req, res) => {
  try {
    const profileId = req.params.id;
    const { joinCodeEnabled } = req.body;
    const result = await babyProfilesService.updateProfile({
      profileId,
      joinCodeEnabled,
    });
    res.json({
      success: true,
      ...result,
      profile: { ...result.profile, role: req.userRole.role },
    });
  } catch (error) {
    console.error('Error updating baby profile:', error);
    sendError(res, error);
  }
});

// Delete a baby profile (admin only)
router.delete('/:id', authenticate, checkBabyProfileAccess(['admin']), async (req, res) => {
  try {
    const profileId = req.params.id;
    const result = await babyProfilesService.deleteProfile(profileId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting baby profile:', error);
    sendError(res, error);
  }
});

export default router;

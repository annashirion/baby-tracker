import express from 'express';
import { authenticate, checkBabyProfileAccess } from '../middleware/auth.js';
import * as babyProfilesService from '../services/baby-profiles.js';
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

// Update a baby profile (admin only)
router.put('/:id', authenticate, checkBabyProfileAccess(['admin'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, birthDate } = req.body;
    const result = await babyProfilesService.updateProfile({
      profileId: id,
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

// Delete a baby profile (admin only)
router.delete('/:id', authenticate, checkBabyProfileAccess(['admin'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await babyProfilesService.deleteProfile(id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting baby profile:', error);
    sendError(res, error);
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

// Toggle join code enabled/disabled (admin only)
router.put('/:id/toggle-join-code', authenticate, checkBabyProfileAccess(['admin'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await babyProfilesService.toggleJoinCode(id);
    res.json({
      success: true,
      ...result,
      profile: { ...result.profile, role: req.userRole.role },
    });
  } catch (error) {
    console.error('Error toggling join code:', error);
    sendError(res, error);
  }
});

// Leave a baby profile (remove user's access)
router.post('/:id/leave', authenticate, checkBabyProfileAccess(['admin', 'editor', 'viewer'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await babyProfilesService.leaveProfile({
      profileId: id,
      userId: req.user.id,
      userRole: req.userRole.role,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error leaving baby profile:', error);
    sendError(res, error);
  }
});

export default router;

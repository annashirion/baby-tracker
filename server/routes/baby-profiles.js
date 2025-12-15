import express from 'express';
import BabyProfile from '../models/BabyProfile.js';
import UserBabyRole from '../models/UserBabyRole.js';
import { authenticate, checkBabyProfileAccess } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting for failed join attempts: track last failed attempt per user
const failedJoinAttempts = new Map(); // userId -> timestamp of last failed attempt
const RATE_LIMIT_WAIT_MS = 3000; // 3 seconds

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Baby profiles router is working!' });
});

// Get all baby profiles for a user (with their roles)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all roles for this user
    const userRoles = await UserBabyRole.find({ userId }).populate('babyProfileId');

    // Filter out any roles where the baby profile was deleted (null) or user is blocked
    const profiles = userRoles
      .filter(role => role.babyProfileId !== null && !role.blocked)
      .map(role => ({
        id: role.babyProfileId._id,
        name: role.babyProfileId.name,
        birthDate: role.babyProfileId.birthDate,
        joinCode: role.babyProfileId.joinCode,
        joinCodeEnabled: role.babyProfileId.joinCodeEnabled !== false, // Default to true if undefined
        role: role.role,
        createdAt: role.babyProfileId.createdAt,
        updatedAt: role.babyProfileId.updatedAt,
        joinedAt: role.createdAt, // When the user joined/created this profile
      }));

    res.json({
      success: true,
      profiles,
    });
  } catch (error) {
    console.error('Error fetching baby profiles:', error);
    res.status(500).json({ error: 'Failed to fetch baby profiles', message: error.message });
  }
});

// Create a new baby profile
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, birthDate } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Create the baby profile
    const babyProfile = await BabyProfile.create({
      name,
      birthDate: birthDate ? new Date(birthDate) : null,
    });

    // Create the user-baby-role relationship (user becomes admin)
    const userRole = await UserBabyRole.create({
      userId,
      babyProfileId: babyProfile._id,
      role: 'admin',
    });

    res.json({
      success: true,
      profile: {
        id: babyProfile._id,
        name: babyProfile.name,
        birthDate: babyProfile.birthDate,
        joinCode: babyProfile.joinCode,
        joinCodeEnabled: babyProfile.joinCodeEnabled !== false, // Default to true if undefined
        role: 'admin',
        createdAt: babyProfile.createdAt,
        updatedAt: babyProfile.updatedAt,
        joinedAt: userRole.createdAt, // When the user joined/created this profile
      },
    });
  } catch (error) {
    console.error('Error creating baby profile:', error);
    res.status(500).json({ error: 'Failed to create baby profile', message: error.message });
  }
});

// Update a baby profile (admin only)
router.put('/:id', authenticate, checkBabyProfileAccess(['admin'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, birthDate } = req.body;

    // Update the baby profile
    const babyProfile = await BabyProfile.findByIdAndUpdate(
      id,
      {
        name,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
      { new: true, runValidators: true }
    );

    if (!babyProfile) {
      return res.status(404).json({ error: 'Baby profile not found' });
    }

    res.json({
      success: true,
      profile: {
        id: babyProfile._id,
        name: babyProfile.name,
        birthDate: babyProfile.birthDate,
        joinCode: babyProfile.joinCode,
        joinCodeEnabled: babyProfile.joinCodeEnabled !== false, // Default to true if undefined
        role: req.userRole.role,
        createdAt: babyProfile.createdAt,
        updatedAt: babyProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating baby profile:', error);
    res.status(500).json({ error: 'Failed to update baby profile', message: error.message });
  }
});

// Delete a baby profile (admin only)
router.delete('/:id', authenticate, checkBabyProfileAccess(['admin'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Delete all user-baby-role relationships for this profile
    await UserBabyRole.deleteMany({ babyProfileId: id });

    // Delete the baby profile
    const babyProfile = await BabyProfile.findByIdAndDelete(id);

    if (!babyProfile) {
      return res.status(404).json({ error: 'Baby profile not found' });
    }

    res.json({
      success: true,
      message: 'Baby profile deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting baby profile:', error);
    res.status(500).json({ error: 'Failed to delete baby profile', message: error.message });
  }
});

// Join a baby profile using join code
router.post('/join', authenticate, async (req, res) => {
  try {
    const { joinCode } = req.body;
    const userId = req.user.id;

    if (!joinCode) {
      return res.status(400).json({ error: 'joinCode is required' });
    }

    // Normalize userId to string for consistent Map key usage
    const userIdStr = String(userId);

    // Check rate limit: if user had a failed attempt within last 3 seconds, block them
    const lastFailedAttempt = failedJoinAttempts.get(userIdStr);
    if (lastFailedAttempt && (Date.now() - lastFailedAttempt) < RATE_LIMIT_WAIT_MS) {
      return res.status(429).json({ 
        error: 'Please wait before trying again',
        message: 'You must wait 3 seconds before attempting to join again',
      });
    }
    // Clear old failed attempts
    if (lastFailedAttempt && (Date.now() - lastFailedAttempt) >= RATE_LIMIT_WAIT_MS) {
      failedJoinAttempts.delete(userIdStr);
    }

    // Find the baby profile by join code
    const babyProfile = await BabyProfile.findOne({ joinCode: joinCode.toUpperCase() });

    if (!babyProfile) {
      // Record failed attempt timestamp
      failedJoinAttempts.set(userIdStr, Date.now());
      return res.status(404).json({ error: 'Baby profile not found with this join code' });
    }

    // Check if join code is enabled
    if (babyProfile.joinCodeEnabled === false) {
      // Record failed attempt timestamp
      failedJoinAttempts.set(userIdStr, Date.now());
      return res.status(403).json({ error: 'Join code is disabled for this baby profile' });
    }

    // Check if user already has a role for this profile
    const existingRole = await UserBabyRole.findOne({
      userId: userIdStr,
      babyProfileId: babyProfile._id,
    });

    if (existingRole) {
      // Check if user is blocked
      if (existingRole.blocked) {
        return res.status(403).json({ 
          error: 'You have been blocked from accessing this baby profile',
        });
      }
      return res.status(400).json({ 
        error: 'You already have access to this baby profile',
        profile: {
          id: babyProfile._id,
          name: babyProfile.name,
          role: existingRole.role,
        },
      });
    }

    // Create the user-baby-role relationship (user becomes viewer by default)
    const userRole = await UserBabyRole.create({
      userId: userIdStr,
      babyProfileId: babyProfile._id,
      role: 'viewer',
    });

    // Clear any previous failed attempts on successful join
    if (failedJoinAttempts.has(userIdStr)) {
      failedJoinAttempts.delete(userIdStr);
    }

    res.json({
      success: true,
      profile: {
        id: babyProfile._id,
        name: babyProfile.name,
        birthDate: babyProfile.birthDate,
        joinCode: babyProfile.joinCode,
        joinCodeEnabled: babyProfile.joinCodeEnabled !== false, // Default to true if undefined
        role: 'viewer',
        createdAt: babyProfile.createdAt,
        updatedAt: babyProfile.updatedAt,
        joinedAt: userRole.createdAt, // When the user joined/created this profile
      },
    });
  } catch (error) {
    console.error('Error joining baby profile:', error);
    
    // Handle duplicate key error (shouldn't happen due to check above, but just in case)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You already have access to this baby profile' });
    }

    res.status(500).json({ error: 'Failed to join baby profile', message: error.message });
  }
});

// Toggle join code enabled/disabled (admin only)
router.put('/:id/toggle-join-code', authenticate, checkBabyProfileAccess(['admin'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get the current baby profile
    const babyProfile = await BabyProfile.findById(id);

    if (!babyProfile) {
      return res.status(404).json({ error: 'Baby profile not found' });
    }

    // Toggle the join code enabled status
    babyProfile.joinCodeEnabled = !babyProfile.joinCodeEnabled;
    await babyProfile.save();

    res.json({
      success: true,
      profile: {
        id: babyProfile._id,
        name: babyProfile.name,
        birthDate: babyProfile.birthDate,
        joinCode: babyProfile.joinCode,
        joinCodeEnabled: babyProfile.joinCodeEnabled,
        role: req.userRole.role,
        createdAt: babyProfile.createdAt,
        updatedAt: babyProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error toggling join code:', error);
    res.status(500).json({ error: 'Failed to toggle join code', message: error.message });
  }
});

// Leave a baby profile (remove user's access)
router.post('/:id/leave', authenticate, checkBabyProfileAccess(['admin', 'editor', 'viewer'], 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Prevent admins from leaving (they should delete the profile instead)
    if (req.userRole.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot leave a profile. Please delete the profile instead.' });
    }

    // Remove the user-baby-role relationship
    await UserBabyRole.deleteOne({
      userId,
      babyProfileId: id,
    });

    res.json({
      success: true,
      message: 'Successfully left baby profile',
    });
  } catch (error) {
    console.error('Error leaving baby profile:', error);
    res.status(500).json({ error: 'Failed to leave baby profile', message: error.message });
  }
});

export default router;


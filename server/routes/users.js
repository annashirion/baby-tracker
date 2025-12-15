import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import UserBabyRole from '../models/UserBabyRole.js';
import { authenticate, checkBabyProfileAccess } from '../middleware/auth.js';

const router = express.Router();

// Get users for a specific baby profile (only admins can access)
router.get('/', authenticate, checkBabyProfileAccess(['admin'], 'query'), async (req, res) => {
  try {
    const { babyProfileId } = req.userRole;

    // Convert to ObjectId for proper querying
    let babyProfileIdObj;
    try {
      babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid babyProfileId format' 
      });
    }

    const userRoles = await UserBabyRole.find({ 
      babyProfileId: babyProfileIdObj 
    })
      .populate('userId')
      .sort({ createdAt: -1 });

    // Filter out any roles where the user was deleted (null)
    // Note: babyProfileId is NOT populated, so it's an ObjectId directly
    // The query above should already filter correctly, but we add an extra safety check
    const users = userRoles
      .filter(role => {
        // Ensure user exists
        if (!role.userId) {
          return false;
        }
        // Extra safety: Verify the role belongs to the requested baby profile
        // Since babyProfileId is not populated, it's an ObjectId
        const roleBabyProfileId = role.babyProfileId?.toString();
        const requestedBabyProfileId = babyProfileIdObj.toString();
        if (roleBabyProfileId && roleBabyProfileId !== requestedBabyProfileId) {
          return false;
        }
        return true;
      })
      .map(role => ({
        id: role.userId._id,
        googleId: role.userId.googleId,
        email: role.userId.email,
        name: role.userId.name,
        emoji: role.userId.emoji,
        givenName: role.userId.givenName,
        familyName: role.userId.familyName,
        role: role.role,
        blocked: role.blocked || false,
        joinedAt: role.createdAt,
        createdAt: role.userId.createdAt,
        updatedAt: role.userId.updatedAt,
      }));

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
});

// Update a user's role in a baby profile (only admins can do this)
router.put('/role', authenticate, checkBabyProfileAccess(['admin'], 'body'), async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;
    const { userId, babyProfileId } = req.userRole;

    if (!targetUserId || !newRole) {
      return res.status(400).json({ 
        error: 'targetUserId and newRole are required' 
      });
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(newRole)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be admin, editor, or viewer' 
      });
    }

    // Convert to ObjectId for proper querying
    let targetUserIdObj, babyProfileIdObj;
    try {
      babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
      targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid targetUserId format' 
      });
    }

    // Prevent admins from changing their own role
    if (userId === targetUserId) {
      return res.status(400).json({ 
        error: 'You cannot change your own role' 
      });
    }

    // Check if the target user has a role in this baby profile
    const targetUserRole = await UserBabyRole.findOne({
      userId: targetUserIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (!targetUserRole) {
      return res.status(404).json({ 
        error: 'User is not part of this baby profile' 
      });
    }

    // Update the role
    targetUserRole.role = newRole;
    await targetUserRole.save();

    res.json({
      success: true,
      message: 'User role updated successfully',
      userRole: {
        userId: targetUserId,
        babyProfileId,
        role: targetUserRole.role,
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role', message: error.message });
  }
});

// Remove a user from a baby profile (only admins can do this)
router.delete('/', authenticate, checkBabyProfileAccess(['admin'], 'body'), async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const { userId, babyProfileId } = req.userRole;

    if (!targetUserId) {
      return res.status(400).json({ 
        error: 'targetUserId is required' 
      });
    }

    // Convert to ObjectId for proper querying
    let babyProfileIdObj, targetUserIdObj;
    try {
      babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
      targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid targetUserId format' 
      });
    }

    // Prevent admins from removing themselves
    if (userId === targetUserId) {
      return res.status(400).json({ 
        error: 'You cannot remove yourself from the baby profile' 
      });
    }

    // Check if the target user has a role in this baby profile
    const targetUserRole = await UserBabyRole.findOne({
      userId: targetUserIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (!targetUserRole) {
      return res.status(404).json({ 
        error: 'User is not part of this baby profile' 
      });
    }

    // Delete the UserBabyRole (remove user from baby profile)
    await UserBabyRole.deleteOne({
      userId: targetUserIdObj,
      babyProfileId: babyProfileIdObj,
    });

    res.json({
      success: true,
      message: 'User removed from baby profile successfully',
    });
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ error: 'Failed to remove user', message: error.message });
  }
});

// Get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        emoji: user.emoji,
        givenName: user.givenName,
        familyName: user.familyName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user', message: error.message });
  }
});

// Block or unblock a user from a baby profile (only admins can do this)
router.put('/block', authenticate, checkBabyProfileAccess(['admin'], 'body'), async (req, res) => {
  try {
    const { targetUserId, blocked } = req.body;
    const { userId, babyProfileId } = req.userRole;

    if (!targetUserId || typeof blocked !== 'boolean') {
      return res.status(400).json({ 
        error: 'targetUserId and blocked (boolean) are required' 
      });
    }

    // Convert to ObjectId for proper querying
    let babyProfileIdObj, targetUserIdObj;
    try {
      babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
      targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid targetUserId format' 
      });
    }

    // Prevent admins from blocking themselves
    if (userId === targetUserId) {
      return res.status(400).json({ 
        error: 'You cannot block yourself' 
      });
    }

    // Check if the target user has a role in this baby profile
    let targetUserRole = await UserBabyRole.findOne({
      userId: targetUserIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (blocked) {
      // Blocking: Create or update to set blocked=true
      if (!targetUserRole) {
        // If blocking a user who doesn't have a role, create one with blocked=true
        // This prevents them from joining in the future
        targetUserRole = await UserBabyRole.create({
          userId: targetUserIdObj,
          babyProfileId: babyProfileIdObj,
          role: 'viewer', // Default role, but they're blocked so it doesn't matter
          blocked: true,
        });
      } else {
        // Update existing role to set blocked=true
        targetUserRole.blocked = true;
        await targetUserRole.save();
      }
    } else {
      // Unblocking: Remove the blocked status
      if (!targetUserRole) {
        return res.status(404).json({ 
          error: 'User is not blocked for this baby profile' 
        });
      }
      if (!targetUserRole.blocked) {
        return res.status(400).json({ 
          error: 'User is not blocked' 
        });
      }
      // Remove the blocked status
      targetUserRole.blocked = false;
      await targetUserRole.save();
    }

    res.json({
      success: true,
      message: blocked ? 'User blocked successfully' : 'User unblocked successfully',
      userRole: {
        userId: targetUserId,
        babyProfileId,
        role: targetUserRole.role,
        blocked: targetUserRole.blocked,
      },
    });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({ error: 'Failed to block/unblock user', message: error.message });
  }
});

// Update user emoji (users can only update their own emoji)
router.put('/:id/emoji', authenticate, async (req, res) => {
  try {
    const { emoji } = req.body;
    const { id } = req.params;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Validate emoji (basic check - should be a single emoji character)
    if (emoji.length === 0 || emoji.length > 10) {
      return res.status(400).json({ error: 'Invalid emoji format' });
    }

    // Users can only update their own emoji
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'You can only update your own emoji' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.emoji = emoji;
    await user.save();

    res.json({
      success: true,
      message: 'Emoji updated successfully',
      user: {
        id: user._id,
        emoji: user.emoji,
      },
    });
  } catch (error) {
    console.error('Error updating emoji:', error);
    res.status(500).json({ error: 'Failed to update emoji', message: error.message });
  }
});

export default router;


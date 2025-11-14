import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import UserBabyRole from '../models/UserBabyRole.js';

const router = express.Router();

// Get users for a specific baby profile (only admins can access)
router.get('/', async (req, res) => {
  try {
    const { userId, babyProfileId } = req.query;

    if (!userId || !babyProfileId) {
      return res.status(400).json({ 
        error: 'userId and babyProfileId are required' 
      });
    }

    // Convert to ObjectId for proper querying
    let userIdObj, babyProfileIdObj;
    try {
      userIdObj = new mongoose.Types.ObjectId(userId);
      babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid userId or babyProfileId format' 
      });
    }

    // Check if the requesting user is an admin of this baby profile
    const userRole = await UserBabyRole.findOne({
      userId: userIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (!userRole || userRole.role !== 'admin') {
      return res.status(403).json({ 
        error: 'You do not have access to this baby profile' 
      });
    }

    const userRoles = await UserBabyRole.find({ 
      babyProfileId: babyProfileIdObj 
    })
      .populate('userId')
      .sort({ createdAt: -1 });

    // Debug: Log the query results to verify filtering
    console.log(`[DEBUG] Querying users for babyProfileId: ${babyProfileIdObj.toString()}`);
    console.log(`[DEBUG] Found ${userRoles.length} user roles for this profile`);
    
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
          console.error(`[ERROR] Role ${role._id} has mismatched babyProfileId: ${roleBabyProfileId} vs ${requestedBabyProfileId}`);
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
router.put('/role', async (req, res) => {
  try {
    const { userId, babyProfileId, targetUserId, newRole } = req.body;

    if (!userId || !babyProfileId || !targetUserId || !newRole) {
      return res.status(400).json({ 
        error: 'userId, babyProfileId, targetUserId, and newRole are required' 
      });
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(newRole)) {
      return res.status(400).json({ 
        error: 'Invalid role. Must be admin, editor, or viewer' 
      });
    }

    // Convert to ObjectId for proper querying
    let userIdObj, babyProfileIdObj, targetUserIdObj;
    try {
      userIdObj = new mongoose.Types.ObjectId(userId);
      babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
      targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid userId, babyProfileId, or targetUserId format' 
      });
    }

    // Check if the requesting user is an admin of this baby profile
    const adminRole = await UserBabyRole.findOne({
      userId: userIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (!adminRole) {
      return res.status(403).json({ 
        error: 'You do not have access to this baby profile' 
      });
    }

    if (adminRole.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only admins can change user roles' 
      });
    }

    // Prevent admins from changing their own role
    if (userIdObj.toString() === targetUserIdObj.toString()) {
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
router.delete('/', async (req, res) => {
  try {
    const { userId, babyProfileId, targetUserId } = req.body;

    if (!userId || !babyProfileId || !targetUserId) {
      return res.status(400).json({ 
        error: 'userId, babyProfileId, and targetUserId are required' 
      });
    }

    // Convert to ObjectId for proper querying
    let userIdObj, babyProfileIdObj, targetUserIdObj;
    try {
      userIdObj = new mongoose.Types.ObjectId(userId);
      babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
      targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid userId, babyProfileId, or targetUserId format' 
      });
    }

    // Check if the requesting user is an admin of this baby profile
    const adminRole = await UserBabyRole.findOne({
      userId: userIdObj,
      babyProfileId: babyProfileIdObj,
    });

    if (!adminRole) {
      return res.status(403).json({ 
        error: 'You do not have access to this baby profile' 
      });
    }

    if (adminRole.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only admins can remove users' 
      });
    }

    // Prevent admins from removing themselves
    if (userIdObj.toString() === targetUserIdObj.toString()) {
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

// Update user emoji
router.put('/:id/emoji', async (req, res) => {
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


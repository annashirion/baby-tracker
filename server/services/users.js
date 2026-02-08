import mongoose from 'mongoose';
import User from '../models/User.js';
import UserBabyRole from '../models/UserBabyRole.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../errors.js';

export async function getUsersForBabyProfile(babyProfileId) {
  let babyProfileIdObj;
  try {
    babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
  } catch {
    throw new BadRequestError('Invalid babyProfileId format');
  }

  const userRoles = await UserBabyRole.find({ babyProfileId: babyProfileIdObj })
    .populate('userId')
    .sort({ createdAt: -1 });

  const users = userRoles
    .filter((role) => {
      if (!role.userId) return false;
      const roleBabyProfileId = role.babyProfileId?.toString();
      const requestedId = babyProfileIdObj.toString();
      if (roleBabyProfileId && roleBabyProfileId !== requestedId) return false;
      return true;
    })
    .map((role) => ({
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

  return { users, count: users.length };
}

export async function updateUserRole({
  userId,
  babyProfileId,
  targetUserId,
  newRole,
}) {
  if (!targetUserId || !newRole) {
    throw new BadRequestError('targetUserId and newRole are required');
  }
  if (!['admin', 'editor', 'viewer'].includes(newRole)) {
    throw new BadRequestError('Invalid role. Must be admin, editor, or viewer');
  }
  if (userId === targetUserId) {
    throw new BadRequestError('You cannot change your own role');
  }

  let babyProfileIdObj, targetUserIdObj;
  try {
    babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
    targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
  } catch {
    throw new BadRequestError('Invalid targetUserId format');
  }

  const targetUserRole = await UserBabyRole.findOne({
    userId: targetUserIdObj,
    babyProfileId: babyProfileIdObj,
  });

  if (!targetUserRole) {
    throw new NotFoundError('User is not part of this baby profile');
  }

  targetUserRole.role = newRole;
  await targetUserRole.save();

  return {
    message: 'User role updated successfully',
    userRole: { userId: targetUserId, babyProfileId, role: targetUserRole.role },
  };
}

export async function removeUserFromBabyProfile({
  userId,
  babyProfileId,
  targetUserId,
}) {
  if (!targetUserId) {
    throw new BadRequestError('targetUserId is required');
  }
  if (userId === targetUserId) {
    throw new BadRequestError(
      'You cannot remove yourself from the baby profile'
    );
  }

  let babyProfileIdObj, targetUserIdObj;
  try {
    babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
    targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
  } catch {
    throw new BadRequestError('Invalid targetUserId format');
  }

  const targetUserRole = await UserBabyRole.findOne({
    userId: targetUserIdObj,
    babyProfileId: babyProfileIdObj,
  });

  if (!targetUserRole) {
    throw new NotFoundError('User is not part of this baby profile');
  }

  await UserBabyRole.deleteOne({
    userId: targetUserIdObj,
    babyProfileId: babyProfileIdObj,
  });

  return { message: 'User removed from baby profile successfully' };
}

export async function getUserById(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return {
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
  };
}

export async function blockUnblockUser({
  userId,
  babyProfileId,
  targetUserId,
  blocked,
}) {
  if (!targetUserId || typeof blocked !== 'boolean') {
    throw new BadRequestError(
      'targetUserId and blocked (boolean) are required'
    );
  }
  if (userId === targetUserId) {
    throw new BadRequestError('You cannot block yourself');
  }

  let babyProfileIdObj, targetUserIdObj;
  try {
    babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
    targetUserIdObj = new mongoose.Types.ObjectId(targetUserId);
  } catch {
    throw new BadRequestError('Invalid targetUserId format');
  }

  let targetUserRole = await UserBabyRole.findOne({
    userId: targetUserIdObj,
    babyProfileId: babyProfileIdObj,
  });

  if (blocked) {
    if (!targetUserRole) {
      targetUserRole = await UserBabyRole.create({
        userId: targetUserIdObj,
        babyProfileId: babyProfileIdObj,
        role: 'viewer',
        blocked: true,
      });
    } else {
      targetUserRole.blocked = true;
      await targetUserRole.save();
    }
  } else {
    if (!targetUserRole) {
      throw new NotFoundError('User is not blocked for this baby profile');
    }
    if (!targetUserRole.blocked) {
      throw new BadRequestError('User is not blocked');
    }
    targetUserRole.blocked = false;
    await targetUserRole.save();
  }

  return {
    message: blocked ? 'User blocked successfully' : 'User unblocked successfully',
    userRole: {
      userId: targetUserId,
      babyProfileId,
      role: targetUserRole.role,
      blocked: targetUserRole.blocked,
    },
  };
}

export async function updateUserEmoji({ userId, targetUserId, emoji }) {
  if (!emoji) {
    throw new BadRequestError('Emoji is required');
  }
  if (emoji.length === 0 || emoji.length > 10) {
    throw new BadRequestError('Invalid emoji format');
  }
  if (userId !== targetUserId) {
    throw new ForbiddenError('You can only update your own emoji');
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.emoji = emoji;
  await user.save();

  return {
    message: 'Emoji updated successfully',
    user: { id: user._id, emoji: user.emoji },
  };
}

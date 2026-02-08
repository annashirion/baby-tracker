import mongoose from 'mongoose';
import Action from '../models/Action.js';
import UserBabyRole from '../models/UserBabyRole.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors.js';

function toActionDto(action) {
  return {
    id: action._id,
    babyProfileId: action.babyProfileId,
    userId: action.userId,
    actionType: action.actionType,
    details: action.details,
    userEmoji: action.userEmoji,
    createdAt: action.createdAt,
    updatedAt: action.updatedAt,
  };
}

export async function createAction({ babyProfileId, userId, actionType, details, userEmoji, timestamp }) {
  if (!actionType) {
    throw new BadRequestError('actionType is required');
  }

  let action;
  if (timestamp) {
    const customTimestamp = new Date(timestamp);
    action = new Action({
      babyProfileId,
      userId,
      actionType,
      details: details || {},
      userEmoji: userEmoji || null,
      createdAt: customTimestamp,
      updatedAt: customTimestamp,
    });
    await action.save();
  } else {
    action = await Action.create({
      babyProfileId,
      userId,
      actionType,
      details: details || {},
      userEmoji: userEmoji || null,
    });
  }

  return { action: toActionDto(action) };
}

export async function getActions({ babyProfileId, startDate, endDate }) {
  const query = { babyProfileId };
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const actions = await Action.find(query)
    .sort({ createdAt: -1 })
    .populate('userId', 'name email emoji')
    .lean();

  return {
    actions: actions.map((a) => ({
      id: a._id,
      babyProfileId: a.babyProfileId,
      userId: a.userId,
      actionType: a.actionType,
      details: a.details,
      userEmoji: a.userEmoji,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  };
}

export async function updateAction({ actionId, userId, details }) {
  const action = await Action.findById(actionId);
  if (!action) {
    throw new NotFoundError('Action not found');
  }

  const babyProfileId = action.babyProfileId.toString();
  const userIdObj = new mongoose.Types.ObjectId(userId);
  const babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);

  const userRole = await UserBabyRole.findOne({
    userId: userIdObj,
    babyProfileId: babyProfileIdObj,
  });

  if (!userRole || userRole.blocked) {
    throw new ForbiddenError('You do not have access to this baby profile');
  }

  const isOwnAction = action.userId.toString() === userId;
  const canEdit = userRole.role === 'admin' || (userRole.role === 'editor' && isOwnAction);
  if (!canEdit) {
    throw new ForbiddenError('You do not have permission to edit this action');
  }

  const updatedAction = await Action.findByIdAndUpdate(
    actionId,
    { details: details || {}, $set: { updatedAt: new Date() } },
    { new: true }
  );

  return { action: toActionDto(updatedAction) };
}

export async function deleteAction({ actionId, userId }) {
  const action = await Action.findById(actionId);
  if (!action) {
    throw new NotFoundError('Action not found');
  }

  const babyProfileId = action.babyProfileId.toString();
  const userIdObj = new mongoose.Types.ObjectId(userId);
  const babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);

  const userRole = await UserBabyRole.findOne({
    userId: userIdObj,
    babyProfileId: babyProfileIdObj,
  });

  if (!userRole || userRole.blocked) {
    throw new ForbiddenError('You do not have access to this baby profile');
  }

  if (userRole.role !== 'admin') {
    throw new ForbiddenError('Only admins can delete actions');
  }

  await Action.findByIdAndDelete(actionId);
  return { message: 'Action deleted successfully' };
}

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

/** Event time for logic: feed/sleep use startTime, diaper/other use timestamp. Never use createdAt/updatedAt for logic. */
function getEventTime(action) {
  const d = action.details || {};
  return d.startTime || d.timestamp || null;
}

export async function createAction({ babyProfileId, userId, actionType, details, userEmoji, timestamp }) {
  if (!actionType) {
    throw new BadRequestError('actionType is required');
  }

  const mergedDetails = { ...(details || {}) };
  if (timestamp != null) {
    mergedDetails.timestamp = timestamp;
  }

  const action = await Action.create({
    babyProfileId,
    userId,
    actionType,
    details: mergedDetails,
    userEmoji: userEmoji || null,
  });

  return { action: toActionDto(action) };
}

export async function getActions({ babyProfileId, startDate, endDate }) {
  const actions = await Action.find({ babyProfileId })
    .populate('userId', 'name email emoji')
    .lean();

  // Filter and sort by event time only (never createdAt/updatedAt)
  let list = actions.map((a) => ({
    id: a._id,
    babyProfileId: a.babyProfileId,
    userId: a.userId,
    actionType: a.actionType,
    details: a.details,
    userEmoji: a.userEmoji,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  if (start || end) {
    list = list.filter((a) => {
      const et = getEventTime(a);
      if (!et) return false;
      const t = new Date(et);
      if (start && t < start) return false;
      if (end && t > end) return false;
      return true;
    });
  }

  list.sort((a, b) => {
    const ta = getEventTime(a);
    const tb = getEventTime(b);
    const timeA = ta ? new Date(ta).getTime() : 0;
    const timeB = tb ? new Date(tb).getTime() : 0;
    return timeB - timeA; // descending (newest first)
  });

  return { actions: list };
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

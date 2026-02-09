import BabyProfile from '../models/BabyProfile.js';
import UserBabyRole from '../models/UserBabyRole.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
} from '../errors.js';

const RATE_LIMIT_WAIT_MS = 3000;
const failedJoinAttempts = new Map();

function toProfileDto(profile, role, joinedAt = null) {
  const base = {
    id: profile._id,
    name: profile.name,
    birthDate: profile.birthDate,
    joinCode: profile.joinCode,
    joinCodeEnabled: profile.joinCodeEnabled !== false,
    role: role ?? undefined,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
  if (joinedAt !== undefined && joinedAt !== null) base.joinedAt = joinedAt;
  return base;
}

export async function getProfilesForUser(userId) {
  const userRoles = await UserBabyRole.find({ userId }).populate('babyProfileId');
  const profiles = userRoles
    .filter((role) => role.babyProfileId !== null && !role.blocked)
    .map((role) =>
      toProfileDto(role.babyProfileId, role.role, role.createdAt)
    );
  return { profiles };
}

export async function createProfile({ userId, name, birthDate }) {
  if (!name) {
    throw new BadRequestError('name is required');
  }

  const babyProfile = await BabyProfile.create({
    name,
    birthDate: birthDate ? new Date(birthDate) : null,
  });

  const userRole = await UserBabyRole.create({
    userId,
    babyProfileId: babyProfile._id,
    role: 'admin',
  });

  return {
    profile: toProfileDto(babyProfile, 'admin', userRole.createdAt),
  };
}

export async function updateProfile({ profileId, name, birthDate, joinCodeEnabled }) {
  const update = {};
  if (name !== undefined) update.name = name;
  if (birthDate !== undefined) update.birthDate = birthDate ? new Date(birthDate) : null;
  if (joinCodeEnabled !== undefined) update.joinCodeEnabled = joinCodeEnabled;

  const babyProfile = await BabyProfile.findByIdAndUpdate(
    profileId,
    update,
    { new: true, runValidators: true }
  );

  if (!babyProfile) {
    throw new NotFoundError('Baby profile not found');
  }

  return {
    profile: toProfileDto(babyProfile),
  };
}

export async function deleteProfile(profileId) {
  await UserBabyRole.deleteMany({ babyProfileId: profileId });
  const babyProfile = await BabyProfile.findByIdAndDelete(profileId);

  if (!babyProfile) {
    throw new NotFoundError('Baby profile not found');
  }

  return { message: 'Baby profile deleted successfully' };
}

export async function joinByCode({ userId, joinCode }) {
  if (!joinCode) {
    throw new BadRequestError('joinCode is required');
  }

  const userIdStr = String(userId);

  const lastFailedAttempt = failedJoinAttempts.get(userIdStr);
  if (lastFailedAttempt && Date.now() - lastFailedAttempt < RATE_LIMIT_WAIT_MS) {
    throw new TooManyRequestsError(
      'You must wait 3 seconds before attempting to join again'
    );
  }
  if (lastFailedAttempt && Date.now() - lastFailedAttempt >= RATE_LIMIT_WAIT_MS) {
    failedJoinAttempts.delete(userIdStr);
  }

  const babyProfile = await BabyProfile.findOne({
    joinCode: joinCode.toUpperCase(),
  });

  if (!babyProfile) {
    failedJoinAttempts.set(userIdStr, Date.now());
    throw new NotFoundError('Baby profile not found with this join code');
  }

  if (babyProfile.joinCodeEnabled === false) {
    failedJoinAttempts.set(userIdStr, Date.now());
    throw new ForbiddenError('Join code is disabled for this baby profile');
  }

  const existingRole = await UserBabyRole.findOne({
    userId: userIdStr,
    babyProfileId: babyProfile._id,
  });

  if (existingRole) {
    if (existingRole.blocked) {
      throw new ForbiddenError(
        'You have been blocked from accessing this baby profile'
      );
    }
    const err = new BadRequestError('You already have access to this baby profile');
    err.profile = {
      id: babyProfile._id,
      name: babyProfile.name,
      role: existingRole.role,
    };
    throw err;
  }

  const userRole = await UserBabyRole.create({
    userId: userIdStr,
    babyProfileId: babyProfile._id,
    role: 'viewer',
  });

  if (failedJoinAttempts.has(userIdStr)) failedJoinAttempts.delete(userIdStr);

  return {
    profile: toProfileDto(babyProfile, 'viewer', userRole.createdAt),
  };
}

export async function toggleJoinCode(profileId) {
  const babyProfile = await BabyProfile.findById(profileId);
  if (!babyProfile) {
    throw new NotFoundError('Baby profile not found');
  }

  babyProfile.joinCodeEnabled = !babyProfile.joinCodeEnabled;
  await babyProfile.save();

  return { profile: toProfileDto(babyProfile) };
}

export async function leaveProfile({ profileId, userId, userRole }) {
  if (userRole === 'admin') {
    throw new ForbiddenError(
      'Admins cannot leave a profile. Please delete the profile instead.'
    );
  }

  await UserBabyRole.deleteOne({ userId, babyProfileId: profileId });
  return { message: 'Successfully left baby profile' };
}

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRandomEmoji } from '../constants/emojis.js';
import { AppError, BadRequestError, UnauthorizedError } from '../errors.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Verify Google access token, fetch user info, and create or update user.
 * Returns { token, user } or throws.
 */
export async function verifyGoogleTokenAndGetOrCreateUser(accessToken) {
  if (!accessToken) {
    throw new BadRequestError('Access token is required');
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google API error:', response.status, errorText);
    throw new UnauthorizedError(
      `Failed to fetch user info from Google: ${response.status} - ${errorText}`
    );
  }

  const googleUser = await response.json();
  const { id: googleId, email, name, given_name, family_name } = googleUser;

  if (!googleId || !email) {
    throw new AppError('Authentication failed', 500);
  }

  let user = await User.findOne({ googleId });

  if (user) {
    user.email = email;
    user.name = name;
    if (!user.emoji) user.emoji = getRandomEmoji();
    user.givenName = given_name;
    user.familyName = family_name;
    await user.save();
  } else {
    user = await User.create({
      googleId,
      email,
      name,
      emoji: getRandomEmoji(),
      givenName: given_name,
      familyName: family_name,
    });
  }

  const token = jwt.sign(
    { userId: user._id.toString() },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      emoji: user.emoji,
      googleId: user.googleId,
    },
  };
}

export function getJwtExpiresIn() {
  return JWT_EXPIRES_IN;
}

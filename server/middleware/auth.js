import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import UserBabyRole from '../models/UserBabyRole.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      emoji: user.emoji,
      googleId: user.googleId,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Middleware to check if user has access to a baby profile
 * Requires authenticate middleware to be called first
 * Resolves babyProfileId from params (id or babyProfileId), query, or body.
 * @param {string[]} allowedRoles - Array of roles that are allowed (e.g., ['admin', 'editor'])
 */
export const checkBabyProfileAccess = (allowedRoles = ['admin', 'editor', 'viewer']) => {
  return async (req, res, next) => {
    try {
      const babyProfileId =
        req.params.id ??
        req.params.babyProfileId ??
        req.query.babyProfileId ??
        req.body?.babyProfileId;

      if (!babyProfileId) {
        return res.status(400).json({ error: 'babyProfileId is required' });
      }

      // Ensure user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Convert to ObjectId
      let userIdObj, babyProfileIdObj;
      try {
        userIdObj = new mongoose.Types.ObjectId(req.user.id);
        babyProfileIdObj = new mongoose.Types.ObjectId(babyProfileId);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid babyProfileId format' });
      }

      // Check user's role for this baby profile
      const userRole = await UserBabyRole.findOne({
        userId: userIdObj,
        babyProfileId: babyProfileIdObj,
      });

      if (!userRole) {
        return res.status(403).json({ error: 'You do not have access to this baby profile' });
      }

      if (userRole.blocked) {
        return res.status(403).json({ error: 'You have been blocked from accessing this baby profile' });
      }

      if (!allowedRoles.includes(userRole.role)) {
        return res.status(403).json({ 
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
        });
      }

      // Attach role info to request for use in route handlers
      req.userRole = {
        role: userRole.role,
        userId: req.user.id,
        babyProfileId: babyProfileIdObj.toString(),
      };

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Failed to verify access' });
    }
  };
};

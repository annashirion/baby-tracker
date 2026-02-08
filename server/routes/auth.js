import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as authService from '../services/auth.js';
import { AppError } from '../errors.js';

const router = express.Router();

function sendError(res, error) {
  // Custom 401 when Google token is invalid/expired
  if (error.message && error.message.includes('Failed to fetch user info')) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      details:
        'Could not fetch user info from Google. The access token may be invalid or expired.',
    });
  }
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const body = { error: error.message };
  if (statusCode === 500) {
    body.message = error.message;
    if (error.name === 'MongoServerError' || error.message.includes('Mongo')) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to save user to database. Make sure MongoDB is running.',
        details: error.message,
      });
    }
    body.details = error.stack;
  }
  res.status(statusCode).json(body);
}

// Verify Google token and create/update user
router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;
    const result = await authService.verifyGoogleTokenAndGetOrCreateUser(access_token);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Auth error:', error.message);
    sendError(res, error);
  }
});

// Get current user from cookie
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout - no server-side action needed (client removes token)
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;

import express from 'express';
import User from '../models/User.js';
import { getRandomEmoji } from '../constants/emojis.js';

const router = express.Router();

// Verify Google token and create/update user
router.post('/google', async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Fetch user info from Google using the access token
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', response.status, errorText);
      throw new Error(`Failed to fetch user info from Google: ${response.status} - ${errorText}`);
    }

    const googleUser = await response.json();
    const { id: googleId, email, name, given_name, family_name } = googleUser;

    if (!googleId || !email) {
      throw new Error('Invalid user data from Google: missing id or email');
    }

    // Find or create user
    let user = await User.findOne({ googleId });

    if (user) {
      // Update existing user (keep existing emoji if they have one, otherwise generate new)
      user.email = email;
      user.name = name;
      if (!user.emoji) {
        user.emoji = getRandomEmoji();
      }
      user.givenName = given_name;
      user.familyName = family_name;
      await user.save();
    } else {
      // Create new user with random emoji
      user = await User.create({
        googleId,
        email,
        name,
        emoji: getRandomEmoji(),
        givenName: given_name,
        familyName: family_name,
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        emoji: user.emoji,
        googleId: user.googleId,
      },
    });
  } catch (error) {
    console.error('Auth error:', error.message);
    
    // Handle token verification errors
    if (error.message.includes('Failed to fetch user info')) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        details: 'Could not fetch user info from Google. The access token may be invalid or expired.'
      });
    }

    // Handle MongoDB errors
    if (error.name === 'MongoServerError' || error.message.includes('Mongo')) {
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Failed to save user to database. Make sure MongoDB is running.',
        details: error.message
      });
    }

    res.status(500).json({ 
      error: 'Authentication failed', 
      message: error.message,
      details: error.stack
    });
  }
});

export default router;


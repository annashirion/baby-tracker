import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// Get all users (for viewing database)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      users: users.map(user => ({
        id: user._id,
        googleId: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        givenName: user.givenName,
        familyName: user.familyName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
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
        picture: user.picture,
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

export default router;


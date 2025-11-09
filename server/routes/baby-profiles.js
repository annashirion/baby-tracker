import express from 'express';
import BabyProfile from '../models/BabyProfile.js';
import UserBabyRole from '../models/UserBabyRole.js';

const router = express.Router();

// Test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Baby profiles router is working!' });
});

// Get all baby profiles for a user (with their roles)
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Find all roles for this user
    const userRoles = await UserBabyRole.find({ userId }).populate('babyProfileId');

    // Filter out any roles where the baby profile was deleted (null)
    const profiles = userRoles
      .filter(role => role.babyProfileId !== null)
      .map(role => ({
        id: role.babyProfileId._id,
        name: role.babyProfileId.name,
        birthDate: role.babyProfileId.birthDate,
        gender: role.babyProfileId.gender,
        joinCode: role.babyProfileId.joinCode,
        role: role.role,
        createdAt: role.babyProfileId.createdAt,
        updatedAt: role.babyProfileId.updatedAt,
      }));

    res.json({
      success: true,
      profiles,
    });
  } catch (error) {
    console.error('Error fetching baby profiles:', error);
    res.status(500).json({ error: 'Failed to fetch baby profiles', message: error.message });
  }
});

// Create a new baby profile
router.post('/', async (req, res) => {
  try {
    const { userId, name, birthDate, gender } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'userId and name are required' });
    }

    // Create the baby profile
    const babyProfile = await BabyProfile.create({
      name,
      birthDate: birthDate ? new Date(birthDate) : null,
      gender: gender || null,
    });

    // Create the user-baby-role relationship (user becomes admin)
    await UserBabyRole.create({
      userId,
      babyProfileId: babyProfile._id,
      role: 'admin',
    });

    res.json({
      success: true,
      profile: {
        id: babyProfile._id,
        name: babyProfile.name,
        birthDate: babyProfile.birthDate,
        gender: babyProfile.gender,
        joinCode: babyProfile.joinCode,
        role: 'admin',
        createdAt: babyProfile.createdAt,
        updatedAt: babyProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error creating baby profile:', error);
    res.status(500).json({ error: 'Failed to create baby profile', message: error.message });
  }
});

// Join a baby profile using join code
router.post('/join', async (req, res) => {
  try {
    const { userId, joinCode } = req.body;

    if (!userId || !joinCode) {
      return res.status(400).json({ error: 'userId and joinCode are required' });
    }

    // Find the baby profile by join code
    const babyProfile = await BabyProfile.findOne({ joinCode: joinCode.toUpperCase() });

    if (!babyProfile) {
      return res.status(404).json({ error: 'Baby profile not found with this join code' });
    }

    // Check if user already has a role for this profile
    const existingRole = await UserBabyRole.findOne({
      userId,
      babyProfileId: babyProfile._id,
    });

    if (existingRole) {
      return res.status(400).json({ 
        error: 'You already have access to this baby profile',
        profile: {
          id: babyProfile._id,
          name: babyProfile.name,
          role: existingRole.role,
        },
      });
    }

    // Create the user-baby-role relationship (user becomes viewer by default)
    const userRole = await UserBabyRole.create({
      userId,
      babyProfileId: babyProfile._id,
      role: 'viewer',
    });

    res.json({
      success: true,
      profile: {
        id: babyProfile._id,
        name: babyProfile.name,
        birthDate: babyProfile.birthDate,
        gender: babyProfile.gender,
        joinCode: babyProfile.joinCode,
        role: 'viewer',
        createdAt: babyProfile.createdAt,
        updatedAt: babyProfile.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error joining baby profile:', error);
    
    // Handle duplicate key error (shouldn't happen due to check above, but just in case)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You already have access to this baby profile' });
    }

    res.status(500).json({ error: 'Failed to join baby profile', message: error.message });
  }
});

export default router;


import mongoose from 'mongoose';

const userBabyRoleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  babyProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BabyProfile',
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'editor', 'viewer'],
    required: true,
    default: 'viewer',
  },
  blocked: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Ensure one role per user per baby profile
userBabyRoleSchema.index({ userId: 1, babyProfileId: 1 }, { unique: true });
// Index for listing roles by baby profile (e.g. GET /baby-profiles/:id/users)
userBabyRoleSchema.index({ babyProfileId: 1 });

const UserBabyRole = mongoose.model('UserBabyRole', userBabyRoleSchema);

export default UserBabyRole;


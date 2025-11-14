import mongoose from 'mongoose';

const actionSchema = new mongoose.Schema({
  babyProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BabyProfile',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  actionType: {
    type: String,
    required: true,
    enum: ['diaper', 'sleep', 'feed', 'other'],
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    // For diaper: { type: 'pee' | 'poo' | 'both', comments: string }
    // For other action types: flexible structure
  },
  userEmoji: {
    type: String,
    default: null,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

const Action = mongoose.model('Action', actionSchema);

export default Action;


import mongoose from 'mongoose';
import { ALLOWED_JOIN_CODE_CHARS } from '../constants/constants.js';

const babyProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  birthDate: {
    type: Date,
  },
  joinCode: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but enforces uniqueness for non-null values
  },
  joinCodeEnabled: {
    type: Boolean,
    default: true, // Enabled by default
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Generate a unique join code before saving
babyProfileSchema.pre('save', async function(next) {
  if (!this.joinCode) {
    // Generate a random 6-character alphanumeric code
    let code = '';
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += ALLOWED_JOIN_CODE_CHARS.charAt(Math.floor(Math.random() * ALLOWED_JOIN_CODE_CHARS.length));
      }
      
      const existing = await this.constructor.findOne({ joinCode: code });
      if (!existing) {
        isUnique = true;
      }
    }
    
    this.joinCode = code;
  }
  next();
});

const BabyProfile = mongoose.model('BabyProfile', babyProfileSchema);

export default BabyProfile;


import mongoose from 'mongoose';

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
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing characters
    let code = '';
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
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


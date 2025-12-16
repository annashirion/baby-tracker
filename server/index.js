import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import babyProfileRoutes from './routes/baby-profiles.js';
import actionRoutes from './routes/actions.js';
import { EMOJIS } from './constants/emojis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baby-tracker';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

// Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/baby-profiles', babyProfileRoutes);
app.use('/actions', actionRoutes);

// Health check
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    mongodb: mongoStatus
  });
});

// Get available emojis (no auth required, public endpoint)
app.get('/emojis', (req, res) => {
  res.json({
    success: true,
    emojis: EMOJIS
  });
});

// 404 handler for API routes (must be last)
app.use((req, res, next) => {
  // Check if it's an API route (not a static file)
  if (req.path.startsWith('/auth') || req.path.startsWith('/users') || 
      req.path.startsWith('/baby-profiles') || req.path.startsWith('/actions') ||
      req.path.startsWith('/health') || req.path.startsWith('/emojis')) {
    return res.status(404).json({ 
      error: 'Route not found', 
      path: req.originalUrl,
      method: req.method
    });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


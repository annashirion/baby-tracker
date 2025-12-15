import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '../routes/auth.js';
import userRoutes from '../routes/users.js';
import babyProfileRoutes from '../routes/baby-profiles.js';
import actionRoutes from '../routes/actions.js';

// Create a test Express app
export const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/baby-profiles', babyProfileRoutes);
  app.use('/api/actions', actionRoutes);
  return app;
};


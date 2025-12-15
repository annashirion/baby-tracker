import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
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

// Helper function to generate auth token for testing
export const generateAuthToken = (userId) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
  return jwt.sign({ userId: userId.toString() }, JWT_SECRET);
};

// Helper function to create authenticated request
export const authenticatedRequest = (request, app, method, path, userId, options = {}) => {
  const token = generateAuthToken(userId);
  const req = request(app)[method.toLowerCase()](path);
  req.set('Cookie', `token=${token}`);
  
  if (options.body) {
    req.send(options.body);
  }
  if (options.query) {
    req.query(options.query);
  }
  
  return req;
};


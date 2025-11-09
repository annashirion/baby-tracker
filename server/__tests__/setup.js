import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

// Setup before all tests
export const setupTestDB = async () => {
  try {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (error) {
    // Ignore errors - connection might not exist
    console.warn('Warning during connection cleanup:', error.message);
  }
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
};

// Cleanup after all tests
export const teardownTestDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  } catch (error) {
    // Ignore errors during cleanup - connection might already be closed
    console.warn('Warning during database cleanup:', error.message);
  }
  
  try {
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    // Ignore errors during server stop - might already be stopped
    console.warn('Warning during MongoDB server stop:', error.message);
  }
};

// Cleanup between tests
export const clearDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    // Ignore errors during cleanup - might be called when connection is closed
    console.warn('Warning during database clear:', error.message);
  }
};


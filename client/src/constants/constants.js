// App-wide constants

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Join code allowed characters (excluding confusing characters like I, O, 0, 1)
export const ALLOWED_JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Action types dictionary
export const ACTION_TYPES = {
  DIAPER: 'diaper',
  SLEEP: 'sleep',
  FEED: 'feed',
  OTHER: 'other',
};

// Diaper types dictionary
export const DIAPER_TYPES = {
  PEE: 'pee',
  POO: 'poo',
};


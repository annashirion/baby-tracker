import { API_URL } from '../constants/constants';

const TOKEN_STORAGE_KEY = 'babyTracker_authToken';

/**
 * Get the stored authentication token
 */
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Store the authentication token
 */
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

/**
 * Remove the authentication token (logout)
 */
export const removeAuthToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

/**
 * Create fetch options with Authorization header
 * @param {Object} options - Additional fetch options
 * @returns {Object} Fetch options with Authorization header
 */
export const createAuthHeaders = (options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return {
    ...options,
    headers,
    credentials: 'include', // Keep for CORS, but token is in header
  };
};

/**
 * Make an authenticated API request
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const apiFetch = async (url, options = {}) => {
  const authOptions = createAuthHeaders(options);
  return fetch(url, authOptions);
};


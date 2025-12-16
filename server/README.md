# Baby Tracker - Server

Express.js backend API for the Baby Tracker project.

## 🛠️ Tech Stack

- **Express.js** 5.1.0
- **MongoDB** with Mongoose 8.19.3
- **Google Auth Library** - For OAuth authentication
- **JWT** - For session management
- **Jest** - For testing

## 📦 Installation

```bash
npm install
```

## 🚀 Development

Start the development server with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:3001` (or the port specified in `PORT` environment variable).

## 🧪 Testing

Run tests:

```bash
npm test
```

## 📁 Project Structure

- `routes/` - API route handlers
  - `auth.js` - Authentication routes
  - `users.js` - User management routes
  - `baby-profiles.js` - Baby profile routes
  - `actions.js` - Action tracking routes
- `models/` - Mongoose data models
  - `User.js` - User model
  - `BabyProfile.js` - Baby profile model
  - `Action.js` - Action model
  - `UserBabyRole.js` - User-baby relationship model
- `middleware/` - Express middleware
  - `auth.js` - Authentication middleware
- `constants/` - Constants and configuration
  - `constants.js` - Application constants
  - `emojis.js` - Available emoji list
- `__tests__/` - Test files
### Authentication
- `POST /auth/google` - Google OAuth login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID

### Baby Profiles
- `GET /baby-profiles` - Get user's baby profiles
- `POST /baby-profiles` - Create baby profile
- `GET /baby-profiles/:id` - Get baby profile by ID
- `PUT /baby-profiles/:id` - Update baby profile
- `DELETE /baby-profiles/:id` - Delete baby profile

### Actions
- `GET /actions` - Get actions
- `POST /actions` - Create action
- `PUT /actions/:id` - Update action
- `DELETE /actions/:id` - Delete action

### Health & Utilities
- `GET /health` - Health check endpoint
- `GET /emojis` - Get available emojis

## 🗄️ Database Models

- **User**: Stores user information from Google OAuth
- **BabyProfile**: Stores baby profile information
- **Action**: Stores tracked actions (feeding, sleep, diaper, etc.)
- **UserBabyRole**: Manages relationships between users and baby profiles

## 🔒 Authentication

The server uses Google OAuth for authentication and JWT tokens for session management. Protected routes require a valid JWT token in cookies.


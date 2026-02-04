import 'dotenv/config';

export const config = {
  // Server
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // JWT
  JWT_SECRET:
    process.env.JWT_SECRET ||
    'JWT_SECRET_PLANORA_SECURE_KEY_CHANGE_IN_PRODUCTION',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/planora',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

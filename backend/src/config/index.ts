import 'dotenv';
export const config = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET:
    process.env.JWT_SECRET || 'JWT_SECRET_MOHAMMED_BEN_CHEIKH_YOUCODE',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/planora',
};

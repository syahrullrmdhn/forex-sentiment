import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'development-secret-change-me',
  dbClient: process.env.DB_CLIENT || 'better-sqlite3',
  dbFilename: process.env.DB_FILENAME || './data/forex-sentiment.sqlite',
  databaseUrl: process.env.DATABASE_URL || '',
  eodhdApiKey: process.env.EODHD_API_KEY || '',
  demoUsername: process.env.DEMO_USERNAME || 'demo',
  demoEmail: process.env.DEMO_EMAIL || 'demo@forex.local',
  demoPassword: process.env.DEMO_PASSWORD || 'demo123',
};

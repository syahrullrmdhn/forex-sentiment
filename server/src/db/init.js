import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';
import { db } from './connection.js';
import { upsertDemoUser } from './repositories/usersRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDirectory = path.resolve(__dirname, '../../migrations');

export async function runMigrations() {
  await db.migrate.latest({
    directory: migrationsDirectory,
    loadExtensions: ['.cjs'],
  });
}

export async function initializeDatabase() {
  await runMigrations();

  const passwordHash = await bcrypt.hash(env.demoPassword, 10);

  await upsertDemoUser({
    username: env.demoUsername,
    email: env.demoEmail,
    passwordHash,
  });
}

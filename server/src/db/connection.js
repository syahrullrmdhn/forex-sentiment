import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import knex from 'knex';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../..');

function isSqliteClient(client) {
  return client === 'better-sqlite3' || client === 'sqlite3';
}

function resolveSqliteFilename(filename) {
  const absoluteFilename = path.isAbsolute(filename)
    ? filename
    : path.resolve(serverRoot, filename);

  fs.mkdirSync(path.dirname(absoluteFilename), { recursive: true });

  return absoluteFilename;
}

function createKnexConfig() {
  if (isSqliteClient(env.dbClient)) {
    return {
      client: env.dbClient,
      connection: {
        filename: resolveSqliteFilename(env.dbFilename),
      },
      useNullAsDefault: true,
    };
  }

  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required when DB_CLIENT is not SQLite.');
  }

  return {
    client: env.dbClient,
    connection: env.databaseUrl,
  };
}

export const db = knex(createKnexConfig());

export async function closeDatabase() {
  await db.destroy();
}

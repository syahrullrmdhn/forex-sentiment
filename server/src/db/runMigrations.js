import { closeDatabase } from './connection.js';
import { runMigrations } from './init.js';

try {
  await runMigrations();
  console.log('Database migrations completed successfully.');
} catch (error) {
  console.error('Database migration failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { closeDatabase } from './db/connection.js';
import { initializeDatabase } from './db/init.js';
import { initializeMarketStore, startEodhdRefresh } from './data/marketStore.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { registerSocket } from './socket/registerSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api', dashboardRoutes);

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

async function bootstrap() {
  await initializeDatabase();
  await initializeMarketStore();

  registerSocket(server);
  startEodhdRefresh();

  server.listen(env.port, () => {
    console.log(`Forex Sentiment server running on http://localhost:${env.port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully.`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

bootstrap().catch(async (error) => {
  console.error('Server bootstrap failed.');
  console.error(error);
  await closeDatabase();
  process.exit(1);
});

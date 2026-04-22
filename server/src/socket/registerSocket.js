import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { getOverview, getPairs, onMarketUpdate, startMarketSimulation } from '../data/marketStore.js';
import { verifyToken } from '../lib/auth.js';

function resolvePair(candidate) {
  const pairs = getPairs().map((pair) => pair.value);
  return pairs.includes(candidate) ? candidate : pairs[0];
}

export function registerSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Missing auth token'));
    }

    try {
      const user = verifyToken(token);
      socket.data.user = user;
      return next();
    } catch {
      return next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', (socket) => {
    const initialPair = resolvePair(socket.handshake.auth?.pair);
    socket.data.pair = initialPair;
    socket.join(initialPair);
    socket.emit('market:bootstrap', getOverview(initialPair));

    socket.on('pair:subscribe', (candidate) => {
      const nextPair = resolvePair(candidate);

      if (socket.data.pair === nextPair) {
        return;
      }

      if (socket.data.pair) {
        socket.leave(socket.data.pair);
      }

      socket.data.pair = nextPair;
      socket.join(nextPair);
      socket.emit('market:bootstrap', getOverview(nextPair));
    });
  });

  onMarketUpdate((pair, payload) => {
    io.to(pair).emit('market:update', payload);
  });

  startMarketSimulation();

  return io;
}

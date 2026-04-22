import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findUserById, findUserByIdentifier } from '../db/repositories/usersRepository.js';

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
  };
}

export async function validateCredentials(identifier, password) {
  const user = await findUserByIdentifier(identifier);

  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(String(password || ''), user.passwordHash);

  return isValidPassword ? serializeUser(user) : null;
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
    },
    env.jwtSecret,
    { expiresIn: '12h' },
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export async function getUserById(id) {
  const user = await findUserById(id);
  return user ? serializeUser(user) : null;
}

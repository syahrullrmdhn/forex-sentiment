import { db } from '../connection.js';

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    passwordHash: user.password_hash,
    createdAt: user.created_at,
  };
}

export async function findUserByIdentifier(identifier) {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase();

  if (!normalizedIdentifier) {
    return null;
  }

  const user = await db('users')
    .whereRaw('LOWER(username) = ?', [normalizedIdentifier])
    .orWhereRaw('LOWER(email) = ?', [normalizedIdentifier])
    .first();

  return normalizeUser(user);
}

export async function findUserById(id) {
  const user = await db('users').where({ id }).first();
  return normalizeUser(user);
}

export async function upsertDemoUser({ username, email, passwordHash }) {
  const existingUser = await findUserByIdentifier(email);

  if (existingUser) {
    await db('users')
      .where({ id: existingUser.id })
      .update({ username, email, password_hash: passwordHash });

    return findUserById(existingUser.id);
  }

  await db('users').insert({
    username,
    email,
    password_hash: passwordHash,
  });

  return findUserByIdentifier(email);
}

import { db } from '../connection.js';

const TABLE_NAME = 'eodhd_cache';

export async function getCachedEodhd(pair) {
  const symbol = pairToSymbol(pair);
  const row = await db(TABLE_NAME)
    .where({ symbol })
    .andWhereRaw('cached_at > datetime("now", "-15 minutes")')
    .first();

  if (!row) return null;

  try {
    return {
      symbol: row.symbol,
      pair: row.pair,
      score: row.score,
      mood: row.mood,
      headlines: JSON.parse(row.headlines || '[]'),
      cachedAt: row.cached_at,
    };
  } catch {
    return null;
  }
}

export async function setCachedEodhd(pair, data) {
  const symbol = pairToSymbol(pair);
  const payload = {
    symbol,
    pair,
    score: data.score ?? 0,
    mood: data.mood ?? 'Balanced',
    headlines: JSON.stringify(data.headlines || []),
    cached_at: new Date().toISOString(),
  };

  const existing = await db(TABLE_NAME).where({ symbol }).first();
  if (existing) {
    await db(TABLE_NAME).where({ symbol }).update(payload);
  } else {
    await db(TABLE_NAME).insert(payload);
  }
}

export async function getApiCallCount() {
  const today = new Date().toISOString().slice(0, 10);
  const row = await db('api_call_counter').where({ date: today }).first();
  return row?.count || 0;
}

export async function incrementApiCallCount() {
  const today = new Date().toISOString().slice(0, 10);
  const row = await db('api_call_counter').where({ date: today }).first();
  if (row) {
    await db('api_call_counter').where({ date: today }).update({ count: row.count + 1 });
  } else {
    await db('api_call_counter').insert({ date: today, count: 1 });
  }
}

function pairToSymbol(pair) {
  // EUR/USD -> EURUSD
  return pair.replace('/', '');
}

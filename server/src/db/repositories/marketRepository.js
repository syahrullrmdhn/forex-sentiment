import { db } from '../connection.js';

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function seedPairData(seed, createHistory, createEvents) {
  const existingPrice = await db('prices').where({ pair: seed.pair }).first();

  if (!existingPrice) {
    const history = createHistory(seed).map((point) => ({
      pair: seed.pair,
      price: point.value,
      timestamp: point.time,
    }));

    await db('prices').insert(history);
  }

  const existingMyfxbook = await db('sentiments')
    .where({ pair: seed.pair, source: 'Myfxbook', type: 'retail_positioning' })
    .first();

  if (!existingMyfxbook) {
    await db('sentiments').insert({
      pair: seed.pair,
      source: 'Myfxbook',
      type: 'retail_positioning',
      long_pct: seed.myfxbookLong,
      short_pct: Number((100 - seed.myfxbookLong).toFixed(2)),
      score: null,
      headline: null,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  const existingFxssi = await db('sentiments')
    .where({ pair: seed.pair, source: 'FXSSI', type: 'retail_positioning' })
    .first();

  if (!existingFxssi) {
    await db('sentiments').insert({
      pair: seed.pair,
      source: 'FXSSI',
      type: 'retail_positioning',
      long_pct: seed.fxssiLong,
      short_pct: Number((100 - seed.fxssiLong).toFixed(2)),
      score: null,
      headline: null,
      timestamp: Math.floor(Date.now() / 1000),
    });
  }

  const existingNews = await db('sentiments')
    .where({ pair: seed.pair, source: 'EODHD', type: 'news_sentiment' })
    .first();

  if (!existingNews) {
    const events = createEvents(seed, seed.newsScore).map((event) => ({
      pair: seed.pair,
      source: 'EODHD',
      type: 'news_sentiment',
      long_pct: null,
      short_pct: null,
      score: seed.newsScore,
      headline: event.title,
      timestamp: event.time,
    }));

    await db('sentiments').insert(events);
  }
}

export async function loadPairState(seed) {
  const [priceRows, myfxbookRow, fxssiRow, newsRows] = await Promise.all([
    db('prices')
      .where({ pair: seed.pair })
      .orderBy('timestamp', 'desc')
      .limit(90),
    db('sentiments')
      .where({ pair: seed.pair, source: 'Myfxbook', type: 'retail_positioning' })
      .orderBy('timestamp', 'desc')
      .first(),
    db('sentiments')
      .where({ pair: seed.pair, source: 'FXSSI', type: 'retail_positioning' })
      .orderBy('timestamp', 'desc')
      .first(),
    db('sentiments')
      .where({ pair: seed.pair, source: 'EODHD', type: 'news_sentiment' })
      .orderBy('timestamp', 'desc')
      .limit(5),
  ]);

  const orderedPrices = [...priceRows].reverse().map((row) => ({
    time: toNumber(row.timestamp),
    value: toNumber(row.price),
  }));

  const orderedNews = [...newsRows]
    .map((row) => ({
      id: `${seed.pair.replace('/', '-')}-${row.id}`,
      time: toNumber(row.timestamp),
      title: row.headline || seed.newsPool[0],
      sentiment: toNumber(row.score) >= 0 ? 'positive' : 'negative',
    }))
    .sort((left, right) => right.time - left.time);

  const lastPriceTimestamp = orderedPrices[orderedPrices.length - 1]?.time || Math.floor(Date.now() / 1000);
  const lastMyfxbookTimestamp = toNumber(myfxbookRow?.timestamp, lastPriceTimestamp);
  const lastFxssiTimestamp = toNumber(fxssiRow?.timestamp, lastPriceTimestamp);
  const lastNewsTimestamp = toNumber(newsRows[0]?.timestamp, lastPriceTimestamp);
  const lastUpdatedTimestamp = Math.max(
    lastPriceTimestamp,
    lastMyfxbookTimestamp,
    lastFxssiTimestamp,
    lastNewsTimestamp,
  );

  return {
    pair: seed.pair,
    drift: seed.drift,
    volatility: seed.volatility,
    tick: 0,
    providerLongPct: {
      myfxbook: toNumber(myfxbookRow?.long_pct, seed.myfxbookLong),
      fxssi: toNumber(fxssiRow?.long_pct, seed.fxssiLong),
    },
    newsScore: toNumber(newsRows[0]?.score, seed.newsScore),
    newsPool: seed.newsPool,
    newsCursor: orderedNews.length,
    newsEvents: orderedNews,
    calendar: seed.calendar,
    priceHistory: orderedPrices,
    freshness: {
      myfxbook: { updatedAt: new Date(lastMyfxbookTimestamp * 1000).toISOString(), maxAgeSec: 300 },
      fxssi: { updatedAt: new Date(lastFxssiTimestamp * 1000).toISOString(), maxAgeSec: 300 },
      eodhd: { updatedAt: new Date(lastNewsTimestamp * 1000).toISOString(), maxAgeSec: 900 },
      finnhub: { updatedAt: new Date(lastPriceTimestamp * 1000).toISOString(), maxAgeSec: 15 },
    },
    lastUpdatedAt: new Date(lastUpdatedTimestamp * 1000).toISOString(),
  };
}

export async function insertPricePoint({ pair, price, timestamp }) {
  await db('prices').insert({
    pair,
    price,
    timestamp,
  });
}

export async function insertSentimentSnapshot({
  pair,
  source,
  type,
  longPct = null,
  shortPct = null,
  score = null,
  headline = null,
  timestamp,
}) {
  await db('sentiments').insert({
    pair,
    source,
    type,
    long_pct: longPct,
    short_pct: shortPct,
    score,
    headline,
    timestamp,
  });
}

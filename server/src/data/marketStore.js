import {
  insertPricePoint,
  insertSentimentSnapshot,
  loadPairState,
  seedPairData,
} from '../db/repositories/marketRepository.js';

const PAIR_SEEDS = [
  {
    pair: 'EUR/USD',
    basePrice: 1.0842,
    drift: 0.00007,
    volatility: 0.00022,
    myfxbookLong: 38,
    fxssiLong: 41,
    newsScore: 0.36,
    calendar: [
      { time: '08:30 UTC', currency: 'USD', title: 'US CPI m/m', impact: 'High' },
      { time: '12:15 UTC', currency: 'EUR', title: 'ECB President Lagarde Speaks', impact: 'High' },
    ],
    newsPool: [
      'Euro demand firms after stronger cross-border flow data',
      'Dollar softens as Treasury yields pull back into London close',
      'Options desks flag topside demand ahead of tomorrow\'s macro releases',
      'Institutional desks rotate into EUR longs after softer US services read',
    ],
  },
  {
    pair: 'GBP/USD',
    basePrice: 1.2675,
    drift: 0.00004,
    volatility: 0.00026,
    myfxbookLong: 44,
    fxssiLong: 47,
    newsScore: 0.12,
    calendar: [
      { time: '09:00 UTC', currency: 'GBP', title: 'BOE Gov Bailey Testifies', impact: 'High' },
      { time: '13:45 UTC', currency: 'USD', title: 'Fed Chair Press Conference', impact: 'High' },
    ],
    newsPool: [
      'Sterling stays supported as UK wage growth surprises to the upside',
      'Cable hesitates near session highs on broad USD positioning reset',
      'Traders price in stickier BOE path after resilient services activity',
      'Short-dated GBP vols rise into central-bank commentary window',
    ],
  },
  {
    pair: 'USD/JPY',
    basePrice: 154.28,
    drift: -0.012,
    volatility: 0.048,
    myfxbookLong: 67,
    fxssiLong: 63,
    newsScore: -0.28,
    calendar: [
      { time: '00:50 UTC', currency: 'JPY', title: 'BoJ Core CPI', impact: 'High' },
      { time: '14:00 UTC', currency: 'USD', title: 'FOMC Meeting Minutes', impact: 'High' },
    ],
    newsPool: [
      'Yen stabilizes as intervention rhetoric heats up in Tokyo',
      'Dollar-yen slips after lower US real yields hit carry appetite',
      'Macro funds trim USD/JPY longs into BoJ volatility pocket',
      'Japanese officials reiterate readiness to curb one-sided moves',
    ],
  },
  {
    pair: 'AUD/USD',
    basePrice: 0.6594,
    drift: 0.00005,
    volatility: 0.00024,
    myfxbookLong: 35,
    fxssiLong: 39,
    newsScore: 0.22,
    calendar: [
      { time: '01:30 UTC', currency: 'AUD', title: 'Employment Change', impact: 'High' },
      { time: '14:00 UTC', currency: 'USD', title: 'Fed Beige Book', impact: 'High' },
    ],
    newsPool: [
      'Aussie catches bid as iron ore futures extend the rebound',
      'Risk-sensitive currencies outperform on steadier Asia equity tone',
      'AUD demand improves after better-than-expected China industrial prints',
      'Commodity FX squeezes higher as short gamma flow fades',
    ],
  },
];

const marketState = new Map();
const listeners = new Set();
let timer = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function roundPrice(pair, price) {
  const decimals = pair.includes('JPY') ? 3 : 5;
  return Number(price.toFixed(decimals));
}

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function nowIso() {
  return new Date().toISOString();
}

function moodLabel(score) {
  if (score >= 0.35) return 'Positive';
  if (score >= 0.1) return 'Constructive';
  if (score <= -0.35) return 'Negative';
  if (score <= -0.1) return 'Risk-Off';
  return 'Balanced';
}

function createHistory(seed) {
  const history = [];
  const now = Math.floor(Date.now() / 1000);
  let price = seed.basePrice;

  for (let index = 89; index >= 0; index -= 1) {
    price += seed.drift + randomBetween(-seed.volatility, seed.volatility);
    history.push({
      time: now - index * 60,
      value: roundPrice(seed.pair, price),
    });
  }

  return history;
}

function createEvents(seed, score) {
  const now = Math.floor(Date.now() / 1000);

  return seed.newsPool.slice(0, 3).map((headline, index) => ({
    id: `${seed.pair.replace('/', '-')}-${index}`,
    time: now - (index + 1) * 900,
    title: headline,
    sentiment: score >= 0 ? 'positive' : 'negative',
  }));
}

function deriveAnomaly(pairSnapshot) {
  const { avgLongPct } = pairSnapshot.sentiment;
  const bullishPrice = pairSnapshot.price.changePct >= 0.12;
  const bearishPrice = pairSnapshot.price.changePct <= -0.12;
  const positiveNews = pairSnapshot.news.score >= 0.2;
  const negativeNews = pairSnapshot.news.score <= -0.2;

  if (avgLongPct <= 35 && bullishPrice && positiveNews) {
    return {
      active: true,
      level: 'high',
      title: 'Short-side crowding detected',
      message:
        'Retail positioning is heavily short while price trend and news flow remain supportive. Watch for continuation or squeeze acceleration.',
    };
  }

  if (avgLongPct >= 65 && bearishPrice && negativeNews) {
    return {
      active: true,
      level: 'high',
      title: 'Long-side trap forming',
      message:
        'Retail traders are leaning long into a bearish tape and negative headlines. The divergence increases downside continuation risk.',
    };
  }

  if ((avgLongPct <= 42 && positiveNews) || (avgLongPct >= 58 && negativeNews)) {
    return {
      active: true,
      level: 'medium',
      title: 'Cross-source bias mismatch',
      message:
        'Retail positioning is drifting away from the current macro tone. Keep an eye on the next catalyst for confirmation.',
    };
  }

  return {
    active: false,
    level: 'none',
    title: 'No extreme divergence',
    message: 'Retail positioning, news tone, and price action remain broadly aligned for now.',
  };
}

function buildSnapshot(state) {
  const currentPrice = state.priceHistory[state.priceHistory.length - 1].value;
  const referencePrice = state.priceHistory[Math.max(0, state.priceHistory.length - 13)].value;
  const changePct = round(((currentPrice - referencePrice) / referencePrice) * 100, 2);
  const avgLongPct = round((state.providerLongPct.myfxbook + state.providerLongPct.fxssi) / 2, 1);

  const snapshot = {
    pair: state.pair,
    updatedAt: state.lastUpdatedAt,
    price: {
      current: currentPrice,
      changePct,
      trend: changePct >= 0 ? 'Bullish' : 'Bearish',
      history: state.priceHistory.slice(-90),
    },
    sentiment: {
      avgLongPct,
      avgShortPct: round(100 - avgLongPct, 1),
      retailBias: avgLongPct >= 50 ? 'Net Long' : 'Net Short',
      providers: [
        {
          source: 'Myfxbook',
          longPct: round(state.providerLongPct.myfxbook, 1),
          shortPct: round(100 - state.providerLongPct.myfxbook, 1),
        },
        {
          source: 'FXSSI',
          longPct: round(state.providerLongPct.fxssi, 1),
          shortPct: round(100 - state.providerLongPct.fxssi, 1),
        },
      ],
    },
    news: {
      score: round(state.newsScore, 2),
      mood: moodLabel(state.newsScore),
      events: state.newsEvents,
    },
    calendar: state.calendar,
    freshness: state.freshness,
  };

  snapshot.anomaly = deriveAnomaly(snapshot);

  return snapshot;
}

function createState(seed) {
  const initializedAt = nowIso();

  return {
    pair: seed.pair,
    drift: seed.drift,
    volatility: seed.volatility,
    tick: 0,
    providerLongPct: {
      myfxbook: seed.myfxbookLong,
      fxssi: seed.fxssiLong,
    },
    newsScore: seed.newsScore,
    newsPool: seed.newsPool,
    newsCursor: 0,
    newsEvents: createEvents(seed, seed.newsScore),
    calendar: seed.calendar,
    priceHistory: createHistory(seed),
    freshness: {
      myfxbook: { updatedAt: initializedAt, maxAgeSec: 300 },
      fxssi: { updatedAt: initializedAt, maxAgeSec: 300 },
      eodhd: { updatedAt: initializedAt, maxAgeSec: 900 },
      finnhub: { updatedAt: initializedAt, maxAgeSec: 15 },
    },
    lastUpdatedAt: initializedAt,
  };
}

function pushNewsEvent(state, timestamp) {
  const headline = state.newsPool[state.newsCursor % state.newsPool.length];
  state.newsCursor += 1;
  const event = {
    id: `${state.pair.replace('/', '-')}-${timestamp}`,
    time: timestamp,
    title: headline,
    sentiment: state.newsScore >= 0 ? 'positive' : 'negative',
  };

  state.newsEvents = [
    event,
    ...state.newsEvents,
  ].slice(0, 5);

  return event;
}

async function tickState(state) {
  const timestamp = Math.floor(Date.now() / 1000);
  const isoTimestamp = new Date(timestamp * 1000).toISOString();
  const lastPrice = state.priceHistory[state.priceHistory.length - 1].value;
  const nextPrice = roundPrice(
    state.pair,
    lastPrice + state.drift + randomBetween(-state.volatility, state.volatility),
  );

  state.tick += 1;
  state.priceHistory.push({ time: timestamp, value: nextPrice });
  state.priceHistory = state.priceHistory.slice(-90);
  state.freshness.finnhub.updatedAt = isoTimestamp;
  await insertPricePoint({ pair: state.pair, price: nextPrice, timestamp });

  if (state.tick % 2 === 0) {
    state.providerLongPct.myfxbook = clamp(
      round(state.providerLongPct.myfxbook + randomBetween(-1.8, 1.8), 1),
      20,
      80,
    );
    state.freshness.myfxbook.updatedAt = isoTimestamp;
    await insertSentimentSnapshot({
      pair: state.pair,
      source: 'Myfxbook',
      type: 'retail_positioning',
      longPct: state.providerLongPct.myfxbook,
      shortPct: round(100 - state.providerLongPct.myfxbook, 1),
      timestamp,
    });
  }

  if (state.tick % 3 === 0) {
    state.providerLongPct.fxssi = clamp(
      round(state.providerLongPct.fxssi + randomBetween(-1.5, 1.5), 1),
      20,
      80,
    );
    state.freshness.fxssi.updatedAt = isoTimestamp;
    await insertSentimentSnapshot({
      pair: state.pair,
      source: 'FXSSI',
      type: 'retail_positioning',
      longPct: state.providerLongPct.fxssi,
      shortPct: round(100 - state.providerLongPct.fxssi, 1),
      timestamp,
    });
  }

  if (state.tick % 4 === 0) {
    state.newsScore = clamp(round(state.newsScore + randomBetween(-0.12, 0.12), 2), -1, 1);
    state.freshness.eodhd.updatedAt = isoTimestamp;
    const event = pushNewsEvent(state, timestamp);
    await insertSentimentSnapshot({
      pair: state.pair,
      source: 'EODHD',
      type: 'news_sentiment',
      score: state.newsScore,
      headline: event.title,
      timestamp,
    });
  }

  state.lastUpdatedAt = isoTimestamp;
}

export async function initializeMarketStore() {
  for (const seed of PAIR_SEEDS) {
    await seedPairData(seed, createHistory, createEvents);
    const persistedState = await loadPairState(seed);
    marketState.set(seed.pair, persistedState || createState(seed));
  }
}

export function getPairs() {
  return PAIR_SEEDS.map((seed) => ({
    label: seed.pair,
    value: seed.pair,
  }));
}

export function getOverview(pair) {
  const state = marketState.get(pair);
  return state ? buildSnapshot(state) : null;
}

export function getAllPairSentiments() {
  const results = [];
  for (const [pair, state] of marketState.entries()) {
    const snapshot = buildSnapshot(state);
    results.push({
      symbol: pair,
      currentPrice: snapshot.price.current,
      trend: snapshot.price.trend,
      changePct: snapshot.price.changePct,
      myfxbook: snapshot.sentiment.providers.find((p) => p.source === 'Myfxbook'),
      fxssi: snapshot.sentiment.providers.find((p) => p.source === 'FXSSI'),
      avgLongPct: snapshot.sentiment.avgLongPct,
      avgShortPct: snapshot.sentiment.avgShortPct,
      retailBias: snapshot.sentiment.retailBias,
      newsScore: snapshot.news.score,
      newsMood: snapshot.news.mood,
      newsEvents: snapshot.news.events,
      priceHistory: snapshot.price.history,
      updatedAt: snapshot.updatedAt,
    });
  }
  return results;
}

export function onMarketUpdate(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function startMarketSimulation() {
  if (timer) {
    return;
  }

  let isTicking = false;

  timer = setInterval(async () => {
    if (isTicking) {
      return;
    }

    isTicking = true;

    try {
      for (const [pair, state] of marketState.entries()) {
        await tickState(state);
        const snapshot = buildSnapshot(state);
        listeners.forEach((listener) => listener(pair, snapshot));
      }
    } catch (error) {
      console.error('Market simulation tick failed.');
      console.error(error);
    } finally {
      isTicking = false;
    }
  }, 3000);
}

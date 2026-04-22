import { env } from '../config/env.js';
import {
  getCachedEodhd,
  getApiCallCount,
  incrementApiCallCount,
  setCachedEodhd,
} from '../db/repositories/eodhdRepository.js';

// EODHD free tier: 500 calls/day
const DAILY_LIMIT = 500;
// Keep reserve for critical operations
const SAFE_LIMIT = 480;

// In-memory fallback headlines per pair
const FALLBACK_HEADLINES = {
  'EURUSD': [
    'Euro area inflation data beats expectations',
    'ECB hints at gradual rate normalization path',
    'German manufacturing PMI shows stabilization',
  ],
  'GBPUSD': [
    'UK wage growth remains elevated above BoE target',
    'Cable holds firm on renewed Brexit optimism',
    'British retail sales surprise to the upside',
  ],
  'USDJPY': [
    'BoJ maintains ultra-loose monetary policy stance',
    'Japanese officials warn against excessive yen weakness',
    'US-Japan yield spread continues to favor dollar',
  ],
  'AUDUSD': [
    'Australian employment report exceeds consensus forecast',
    'Iron ore prices rally on China stimulus hopes',
    'RBA keeps rates on hold with hawkish guidance',
  ],
  'DEFAULT': [
    'Market sentiment remains mixed ahead of key data releases',
    'Central bank commentary dominates price action',
    'Risk appetite fluctuates on macro uncertainty',
  ],
};

function pairToSymbol(pair) {
  return pair.replace('/', '');
}

function symbolToPair(symbol) {
  if (symbol.length === 6) {
    return `${symbol.slice(0, 3)}/${symbol.slice(3)}`;
  }
  return symbol;
}

function calculateSentimentScore(articles) {
  if (!articles?.length) return 0;

  let totalScore = 0;
  let count = 0;

  for (const article of articles) {
    const title = (article.title || '').toLowerCase();
    let score = 0;

    // Simple keyword-based scoring
    const positive = ['rise', 'rally', 'gain', 'up', 'higher', 'strong', 'boost', 'surge', 'optimism', 'growth', 'bullish', 'positive', 'recovery'];
    const negative = ['fall', 'drop', 'decline', 'down', 'lower', 'weak', 'slide', 'plunge', 'pessimism', 'recession', 'bearish', 'negative', 'crash'];

    for (const word of positive) {
      if (title.includes(word)) score += 0.15;
    }
    for (const word of negative) {
      if (title.includes(word)) score -= 0.15;
    }

    totalScore += Math.max(-1, Math.min(1, score));
    count++;
  }

  return count > 0 ? Math.max(-1, Math.min(1, totalScore / count)) : 0;
}

function scoreToMood(score) {
  if (score >= 0.35) return 'Positive';
  if (score >= 0.1) return 'Constructive';
  if (score <= -0.35) return 'Negative';
  if (score <= -0.1) return 'Risk-Off';
  return 'Balanced';
}

async function callEodhdApi(pair) {
  if (!env.eodhdApiKey) {
    return { usedApi: false, data: null, reason: 'No API key configured' };
  }

  const callCount = await getApiCallCount();
  if (callCount >= SAFE_LIMIT) {
    console.warn(`[EODHD] Daily API limit approaching (${callCount}/${DAILY_LIMIT}). Skipping call.`);
    return { usedApi: false, data: null, reason: 'Daily API limit reached' };
  }

  const symbol = pairToSymbol(pair);
  const url = `https://eodhd.com/api/news?s=${symbol}&offset=0&limit=5&api_token=${env.eodhdApiKey}&fmt=json`;

  try {
    const response = await fetch(url, { timeout: 10000 });
    await incrementApiCallCount();

    if (!response.ok) {
      console.warn(`[EODHD] API error for ${pair}: ${response.status}`);
      return { usedApi: false, data: null, reason: `HTTP ${response.status}` };
    }

    const articles = await response.json();

    if (!Array.isArray(articles) || articles.length === 0) {
      console.warn(`[EODHD] No articles for ${pair}`);
      return { usedApi: true, data: null, reason: 'No articles' };
    }

    const headlines = articles.map((a) => a.title || '').filter(Boolean);
    const score = calculateSentimentScore(articles);
    const mood = scoreToMood(score);

    const data = {
      symbol,
      pair,
      score,
      mood,
      headlines: headlines.slice(0, 5),
    };

    await setCachedEodhd(pair, data);
    console.log(`[EODHD] Fetched ${articles.length} articles for ${pair} (calls today: ${callCount + 1})`);

    return { usedApi: true, data };
  } catch (error) {
    console.error(`[EODHD] Fetch error for ${pair}:`, error.message);
    return { usedApi: false, data: null, reason: error.message };
  }
}

export async function getEodhdSentiment(pair) {
  // 1. Check cache first
  const cached = await getCachedEodhd(pair);
  if (cached) {
    console.log(`[EODHD] Cache hit for ${pair}`);
    return { source: 'EODHD (cached)', ...cached };
  }

  // 2. Try API call
  const result = await callEodhdApi(pair);

  if (result.data) {
    return { source: 'EODHD (live)', ...result.data };
  }

  // 3. Fallback to simulated data
  const symbol = pairToSymbol(pair);
  const fallbackHeadlines = FALLBACK_HEADLINES[symbol] || FALLBACK_HEADLINES.DEFAULT;
  const seedScore = (symbol.charCodeAt(0) + symbol.charCodeAt(3)) % 10;
  const simulatedScore = (seedScore - 5) / 10;

  const fallbackData = {
    symbol,
    pair,
    score: simulatedScore,
    mood: scoreToMood(simulatedScore),
    headlines: fallbackHeadlines,
    source: result.reason || 'EODHD (simulated)',
  };

  // Cache fallback too so we don't keep trying
  await setCachedEodhd(pair, fallbackData);

  console.log(`[EODHD] Fallback used for ${pair}: ${result.reason}`);
  return { ...fallbackData, source: `EODHD (${result.reason || 'fallback'})` };
}

export async function getApiStats() {
  const count = await getApiCallCount();
  return {
    usedToday: count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - count),
    percentage: Math.round((count / DAILY_LIMIT) * 100),
  };
}

import dotenv from 'dotenv';

const { env } = process;

const parseList = (value = '') => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const parseNumber = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

dotenv.config({
  path: env.NODE_ENV ? `.env.${env.NODE_ENV}` : '.env',
});

const DEFAULT_BOT_INIT_PROMPT = [
  'あなたはLINEグループに参加している議論整理AIです。',
  '役割は、指示されたことの実行、議論の論点整理、選択肢比較、抜け漏れ指摘、次アクション提示です。',
  '回答は日本語で簡潔にしてください。',
  '不要な雑談はせず、意思決定に役立つ形で整理してください。',
  '意見が割れている場合は、双方の主張を公平に整理してください。',
  '結論が出せる場合は、理由つきで推奨案を提示してください。',
  '不明点がある場合は、確認質問を1つだけ出してください。',
].join('\n');

const config = Object.freeze({
  APP_ENV: env.NODE_ENV || 'production',
  APP_DEBUG: env.APP_DEBUG === 'true' || false,
  APP_URL: env.APP_URL || null,
  APP_PUBLIC_URL: env.APP_PUBLIC_URL || env.APP_URL || (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : null),
  APP_PORT: env.APP_PORT || null,
  APP_LANG: env.APP_LANG || 'ja',
  APP_WEBHOOK_PATH: env.APP_WEBHOOK_PATH || '/webhook',
  APP_API_TIMEOUT: env.APP_API_TIMEOUT || 9000,
  APP_MAX_GROUPS: Number(env.APP_MAX_GROUPS) || 5,
  APP_MAX_USERS: Number(env.APP_MAX_USERS) || 100,
  APP_MAX_PROMPT_MESSAGES: Number(env.APP_MAX_PROMPT_MESSAGES) || 10,
  APP_MAX_PROMPT_TOKENS: Number(env.APP_MAX_PROMPT_TOKENS) || 2048,
  APP_TIMEZONE: env.APP_TIMEZONE || 'Asia/Tokyo',
  APP_DEFAULT_LOCATION: env.APP_DEFAULT_LOCATION || '東京都',
  APP_INIT_PROMPT: env.APP_INIT_PROMPT || '',
  APP_OWNER_USER_ID: env.APP_OWNER_USER_ID || null,
  APP_ALLOWED_USER_IDS: parseList([env.APP_OWNER_USER_ID, env.APP_ALLOWED_USER_IDS].filter(Boolean).join(',')),
  APP_ALLOWED_GROUP_IDS: parseList(env.APP_ALLOWED_GROUP_IDS),
  APP_COST_LOG_ENABLED: env.APP_COST_LOG_ENABLED !== 'false',
  APP_COST_MESSAGE_ENABLED: env.APP_COST_MESSAGE_ENABLED === 'true' || false,
  HUMAN_NAME: env.HUMAN_NAME || '',
  HUMAN_INIT_PROMPT: env.HUMAN_INIT_PROMPT || '',
  BOT_NAME: env.BOT_NAME || '@gpt',
  BOT_OUTPUT_PREFIX: env.BOT_OUTPUT_PREFIX || 'この出力は澁澤のポケットマネーが減っています。大切に使用してください。\n\n',
  BOT_INIT_PROMPT: env.BOT_INIT_PROMPT || DEFAULT_BOT_INIT_PROMPT,
  BOT_TONE: env.BOT_TONE || '',
  BOT_DEACTIVATED: env.BOT_DEACTIVATED === 'true' || false,
  ERROR_MESSAGE_DISABLED: env.ERROR_MESSAGE_DISABLED === 'true' || /** @deprecated */ env.ERROR_TIMEOUT_DISABLED === 'true' || false,
  VERCEL_ENV: env.VERCEL_ENV || null,
  VERCEL_TIMEOUT: env.VERCEL_TIMEOUT || env.APP_API_TIMEOUT,
  VERCEL_PROJECT_NAME: env.VERCEL_PROJECT_NAME || env.VERCEL_GIT_REPO_SLUG || null,
  VERCEL_TEAM_ID: env.VERCEL_TEAM_ID || null,
  VERCEL_ACCESS_TOKEN: env.VERCEL_ACCESS_TOKEN || null,
  VERCEL_DEPLOY_HOOK_URL: env.VERCEL_DEPLOY_HOOK_URL || null,
  OPENAI_TIMEOUT: env.OPENAI_TIMEOUT || env.APP_API_TIMEOUT,
  OPENAI_API_KEY: env.OPENAI_API_KEY || null,
  OPENAI_COMPLETION_MODEL: env.OPENAI_COMPLETION_MODEL || 'gpt-5.4-mini',
  OPENAI_COMPLETION_INPUT_PRICE_PER_1M: parseNumber(env.OPENAI_COMPLETION_INPUT_PRICE_PER_1M),
  OPENAI_COMPLETION_OUTPUT_PRICE_PER_1M: parseNumber(env.OPENAI_COMPLETION_OUTPUT_PRICE_PER_1M),
  OPENAI_COMPLETION_TEMPERATURE: Number(env.OPENAI_COMPLETION_TEMPERATURE) || 0.9,
  OPENAI_COMPLETION_MAX_TOKENS: Number(env.OPENAI_COMPLETION_MAX_TOKENS) || 500,
  OPENAI_COMPLETION_FREQUENCY_PENALTY: Number(env.OPENAI_COMPLETION_FREQUENCY_PENALTY) || 0,
  OPENAI_COMPLETION_PRESENCE_PENALTY: Number(env.OPENAI_COMPLETION_PRESENCE_PENALTY) || 0.6,
  OPENAI_IMAGE_MODEL: env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
  OPENAI_IMAGE_GENERATION_SIZE: env.OPENAI_IMAGE_GENERATION_SIZE || '256x256',
  OPENAI_IMAGE_QUALITY: env.OPENAI_IMAGE_QUALITY || 'low',
  OPENAI_IMAGE_OUTPUT_FORMAT: env.OPENAI_IMAGE_OUTPUT_FORMAT || 'jpeg',
  OPENAI_IMAGE_OUTPUT_COMPRESSION: Number(env.OPENAI_IMAGE_OUTPUT_COMPRESSION) || 80,
  LINE_TIMEOUT: env.LINE_TIMEOUT || env.APP_API_TIMEOUT,
  LINE_CHANNEL_ACCESS_TOKEN: env.LINE_CHANNEL_ACCESS_TOKEN || null,
  LINE_CHANNEL_SECRET: env.LINE_CHANNEL_SECRET || null,
  SERPAPI_TIMEOUT: env.SERPAPI_TIMEOUT || env.APP_API_TIMEOUT,
  SERPAPI_API_KEY: env.SERPAPI_API_KEY || null,
  SERPAPI_LOCATION: env.SERPAPI_LOCATION || 'Japan',
  SERPAPI_LANG: env.SERPAPI_LANG || 'lang_ja',
  SERPAPI_HL: env.SERPAPI_HL || env.APP_LANG || 'ja',
  SERPAPI_GL: env.SERPAPI_GL || 'jp',
});

export default config;

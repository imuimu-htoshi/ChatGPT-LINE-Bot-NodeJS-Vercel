import config from '../../config/index.js';
import { COMMAND_BOT_DRAW, COMMAND_BOT_SEARCH } from '../commands/index.js';
import { getHistory } from '../history/index.js';

export const RESPONSE_TYPE_TEXT = 'text';
export const RESPONSE_TYPE_IMAGE = 'image';
export const RESPONSE_TYPE_WEB = 'web';

const WEATHER_KEYWORDS = /(天気|気温|降水|雨|雪|台風|湿度|予報)/i;
const NEWS_KEYWORDS = /(ニュース|速報|ヘッドライン|トレンド)/i;
const FRESH_INFO_KEYWORDS = /(最新|現在|いま|今|本日|今日|明日|明後日|昨日|来週|来月|今週|週末|相場|株価|為替|レート|料金|価格|日程|スケジュール|試合結果|結果|勝敗|時刻|発売日|営業中|混雑)/i;
const SEARCH_VERBS = /(検索して|調べて|確認して|教えて|見てきて|ググって)/i;
const IMAGE_KEYWORDS = /(画像|イラスト|作画|描いて|描いてください|生成して|作って|作成して)/i;
const HISTORY_REFERENCE_PATTERNS = [
  /^(これ|それ|あれ|この|その|あの|ここ|そこ|あそこ)/i,
  /^(この件|その件|例の件|前の件|さっきの件|上の件|下の件)/i,
  /^(続き|つづき|さっきの続きを|前の続きを)/i,
  /^(同じ条件で|同じ前提で|前提を踏まえて)/i,
  /(どう思う[?？]?|どうする[?？]?|どうなった[?？]?|それで[?？]?|つまり[?？]?|どっちがいい[?？]?|どれがいい[?？]?)/i,
];

const WEEK_PERIOD_KEYWORDS = {
  今週: 0,
  来週: 7,
};

const DAY_KEYWORDS = {
  今日: 0,
  きょう: 0,
  本日: 0,
  昨日: -1,
  きのう: -1,
  明日: 1,
  あした: 1,
  あす: 1,
  明後日: 2,
  あさって: 2,
};

class RoutingDecision {
  responseType;

  needsHistory;

  needsImageGeneration;

  needsWebSearch;

  requestText;

  reasons;

  webSearch;

  constructor({
    responseType = RESPONSE_TYPE_TEXT,
    needsHistory = false,
    needsImageGeneration = false,
    needsWebSearch = false,
    requestText = '',
    reasons = [],
    webSearch = null,
  } = {}) {
    this.responseType = responseType;
    this.needsHistory = needsHistory;
    this.needsImageGeneration = needsImageGeneration;
    this.needsWebSearch = needsWebSearch;
    this.requestText = requestText;
    this.reasons = reasons;
    this.webSearch = webSearch;
  }
}

const normalizeText = (text = '') => text.replaceAll('　', ' ').trim();

const extractCommandPayload = (text, command) => {
  const normalizedText = normalizeText(text);
  const candidates = [command.text, ...command.aliases]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const matched = candidates.find((candidate) => normalizedText.toLowerCase().startsWith(candidate.toLowerCase()));
  if (!matched) return normalizedText;
  return normalizedText.slice(matched.length).trim();
};

const getPreviousHistoryMessages = (context) => {
  const history = getHistory(context.id);
  if (history.messages.length < 1) return [];
  return history.messages.slice(0, -1);
};

const needsHistoryReference = (text, previousMessageCount) => (
  previousMessageCount > 0
  && (
    HISTORY_REFERENCE_PATTERNS.some((pattern) => pattern.test(text))
    || (text.length <= 12 && /(なぜ|なんで|どうして|詳しく|もっと|比較して|整理して)/i.test(text))
  )
);

const isImageGenerationRequest = (text) => (
  IMAGE_KEYWORDS.test(text)
  && /(作成|生成|描|イラスト|作画)/i.test(text)
);

const isWebSearchRequest = (text, isExplicitSearch) => (
  isExplicitSearch
  || WEATHER_KEYWORDS.test(text)
  || NEWS_KEYWORDS.test(text)
  || (FRESH_INFO_KEYWORDS.test(text) && SEARCH_VERBS.test(text))
  || (FRESH_INFO_KEYWORDS.test(text) && /(天気|ニュース|株価|為替|料金|価格|日程|試合|結果|営業|時刻)/i.test(text))
);

const getTimeZoneDateParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return parts.reduce((result, part) => {
    if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
      result[part.type] = Number(part.value);
    }
    return result;
  }, {});
};

const addDays = ({ year, month, day }, delta) => {
  const utc = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
};

const formatIsoDate = ({ year, month, day }) => (
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

const formatDateLabel = ({ year, month, day }) => (
  `${year}年${month}月${day}日`
);

const getWeekStart = ({ year, month, day }) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  return addDays({ year, month, day }, 1 - weekday);
};

const resolveRelativeDate = (text, {
  now = new Date(),
  timeZone = config.APP_TIMEZONE,
} = {}) => {
  const today = getTimeZoneDateParts(now, timeZone);
  const matchedDayKeyword = Object.keys(DAY_KEYWORDS).find((keyword) => text.includes(keyword));
  if (matchedDayKeyword) {
    const resolved = addDays(today, DAY_KEYWORDS[matchedDayKeyword]);
    return {
      kind: 'day',
      matchedKeyword: matchedDayKeyword,
      isoDate: formatIsoDate(resolved),
      label: formatDateLabel(resolved),
    };
  }
  const matchedWeekKeyword = Object.keys(WEEK_PERIOD_KEYWORDS).find((keyword) => text.includes(keyword));
  if (matchedWeekKeyword) {
    const resolved = getWeekStart(addDays(today, WEEK_PERIOD_KEYWORDS[matchedWeekKeyword]));
    return {
      kind: 'week',
      matchedKeyword: matchedWeekKeyword,
      isoDate: formatIsoDate(resolved),
      label: `${formatDateLabel(resolved)}週`,
    };
  }
  return null;
};

const hasLocationHint = (text) => (
  /(都|道|府|県|市|区|町|村|駅|空港|方面|周辺|近辺|東京|大阪|名古屋|札幌|福岡|京都|横浜|神戸|仙台|那覇|沖縄|北海道|日本)/i.test(text)
);

const buildHistoryHint = (context) => getPreviousHistoryMessages(context)
  .filter(({ role }) => role !== config.BOT_NAME)
  .slice(-2)
  .map(({ content }) => content.replaceAll('。', ' '))
  .join(' ')
  .trim();

const buildWebSearch = (context, {
  requestText,
  needsHistory,
  now,
} = {}) => {
  const baseQuery = requestText || context.trimmedText;
  const resolvedDate = resolveRelativeDate(baseQuery, { now });
  const isWeather = WEATHER_KEYWORDS.test(baseQuery);
  const isNews = NEWS_KEYWORDS.test(baseQuery);
  const historyHint = needsHistory ? buildHistoryHint(context) : '';
  const locationHint = isWeather && !hasLocationHint(baseQuery) ? config.APP_DEFAULT_LOCATION : '';
  const freshnessHint = resolvedDate?.isoDate ? `${resolvedDate.isoDate} JST` : '';
  const query = [historyHint, baseQuery, locationHint, freshnessHint]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    intent: isWeather ? 'weather' : isNews ? 'news' : 'search',
    query,
    historyHint,
    resolvedDate,
  };
};

const buildRoutingDecision = (context, {
  now = new Date(),
} = {}) => {
  const explicitImage = context.hasCommand(COMMAND_BOT_DRAW);
  const explicitSearch = context.hasCommand(COMMAND_BOT_SEARCH);
  const requestText = explicitImage
    ? extractCommandPayload(context.trimmedText, COMMAND_BOT_DRAW)
    : explicitSearch
      ? extractCommandPayload(context.trimmedText, COMMAND_BOT_SEARCH)
      : context.trimmedText;
  const previousMessageCount = getPreviousHistoryMessages(context).length;
  const needsHistory = needsHistoryReference(requestText, previousMessageCount);
  const needsImageGeneration = explicitImage || isImageGenerationRequest(requestText);
  const needsWebSearch = !needsImageGeneration && isWebSearchRequest(requestText, explicitSearch);
  const reasons = [];
  if (needsHistory) reasons.push('history');
  if (needsImageGeneration) reasons.push('image');
  if (needsWebSearch) reasons.push('web');

  return new RoutingDecision({
    responseType: needsImageGeneration
      ? RESPONSE_TYPE_IMAGE
      : needsWebSearch
        ? RESPONSE_TYPE_WEB
        : RESPONSE_TYPE_TEXT,
    needsHistory,
    needsImageGeneration,
    needsWebSearch,
    requestText,
    reasons,
    webSearch: needsWebSearch ? buildWebSearch(context, { requestText, needsHistory, now }) : null,
  });
};

export {
  RoutingDecision,
  buildRoutingDecision,
  buildWebSearch,
  extractCommandPayload,
  isImageGenerationRequest,
  isWebSearchRequest,
  needsHistoryReference,
  resolveRelativeDate,
};

export default buildRoutingDecision;

import config from '../../config/index.js';
import { COMMAND_BOT_DRAW, COMMAND_BOT_SEARCH } from '../commands/index.js';
import { getHistory } from '../history/index.js';

export const RESPONSE_TYPE_TEXT = 'text';
export const RESPONSE_TYPE_IMAGE = 'image';
export const RESPONSE_TYPE_WEB = 'web';

const WEATHER_KEYWORDS = /(天気|気温|降水|雨|雪|台風|湿度|予報)/i;
const NEWS_KEYWORDS = /(ニュース|速報|ヘッドライン|トレンド)/i;
const REFERENCE_COMMAND = '/ref';

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

const getCommandPayload = (text, command) => {
  const normalizedText = normalizeText(text);
  const candidates = [command.text, ...command.aliases]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const matched = candidates.find((candidate) => normalizedText.toLowerCase().startsWith(candidate.toLowerCase()));
  return {
    matched: Boolean(matched),
    text: matched ? normalizedText.slice(matched.length).trim() : normalizedText,
  };
};

const getPreviousHistoryMessages = (context) => {
  const history = getHistory(context.id);
  if (history.messages.length < 1) return [];
  return history.messages.slice(0, -1);
};

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
  const reference = getCommandPayload(context.trimmedText, { text: REFERENCE_COMMAND, aliases: [] });
  const routeText = reference.matched ? reference.text : normalizeText(context.trimmedText);
  const image = getCommandPayload(routeText, COMMAND_BOT_DRAW);
  const search = getCommandPayload(routeText, COMMAND_BOT_SEARCH);
  const needsHistory = reference.matched;
  const needsImageGeneration = image.matched;
  const needsWebSearch = !needsImageGeneration && search.matched;
  const requestText = needsImageGeneration ? image.text : needsWebSearch ? search.text : routeText;
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
  resolveRelativeDate,
};

export default buildRoutingDecision;

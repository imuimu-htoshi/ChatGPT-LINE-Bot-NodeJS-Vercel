import {
  afterEach, expect, test,
} from '@jest/globals';
import config from '../config/index.js';
import { updateHistory, removeHistory } from '../app/history/index.js';
import { COMMAND_BOT_DRAW, COMMAND_BOT_SEARCH } from '../app/commands/index.js';
import {
  buildRoutingDecision,
  RESPONSE_TYPE_IMAGE,
  RESPONSE_TYPE_TEXT,
  RESPONSE_TYPE_WEB,
} from '../app/routing/index.js';

const NOW = new Date('2026-07-06T10:00:00+09:00');

const createContext = (id, trimmedText) => ({
  id,
  trimmedText,
  hasCommand(command) {
    const content = trimmedText.toLowerCase();
    return [command.text, ...command.aliases]
      .filter(Boolean)
      .some((candidate) => content.startsWith(candidate.toLowerCase()));
  },
});

afterEach(() => {
  removeHistory('route-image');
  removeHistory('route-weather');
  removeHistory('route-history');
});

test('ROUTING_DETECTS_IMAGE_GENERATION_AND_STRIPS_PREFIX', () => {
  const decision = buildRoutingDecision(createContext('route-image', '/draw 夕焼けの猫'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_IMAGE);
  expect(decision.needsImageGeneration).toBe(true);
  expect(decision.requestText).toEqual('夕焼けの猫');
});

test('ROUTING_DOES_NOT_DETECT_IMAGE_GENERATION_FROM_KEYWORDS', () => {
  const decision = buildRoutingDecision(createContext('route-image', '画像生成して 夕焼けの猫'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_TEXT);
  expect(decision.needsImageGeneration).toBe(false);
});

test('ROUTING_DOES_NOT_DETECT_WEB_SEARCH_FROM_KEYWORDS', () => {
  const decision = buildRoutingDecision(createContext('route-weather', '明日の天気'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_TEXT);
  expect(decision.needsWebSearch).toBe(false);
  expect(decision.webSearch).toBeNull();
});

test('ROUTING_DETECTS_EXPLICIT_WEB_SEARCH_AND_RESOLVES_RELATIVE_DATE', () => {
  const decision = buildRoutingDecision(createContext('route-weather', '/search 明日の天気'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_WEB);
  expect(decision.needsWebSearch).toBe(true);
  expect(decision.requestText).toEqual('明日の天気');
  expect(decision.webSearch.query).toContain('2026-07-07');
  expect(decision.webSearch.query).toContain(config.APP_DEFAULT_LOCATION);
  expect(decision.webSearch.resolvedDate.label).toEqual('2026年7月7日');
});

test('ROUTING_DOES_NOT_PULL_HISTORY_FROM_CONTEXT_DEPENDENT_INPUT', () => {
  updateHistory('route-history', (history) => history
    .write('user', 'A案を採用するか悩んでいます')
    .write(config.BOT_NAME, '論点を整理します')
    .write('user', 'この件どう思う？'));

  const decision = buildRoutingDecision(createContext('route-history', 'この件どう思う？'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_TEXT);
  expect(decision.needsHistory).toBe(false);
  expect(decision.needsWebSearch).toBe(false);
});

test('ROUTING_PULLS_HISTORY_WITH_REF_MODIFIER', () => {
  updateHistory('route-history', (history) => history
    .write('user', 'A案を採用するか悩んでいます')
    .write(config.BOT_NAME, '論点を整理します')
    .write('user', '/ref この件どう思う？'));

  const decision = buildRoutingDecision(createContext('route-history', '/ref この件どう思う？'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_TEXT);
  expect(decision.needsHistory).toBe(true);
  expect(decision.requestText).toEqual('この件どう思う？');
});

test('ROUTING_SUPPORTS_REF_BEFORE_EXPLICIT_IMAGE_COMMAND', () => {
  const decision = buildRoutingDecision(createContext('route-image', `/ref ${COMMAND_BOT_DRAW.text} 夕焼けの猫`), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_IMAGE);
  expect(decision.needsHistory).toBe(true);
  expect(decision.requestText).toEqual('夕焼けの猫');
});

test('ROUTING_SUPPORTS_REF_BEFORE_EXPLICIT_SEARCH_COMMAND', () => {
  const decision = buildRoutingDecision(createContext('route-weather', `/ref ${COMMAND_BOT_SEARCH.text} 明日の天気`), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_WEB);
  expect(decision.needsHistory).toBe(true);
  expect(decision.requestText).toEqual('明日の天気');
});

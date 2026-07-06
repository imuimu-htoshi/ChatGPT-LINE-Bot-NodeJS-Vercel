import {
  afterEach, expect, test,
} from '@jest/globals';
import config from '../config/index.js';
import { updateHistory, removeHistory } from '../app/history/index.js';
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
  const decision = buildRoutingDecision(createContext('route-image', '画像生成して 夕焼けの猫'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_IMAGE);
  expect(decision.needsImageGeneration).toBe(true);
  expect(decision.requestText).toEqual('夕焼けの猫');
});

test('ROUTING_DETECTS_WEB_SEARCH_AND_RESOLVES_RELATIVE_DATE', () => {
  const decision = buildRoutingDecision(createContext('route-weather', '明日の天気'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_WEB);
  expect(decision.needsWebSearch).toBe(true);
  expect(decision.webSearch.query).toContain('2026-07-07');
  expect(decision.webSearch.query).toContain(config.APP_DEFAULT_LOCATION);
  expect(decision.webSearch.resolvedDate.label).toEqual('2026年7月7日');
});

test('ROUTING_ONLY_PULLS_HISTORY_FOR_CONTEXT_DEPENDENT_INPUT', () => {
  updateHistory('route-history', (history) => history
    .write('user', 'A案を採用するか悩んでいます')
    .write(config.BOT_NAME, '論点を整理します')
    .write('user', 'この件どう思う？'));

  const decision = buildRoutingDecision(createContext('route-history', 'この件どう思う？'), { now: NOW });

  expect(decision.responseType).toEqual(RESPONSE_TYPE_TEXT);
  expect(decision.needsHistory).toBe(true);
  expect(decision.needsWebSearch).toBe(false);
});

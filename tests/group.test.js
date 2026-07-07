import {
  afterEach, expect, test,
} from '@jest/globals';
import { ROLE_AI, ROLE_HUMAN } from '../services/openai.js';
import { Prompt, getPrompt, handleEvents, removePrompt } from '../app/index.js';
import { getHistory, removeHistory } from '../app/history/index.js';
import config from '../config/index.js';
import { MOCK_GROUP_02 } from '../constants/mock.js';
import { t } from '../locales/index.js';
import {
  createEvents, MOCK_TEXT_OK, MOCK_USER_01, TIMEOUT,
} from './utils.js';

afterEach(() => {
  removePrompt(MOCK_GROUP_02);
  removePrompt(MOCK_USER_01);
  removeHistory(MOCK_GROUP_02);
  removeHistory(MOCK_USER_01);
});

test('GROUP_IGNORES_MESSAGES_WITHOUT_BOT_NAME', async () => {
  const results = await handleEvents(createEvents(['通常発言です'], MOCK_GROUP_02, MOCK_USER_01));

  expect(results).toEqual([]);
  expect(getHistory(MOCK_GROUP_02).lastMessage.content).toEqual('通常発言です。');
}, TIMEOUT);

test('GROUP_RESPONDS_ONLY_TO_PREFIXED_MESSAGE_AND_STRIPS_BOT_NAME', async () => {
  const results = await handleEvents(createEvents([`${config.BOT_NAME} この議論を整理して`], MOCK_GROUP_02, MOCK_USER_01));
  const prompt = getPrompt(MOCK_GROUP_02);

  expect(getPrompt(MOCK_USER_01).messages.length).toEqual(3);
  expect(prompt.messages.length).toEqual(5);
  expect(prompt.messages[3].content).toEqual('この議論を整理して。');
  expect(prompt.messages[3].content.includes(config.BOT_NAME)).toBe(false);
  expect(results.map(({ messages }) => messages.map(({ text }) => text))).toEqual([[MOCK_TEXT_OK]]);
}, TIMEOUT);

test('GROUP_EMPTY_PREFIXED_MESSAGE_RETURNS_GUIDANCE', async () => {
  const results = await handleEvents(createEvents([config.BOT_NAME], MOCK_GROUP_02, MOCK_USER_01));

  expect(results.map(({ messages }) => messages.map(({ text }) => text))).toEqual([[t('__ERROR_EMPTY_PROMPT')]]);
}, TIMEOUT);

test('PROMPT_KEEPS_LATEST_TEN_MESSAGES_AFTER_INITIAL_PROMPT', () => {
  const prompt = new Prompt();

  Array.from({ length: 8 }).forEach((_, index) => {
    prompt.write(ROLE_HUMAN, `質問${index}`);
    prompt.write(ROLE_AI, `回答${index}`);
  });

  expect(config.APP_MAX_PROMPT_MESSAGES).toEqual(10);
  expect(prompt.messages.length).toEqual(13);
  expect(prompt.messages[3].content).toEqual('質問3。');
  expect(prompt.messages[12].content).toEqual('回答7。');
});

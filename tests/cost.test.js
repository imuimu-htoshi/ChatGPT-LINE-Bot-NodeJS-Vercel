import { expect, test } from '@jest/globals';
import { estimateCompletionCost } from '../utils/estimate-cost.js';

test('ESTIMATE_COMPLETION_COST_SUPPORTS_GPT_5_4_MINI', () => {
  const cost = estimateCompletionCost({
    model: 'gpt-5.4-mini',
    usage: {
      promptTokens: 1000,
      completionTokens: 500,
    },
  });

  expect(cost).toEqual(0.003);
});

test('ESTIMATE_COMPLETION_COST_RETURNS_NULL_FOR_UNKNOWN_MODEL_WITHOUT_OVERRIDE', () => {
  const cost = estimateCompletionCost({
    model: 'unknown-model',
    usage: {
      promptTokens: 1000,
      completionTokens: 500,
    },
  });

  expect(cost).toBeNull();
});

import config from '../config/index.js';
import { MOCK_TEXT_OK } from '../constants/mock.js';
import { createWebSearchResponse } from '../services/openai.js';
import { WEB_SEARCH_TOOL_CALL_PRICE_USD, estimateCompletionCost } from './estimate-cost.js';

const extractOutputText = (output = []) => output
  .filter(({ type }) => type === 'message')
  .flatMap(({ content = [] }) => content)
  .filter(({ type }) => type === 'output_text')
  .map(({ text }) => text)
  .join('\n')
  .trim();

const normalizeUsage = (usage = {}) => ({
  promptTokens: usage.input_tokens || 0,
  completionTokens: usage.output_tokens || 0,
  totalTokens: usage.total_tokens || 0,
});

const generateWebSearchCompletion = async ({
  input,
}) => {
  if (config.APP_ENV !== 'production') {
    return {
      text: MOCK_TEXT_OK,
      model: config.OPENAI_COMPLETION_MODEL,
      usage: normalizeUsage(),
      cost: null,
    };
  }
  const { data } = await createWebSearchResponse({ input });
  const model = data.model || config.OPENAI_COMPLETION_MODEL;
  const usage = normalizeUsage(data.usage);
  const tokenCost = estimateCompletionCost({ model, usage });
  const searchCallCount = (data.output || []).filter(({ type }) => type === 'web_search_call').length;
  return {
    text: extractOutputText(data.output),
    model,
    usage,
    cost: (tokenCost || 0) + (searchCallCount * WEB_SEARCH_TOOL_CALL_PRICE_USD),
  };
};

export default generateWebSearchCompletion;

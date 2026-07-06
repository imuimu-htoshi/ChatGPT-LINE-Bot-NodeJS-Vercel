import config from '../config/index.js';
import { MOCK_TEXT_OK } from '../constants/mock.js';
import { createWebSearchResponse } from '../services/openai.js';
import { estimateCompletionCost } from './estimate-cost.js';

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
  return {
    text: extractOutputText(data.output),
    model,
    usage,
    cost: estimateCompletionCost({ model, usage }),
  };
};

export default generateWebSearchCompletion;

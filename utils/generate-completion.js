import config from '../config/index.js';
import { MOCK_TEXT_OK } from '../constants/mock.js';
import {
  createChatCompletion, createTextCompletion, FINISH_REASON_STOP,
} from '../services/openai.js';
import { estimateCompletionCost } from './estimate-cost.js';

class Completion {
  text;

  finishReason;

  model;

  usage;

  cost;

  constructor({
    text,
    finishReason,
    model = config.OPENAI_COMPLETION_MODEL,
    usage = null,
    cost = null,
  }) {
    this.text = text;
    this.finishReason = finishReason;
    this.model = model;
    this.usage = usage;
    this.cost = cost;
  }

  get isFinishReasonStop() {
    return this.finishReason === FINISH_REASON_STOP;
  }
}

const normalizeUsage = (usage = {}) => ({
  promptTokens: usage.prompt_tokens || 0,
  completionTokens: usage.completion_tokens || 0,
  totalTokens: usage.total_tokens || 0,
});

const LEGACY_COMPLETION_MODEL_PREFIXES = [
  'text-',
  'davinci',
  'curie',
  'babbage',
  'ada',
];

const usesLegacyCompletion = (model = '') => (
  LEGACY_COMPLETION_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix))
);

/**
 * @param {Object} param
 * @param {Prompt} param.prompt
 * @returns {Promise<Completion>}
 */
const generateCompletion = async ({
  prompt,
}) => {
  if (config.APP_ENV !== 'production') {
    return new Completion({
      text: MOCK_TEXT_OK,
      model: config.OPENAI_COMPLETION_MODEL,
      usage: normalizeUsage(),
    });
  }
  if (!usesLegacyCompletion(config.OPENAI_COMPLETION_MODEL)) {
    const { data } = await createChatCompletion({ messages: prompt.messages });
    const [choice] = data.choices;
    const usage = normalizeUsage(data.usage);
    const model = data.model || config.OPENAI_COMPLETION_MODEL;
    return new Completion({
      text: choice.message.content.trim(),
      finishReason: choice.finish_reason,
      model,
      usage,
      cost: estimateCompletionCost({ model, usage }),
    });
  }
  const { data } = await createTextCompletion({ prompt: prompt.toString() });
  const [choice] = data.choices;
  const usage = normalizeUsage(data.usage);
  const model = data.model || config.OPENAI_COMPLETION_MODEL;
  return new Completion({
    text: choice.text.trim(),
    finishReason: choice.finish_reason,
    model,
    usage,
    cost: estimateCompletionCost({ model, usage }),
  });
};

export default generateCompletion;

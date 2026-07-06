import config from '../config/index.js';
import { MOCK_TEXT_OK } from '../constants/mock.js';
import {
  createChatCompletion, createTextCompletion, FINISH_REASON_STOP,
} from '../services/openai.js';

class Completion {
  text;

  finishReason;

  constructor({
    text,
    finishReason,
  }) {
    this.text = text;
    this.finishReason = finishReason;
  }

  get isFinishReasonStop() {
    return this.finishReason === FINISH_REASON_STOP;
  }
}

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
  if (config.APP_ENV !== 'production') return new Completion({ text: MOCK_TEXT_OK });
  if (!usesLegacyCompletion(config.OPENAI_COMPLETION_MODEL)) {
    const { data } = await createChatCompletion({ messages: prompt.messages });
    const [choice] = data.choices;
    return new Completion({
      text: choice.message.content.trim(),
      finishReason: choice.finish_reason,
    });
  }
  const { data } = await createTextCompletion({ prompt: prompt.toString() });
  const [choice] = data.choices;
  return new Completion({
    text: choice.text.trim(),
    finishReason: choice.finish_reason,
  });
};

export default generateCompletion;

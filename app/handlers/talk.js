import config from '../../config/index.js';
import { t } from '../../locales/index.js';
import { ROLE_AI, ROLE_HUMAN } from '../../services/openai.js';
import { generateCompletion } from '../../utils/index.js';
import { COMMAND_BOT_CONTINUE, COMMAND_BOT_TALK } from '../commands/index.js';
import Context from '../context.js';
import { buildRequestPrompt } from '../prompt/build-request-prompt.js';
import { updateHistory } from '../history/index.js';
import { setPrompt } from '../prompt/index.js';

/**
 * @param {Context} context
 * @returns {boolean}
 */
const check = (context) => (
  context.hasCommand(COMMAND_BOT_TALK)
  || context.hasBotName
  || context.source.bot.isActivated
);

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const exec = (context) => check(context) && (
  async () => {
    const inputText = context.hasCommand(COMMAND_BOT_TALK)
      ? context.getCommandPayload(COMMAND_BOT_TALK)
      : context.route?.requestText || context.trimmedText;
    if (!inputText) {
      context.pushText(t('__ERROR_EMPTY_PROMPT'));
      return context;
    }
    const prompt = buildRequestPrompt({
      contextId: context.id,
      currentText: context.trimmedText,
      includeHistory: context.route?.needsHistory,
    });
    prompt.write(ROLE_HUMAN, `${t('__COMPLETION_DEFAULT_AI_TONE')(config.BOT_TONE)}${inputText}`).write(ROLE_AI);
    try {
      const {
        text,
        isFinishReasonStop,
        model,
        usage,
        cost,
      } = await generateCompletion({ prompt });
      prompt.patch(text);
      setPrompt(context.id, prompt);
      updateHistory(context.id, (history) => history.write(config.BOT_NAME, text));
      const actions = isFinishReasonStop ? [] : [COMMAND_BOT_CONTINUE];
      context.recordUsage({
        kind: 'completion',
        source: 'talk',
        model,
        inputTokens: usage?.promptTokens || 0,
        outputTokens: usage?.completionTokens || 0,
        totalTokens: usage?.totalTokens || 0,
        estimatedCostUsd: cost,
      });
      context.pushText(text, actions);
    } catch (err) {
      context.pushError(err);
    }
    return context;
  }
)();

export default exec;

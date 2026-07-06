import config from '../../config/index.js';
import { t } from '../../locales/index.js';
import { ROLE_AI, ROLE_HUMAN } from '../../services/openai.js';
import { fetchAnswer, generateCompletion } from '../../utils/index.js';
import { COMMAND_BOT_CONTINUE, COMMAND_BOT_SEARCH } from '../commands/index.js';
import Context from '../context.js';
import { buildRequestPrompt } from '../prompt/build-request-prompt.js';
import { updateHistory } from '../history/index.js';
import { setPrompt } from '../prompt/index.js';

/**
 * @param {Context} context
 * @returns {boolean}
 */
const check = (context) => context.hasCommand(COMMAND_BOT_SEARCH) || context.route?.needsWebSearch;

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const exec = (context) => check(context) && (
  async () => {
    const requestText = context.hasCommand(COMMAND_BOT_SEARCH)
      ? context.getCommandPayload(COMMAND_BOT_SEARCH)
      : context.route?.requestText || context.trimmedText;
    if (!requestText) {
      context.pushText(t('__ERROR_EMPTY_PROMPT'));
      return context;
    }
    if (!config.SERPAPI_API_KEY) {
      context.pushText(t('__ERROR_MISSING_ENV')('SERPAPI_API_KEY'));
      return context;
    }
    const prompt = buildRequestPrompt({
      contextId: context.id,
      currentText: context.trimmedText,
      includeHistory: context.route?.needsHistory,
    });
    const query = context.route?.webSearch?.query || requestText;
    const resolvedDateLabel = context.route?.webSearch?.resolvedDate?.label || '';
    try {
      const { answer } = await fetchAnswer(query);
      if (!answer) {
        context.pushText(t('__COMPLETION_SEARCH_NOT_FOUND'));
        return context;
      }
      const content = t('__COMPLETION_SEARCH_WITH_SOURCE')(answer, requestText, resolvedDateLabel);
      prompt.write(ROLE_HUMAN, `${content}`).write(ROLE_AI);
    } catch (err) {
      return context.pushError(err);
    }
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
        source: 'search',
        model,
        inputTokens: usage?.promptTokens || 0,
        outputTokens: usage?.completionTokens || 0,
        totalTokens: usage?.totalTokens || 0,
        estimatedCostUsd: cost,
        query,
      });
      context.pushText(text, actions);
    } catch (err) {
      context.pushError(err);
    }
    return context;
  }
)();

export default exec;

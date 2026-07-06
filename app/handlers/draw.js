import config from '../../config/index.js';
import { MOCK_TEXT_OK } from '../../constants/mock.js';
import { t } from '../../locales/index.js';
import { ROLE_AI, ROLE_HUMAN } from '../../services/openai.js';
import { generateImage } from '../../utils/index.js';
import { COMMAND_BOT_DRAW } from '../commands/index.js';
import Context from '../context.js';
import { saveGeneratedImage } from '../repository/generated-image.js';
import { Prompt } from '../prompt/index.js';
import { updateHistory } from '../history/index.js';
import { setPrompt } from '../prompt/index.js';

/**
 * @param {Context} context
 * @returns {boolean}
 */
const check = (context) => context.hasCommand(COMMAND_BOT_DRAW) || context.route?.needsImageGeneration;

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const exec = (context) => check(context) && (
  async () => {
    const inputText = context.hasCommand(COMMAND_BOT_DRAW)
      ? context.getCommandPayload(COMMAND_BOT_DRAW)
      : context.route?.requestText || context.trimmedText;
    if (!inputText) {
      context.pushText(t('__ERROR_EMPTY_PROMPT'));
      return context;
    }
    const prompt = new Prompt();
    prompt.write(ROLE_HUMAN, `${inputText}`).write(ROLE_AI);
    try {
      const {
        url,
        model,
        size,
        cost,
        b64Json,
        mimeType,
      } = await generateImage({
        prompt: inputText,
        size: config.OPENAI_IMAGE_GENERATION_SIZE,
      });
      prompt.patch(MOCK_TEXT_OK);
      setPrompt(context.id, prompt);
      updateHistory(context.id, (history) => history.write(config.BOT_NAME, MOCK_TEXT_OK));
      let imageUrl = url;
      if (b64Json) {
        if (!config.APP_PUBLIC_URL) {
          throw new Error('APP_PUBLIC_URL is required for image delivery.');
        }
        const record = saveGeneratedImage({
          buffer: Buffer.from(b64Json, 'base64'),
          mimeType,
        });
        imageUrl = `${config.APP_PUBLIC_URL}/generated-images/${record.id}`;
      }
      context.recordUsage({
        kind: 'image',
        source: 'draw',
        model,
        size,
        estimatedCostUsd: cost,
      });
      context.pushImage(imageUrl);
    } catch (err) {
      if (err.message?.toLowerCase().includes('verification')) {
        context.pushText('画像生成を使うには、OpenAI の画像生成モデル利用設定を確認してください。');
        return context;
      }
      context.pushError(err);
    }
    return context;
  }
)();

export default exec;

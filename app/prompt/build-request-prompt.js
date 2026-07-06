import config from '../../config/index.js';
import { ROLE_AI, ROLE_HUMAN } from '../../services/openai.js';
import addMark from '../../utils/add-mark.js';
import { getHistory } from '../history/index.js';
import Prompt from './prompt.js';

const mapHistoryRole = (role) => (role === config.BOT_NAME ? ROLE_AI : ROLE_HUMAN);

const getRecentHistoryMessages = (contextId, currentText = '') => {
  const history = getHistory(contextId);
  const messages = [...history.messages];
  const currentContent = addMark(currentText);
  if (messages.at(-1)?.role !== config.BOT_NAME && messages.at(-1)?.content === currentContent) {
    messages.pop();
  }
  return messages.slice(-config.APP_MAX_PROMPT_MESSAGES);
};

const buildRequestPrompt = ({
  contextId,
  currentText,
  includeHistory = false,
}) => {
  const prompt = new Prompt();
  if (includeHistory) {
    getRecentHistoryMessages(contextId, currentText)
      .forEach(({ role, content }) => prompt.write(mapHistoryRole(role), content));
  }
  return prompt;
};

export {
  buildRequestPrompt,
  getRecentHistoryMessages,
};

export default buildRequestPrompt;

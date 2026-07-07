import { isAllowedSource, replyMessage } from '../utils/index.js';
import config from '../config/index.js';
import {
  activateHandler,
  commandHandler,
  continueHandler,
  deactivateHandler,
  deployHandler,
  docHandler,
  drawHandler,
  forgetHandler,
  enquireHandler,
  reportHandler,
  retryHandler,
  searchHandler,
  talkHandler,
  versionHandler,
} from './handlers/index.js';
import Context from './context.js';
import Event from './models/event.js';
import { buildRoutingDecision } from './routing/index.js';
import { updateHistory } from './history/index.js';

const hasBotName = (text = '') => {
  const botName = config.BOT_NAME.trim();
  if (!botName) return false;
  return text.replaceAll('　', ' ').trim().toLowerCase().startsWith(botName.toLowerCase());
};

const shouldHandleEvent = (event) => {
  if (!event.isGroup) return true;
  if (!event.isText) return false;
  return hasBotName(event.text);
};

const shouldRememberEvent = (event) => {
  if (!event.isGroup || !event.isText || hasBotName(event.text)) return false;
  return isAllowedSource({
    userId: event.userId,
    groupId: event.groupId,
    allowedUserIds: config.APP_ALLOWED_USER_IDS,
    allowedGroupIds: config.APP_ALLOWED_GROUP_IDS,
  }).isAllowed;
};

const rememberEvent = (event) => {
  if (shouldRememberEvent(event)) {
    updateHistory(event.groupId, (history) => history.write(event.userId, event.text));
  }
  return event;
};

/**
 * @param {Context} context
 * @returns {Promise<Context>}
 */
const handleContext = async (context) => {
  context.setRoute(buildRoutingDecision(context));
  const handled = await (
    activateHandler(context)
    || commandHandler(context)
    || continueHandler(context)
    || deactivateHandler(context)
    || deployHandler(context)
    || docHandler(context)
    || drawHandler(context)
    || forgetHandler(context)
    || enquireHandler(context)
    || reportHandler(context)
    || retryHandler(context)
    || searchHandler(context)
    || versionHandler(context)
    || talkHandler(context)
    || context
  );
  return handled.pushCostFooter();
};

const handleEvents = async (events = []) => (
  (Promise.all(
    (await Promise.all(
      (await Promise.all(
        events
          .map((event) => new Event(event))
          .filter((event) => event.isMessage)
          .filter((event) => event.isText || event.isAudio)
          .map((event) => rememberEvent(event))
          .filter((event) => shouldHandleEvent(event))
          .map((event) => new Context(event))
          .map((context) => context.initialize()),
      ))
        .map((context) => (context.error ? context : handleContext(context))),
    ))
      .filter((context) => context.messages.length > 0)
      .map((context) => replyMessage(context)),
  ))
);

export default handleEvents;

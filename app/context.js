import { AxiosError } from 'axios';
import fs from 'fs';
import config from '../config/index.js';
import { t } from '../locales/index.js';
import {
  MESSAGE_TYPE_IMAGE, MESSAGE_TYPE_TEXT, SOURCE_TYPE_GROUP, SOURCE_TYPE_USER,
} from '../services/line.js';
import {
  addMark,
  convertText,
  isAllowedSource,
  fetchAudio,
  fetchGroup,
  fetchUser,
  generateTranscription,
} from '../utils/index.js';
import { Command, COMMAND_BOT_RETRY } from './commands/index.js';
import { updateHistory } from './history/index.js';
import {
  ImageMessage, Message, TemplateMessage, TextMessage,
} from './messages/index.js';
import { Bot, Event, Source } from './models/index.js';
import { getSources, setSources } from './repository/index.js';

class Context {
  /**
   * @type {Event}
   */
  event;

  /**
   * @type {Source}
   */
  source;

  /**
   * @type {string}
   */
  transcription;

  /**
   * @type {Array<Message>}
   */
  messages = [];

  route = null;

  usage = [];

  /**
   * @param {Event} event
   */
  constructor(event) {
    this.event = event;
  }

  get id() {
    if (this.event.isGroup) return this.event.source.groupId;
    return this.event.source.userId;
  }

  /**
   * @returns {string}
   */
  get replyToken() {
    return this.event.replyToken;
  }

  /**
   * @returns {string}
   */
  get groupId() {
    return this.event.groupId;
  }

  /**
   * @returns {string}
   */
  get userId() {
    return this.event.userId;
  }

  get text() {
    if (this.event.isText) return this.event.text;
    if (this.event.isAudio) return this.transcription || '';
    return '';
  }

  get normalizedText() {
    return this.text.replaceAll('　', ' ').trim();
  }

  get textWithoutBotName() {
    const text = this.normalizedText;
    const botName = config.BOT_NAME.trim();
    if (!botName) return text;
    if (!text.toLowerCase().startsWith(botName.toLowerCase())) return text;
    return text.slice(botName.length).trim();
  }

  /**
   * @returns {string}
   */
  get trimmedText() {
    return addMark(this.textWithoutBotName);
  }

  get hasBotName() {
    const botName = config.BOT_NAME.trim();
    if (!botName) return false;
    return this.normalizedText.toLowerCase().startsWith(botName.toLowerCase());
  }

  get hasPromptText() {
    return this.textWithoutBotName.length > 0;
  }

  get shouldHandle() {
    if (!this.event.isGroup) return true;
    return this.hasBotName;
  }

  setRoute(route) {
    this.route = route;
    return this;
  }

  getCommandPayload(command) {
    const candidates = [command.text, ...command.aliases]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    const matched = candidates.find((candidate) => this.trimmedText.toLowerCase().startsWith(candidate.toLowerCase()));
    if (!matched) return this.trimmedText;
    return this.trimmedText.slice(matched.length).trim();
  }

  recordUsage(metric) {
    if (!metric) return this;
    this.usage.push(metric);
    if (config.APP_COST_LOG_ENABLED) {
      console.info(JSON.stringify({
        contextId: this.id,
        userId: this.userId,
        groupId: this.groupId,
        route: this.route?.responseType || null,
        ...metric,
      }));
    }
    return this;
  }

  async initialize() {
    try {
      this.validate();
      await this.register();
    } catch (err) {
      return this.pushError(err);
    }
    if (this.event.isAudio) {
      try {
        await this.transcribe();
      } catch (err) {
        return this.pushError(err);
      }
    }
    if (this.shouldHandle && this.hasPromptText) {
      updateHistory(this.id, (history) => history.write(this.source.name, this.trimmedText));
    }
    return this;
  }

  /**
   * @throws {Error}
   */
  validate() {
    const access = isAllowedSource({
      userId: this.userId,
      groupId: this.event.isGroup ? this.groupId : null,
      allowedUserIds: config.APP_ALLOWED_USER_IDS,
      allowedGroupIds: config.APP_ALLOWED_GROUP_IDS,
    });
    if (!access.isAllowed) {
      const err = new Error('Access denied');
      err.silent = true;
      throw err;
    }
    const sources = getSources();
    const groups = Object.values(sources).filter(({ type }) => type === SOURCE_TYPE_GROUP);
    const users = Object.values(sources).filter(({ type }) => type === SOURCE_TYPE_USER);
    if (this.event.isGroup && !sources[this.groupId] && groups.length >= config.APP_MAX_GROUPS) {
      throw new Error(t('__ERROR_MAX_GROUPS_REACHED'));
    }
    if (!sources[this.userId] && users.length >= config.APP_MAX_USERS) {
      throw new Error(t('__ERROR_MAX_USERS_REACHED'));
    }
  }

  async register() {
    const sources = getSources();
    const newSources = {};
    if (this.event.isGroup && !sources[this.groupId]) {
      const { groupName } = await fetchGroup(this.groupId);
      newSources[this.groupId] = new Source({
        type: SOURCE_TYPE_GROUP,
        name: groupName,
        bot: new Bot({
          isActivated: !config.BOT_DEACTIVATED,
        }),
      });
    }
    if (!sources[this.userId]) {
      const { displayName } = await fetchUser(this.userId);
      newSources[this.userId] = new Source({
        type: SOURCE_TYPE_USER,
        name: displayName,
        bot: new Bot({
          isActivated: !config.BOT_DEACTIVATED,
        }),
      });
    }
    Object.assign(sources, newSources);
    if (Object.keys(newSources).length > 0) await setSources(sources);
    this.source = new Source(sources[this.id]);
  }

  async transcribe() {
    const buffer = await fetchAudio(this.event.messageId);
    const file = `/tmp/${this.event.messageId}.m4a`;
    fs.writeFileSync(file, buffer);
    const { text } = await generateTranscription({ file, buffer });
    this.transcription = convertText(text);
  }

  /**
   * @param {Object} param
   * @param {string} param.text
   * @param {Array<string>} param.aliases
   * @returns {boolean}
   */
  hasCommand({
    text,
    aliases,
  }) {
    const content = this.trimmedText.toLowerCase();
    if (aliases.some((alias) => content.startsWith(alias.toLowerCase()))) return true;
    if (content.startsWith(text.toLowerCase())) return true;
    return false;
  }

  /**
   * @param {string} text
   * @param {Array<Command>} actions
   * @returns {Context}
   */
  pushText(text, actions = []) {
    if (!text) return this;
    const prefix = config.BOT_OUTPUT_PREFIX?.trim();
    const content = prefix && !text.startsWith(prefix) ? `${prefix}\n${text}` : text;
    const message = new TextMessage({
      type: MESSAGE_TYPE_TEXT,
      text: convertText(content),
    });
    message.setQuickReply(actions);
    this.messages.push(message);
    return this;
  }

  /**
   * @param {string} url
   * @param {Array<Command>} actions
   * @returns {Context}
   */
  pushImage(url, actions = []) {
    if (!url) return this;
    const message = new ImageMessage({
      type: MESSAGE_TYPE_IMAGE,
      originalContentUrl: url,
      previewImageUrl: url,
    });
    message.setQuickReply(actions);
    this.messages.push(message);
    return this;
  }

  /**
   * @param {string} url
   * @param {Array<Command>} buttons
   * @param {Array<Command>} actions
   * @returns {Context}
   */
  pushTemplate(text, buttons = [], actions = []) {
    if (!text) return this;
    const message = new TemplateMessage({
      text,
      actions: buttons,
    });
    message.setQuickReply(actions);
    this.messages.push(message);
    return this;
  }

  /**
   * @param {AxiosError} err
   * @returns {Context}
   */
  pushError(err) {
    this.error = err;
    if (err.silent) {
      console.info(err.message);
      return this;
    }
    console.error(this.error);
    if (err.code === 'ECONNABORTED') {
      if (config.ERROR_MESSAGE_DISABLED) return this;
      return this.pushText(t('__ERROR_ECONNABORTED'), [COMMAND_BOT_RETRY]);
    }
    if (err.config?.baseURL && [401, 403].includes(err.response?.status)) {
      if (config.ERROR_MESSAGE_DISABLED) return this;
      return this.pushText(t('__ERROR_INVALID_CREDENTIALS'));
    }
    if (err.response?.status >= 500) {
      if (config.ERROR_MESSAGE_DISABLED) return this;
      return this.pushText(t('__ERROR_UNKNOWN'), [COMMAND_BOT_RETRY]);
    }
    if (err.config?.baseURL || err.response) {
      if (config.ERROR_MESSAGE_DISABLED) return this;
      return this.pushText(t('__ERROR_UNKNOWN'));
    }
    this.pushText(err.message);
    return this;
  }
}

export default Context;

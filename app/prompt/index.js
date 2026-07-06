import Prompt from './prompt.js';

const prompts = new Map();

/**
 * @param {string} contextId
 * @returns {Prompt}
 */
const getPrompt = (contextId) => prompts.get(contextId) || new Prompt();

/**
 * @param {string} contextId
 * @param {Prompt} prompt
 */
const setPrompt = (contextId, prompt) => {
  prompts.set(contextId, prompt);
};

/**
 * @param {string} contextId
 */
const removePrompt = (contextId) => {
  prompts.delete(contextId);
};

const printPrompts = () => {
  if (Array.from(prompts.keys()).length < 1) return;
  const content = Array.from(prompts.keys()).map((contextId) => `\n=== ${contextId.slice(0, 6)} ===\n${getPrompt(contextId)}\n`).join('');
  console.info(content);
};

export {
  Prompt,
  getPrompt,
  setPrompt,
  removePrompt,
  printPrompts,
};

export default prompts;

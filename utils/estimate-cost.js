import config from '../config/index.js';

const COMPLETION_PRICES_PER_1M = {
  'gpt-5.5': { input: 2.5, output: 15 },
  'gpt-5.4': { input: 1.25, output: 7.5 },
  'gpt-5.4-mini': { input: 0.375, output: 2.25 },
  'gpt-5.4-nano': { input: 0.1, output: 0.625 },
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, output: 0.4 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
};

const WEB_SEARCH_TOOL_CALL_PRICE_USD = 0.025;

const findPricing = (prices, model = '') => {
  if (prices[model]) return prices[model];
  const matched = Object.keys(prices)
    .sort((a, b) => b.length - a.length)
    .find((key) => model.startsWith(key));
  return matched ? prices[matched] : {};
};

const IMAGE_PRICES = {
  'gpt-image-2': { input: 8, output: 30 },
  'gpt-image-1.5': { input: 8, output: 32 },
  'gpt-image-1-mini': { input: 2.5, output: 8 },
};

const roundUsd = (value) => (Number.isFinite(value) ? Number(value.toFixed(6)) : null);

const estimateCompletionCost = ({
  model,
  usage,
  inputPricePer1M = config.OPENAI_COMPLETION_INPUT_PRICE_PER_1M,
  outputPricePer1M = config.OPENAI_COMPLETION_OUTPUT_PRICE_PER_1M,
} = {}) => {
  const defaultPricing = findPricing(COMPLETION_PRICES_PER_1M, model);
  const pricing = {
    ...defaultPricing,
    ...(Number.isFinite(inputPricePer1M) ? { input: inputPricePer1M } : {}),
    ...(Number.isFinite(outputPricePer1M) ? { output: outputPricePer1M } : {}),
  };
  if (!Number.isFinite(pricing.input) || !Number.isFinite(pricing.output)) return null;
  const promptTokens = usage?.promptTokens || 0;
  const completionTokens = usage?.completionTokens || 0;
  return roundUsd(((promptTokens / 1_000_000) * pricing.input) + ((completionTokens / 1_000_000) * pricing.output));
};

const estimateImageCost = ({
  model = config.OPENAI_IMAGE_MODEL,
  imageTokenUsage,
  textTokenUsage,
} = {}) => {
  const pricing = findPricing(IMAGE_PRICES, model);
  if (!Number.isFinite(pricing.input) || !Number.isFinite(pricing.output)) return null;
  const imageTokens = imageTokenUsage || 0;
  const textTokens = textTokenUsage || 0;
  return roundUsd(((imageTokens / 1_000_000) * pricing.input) + ((textTokens / 1_000_000) * pricing.output));
};

export {
  COMPLETION_PRICES_PER_1M,
  IMAGE_PRICES,
  WEB_SEARCH_TOOL_CALL_PRICE_USD,
  estimateCompletionCost,
  estimateImageCost,
};

export default estimateCompletionCost;

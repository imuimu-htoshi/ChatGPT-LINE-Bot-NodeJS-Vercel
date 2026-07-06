import config from '../config/index.js';
import { MOCK_TEXT_OK } from '../constants/mock.js';
import { createImage } from '../services/openai.js';
import { estimateImageCost } from './estimate-cost.js';

class Image {
  url;

  model;

  size;

  cost;

  b64Json;

  mimeType;

  constructor({
    url,
    model = config.OPENAI_IMAGE_MODEL || 'legacy-image',
    size = config.OPENAI_IMAGE_GENERATION_SIZE,
    cost = null,
    b64Json = null,
    mimeType = `image/${config.OPENAI_IMAGE_OUTPUT_FORMAT}`,
  }) {
    this.url = url;
    this.model = model;
    this.size = size;
    this.cost = cost;
    this.b64Json = b64Json;
    this.mimeType = mimeType;
  }
}

/**
 * @param {Object} param
 * @param {string} param.prompt
 * @param {string} param.size
 * @returns {Promise<Image>}
 */
const generateImage = async ({
  prompt,
  size,
}) => {
  if (config.APP_ENV !== 'production') return new Image({ url: MOCK_TEXT_OK });
  const { data } = await createImage({ prompt, size });
  const [image] = data.data;
  const model = data.model || config.OPENAI_IMAGE_MODEL || 'legacy-image';
  const cost = estimateImageCost({
    model,
    imageTokenUsage: data.usage?.input_tokens_details?.image_tokens,
    textTokenUsage: data.usage?.input_tokens_details?.text_tokens,
  });
  return new Image({
    ...image,
    model,
    size,
    cost,
    b64Json: image.b64_json || null,
    mimeType: `image/${config.OPENAI_IMAGE_OUTPUT_FORMAT}`,
  });
};

export default generateImage;

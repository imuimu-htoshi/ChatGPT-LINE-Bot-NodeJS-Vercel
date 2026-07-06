import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const GENERATED_IMAGE_TTL_MS = 60 * 60 * 1000;
const GENERATED_IMAGE_DIR = '/tmp/generated-images';

const records = globalThis.__generatedImages || new Map();
globalThis.__generatedImages = records;

const ensureDir = () => {
  if (!fs.existsSync(GENERATED_IMAGE_DIR)) {
    fs.mkdirSync(GENERATED_IMAGE_DIR, { recursive: true });
  }
};

const getFilePath = (id) => path.join(GENERATED_IMAGE_DIR, id);

const isExpired = (record) => !record || record.expiresAt <= Date.now();

const cleanup = () => {
  Array.from(records.entries()).forEach(([id, record]) => {
    if (!isExpired(record)) return;
    records.delete(id);
    const filePath = getFilePath(id);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
};

const saveGeneratedImage = ({
  buffer,
  mimeType = 'image/jpeg',
}) => {
  ensureDir();
  cleanup();
  const id = randomUUID();
  const filePath = getFilePath(id);
  fs.writeFileSync(filePath, buffer);
  records.set(id, {
    id,
    filePath,
    mimeType,
    expiresAt: Date.now() + GENERATED_IMAGE_TTL_MS,
  });
  return records.get(id);
};

const getGeneratedImage = (id) => {
  cleanup();
  const record = records.get(id);
  if (!record || isExpired(record)) return null;
  if (!fs.existsSync(record.filePath)) return null;
  return record;
};

export {
  getGeneratedImage,
  saveGeneratedImage,
};

export default records;

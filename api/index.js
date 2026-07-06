import express from 'express';
import { handleEvents, printPrompts } from '../app/index.js';
import { getGeneratedImage } from '../app/repository/generated-image.js';
import config from '../config/index.js';
import { validateLineSignature } from '../middleware/index.js';
import storage from '../storage/index.js';
import { fetchVersion, getVersion } from '../utils/index.js';

const app = express();

app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));

app.get('/', (req, res) => {
  if (config.APP_URL) {
    res.redirect(config.APP_URL);
    return;
  }
  res.sendStatus(200);
});

app.get('/info', async (req, res) => {
  const currentVersion = getVersion();
  const latestVersion = await fetchVersion();
  res.status(200).send({ currentVersion, latestVersion });
});

app.get('/generated-images/:id', (req, res) => {
  const record = getGeneratedImage(req.params.id);
  if (!record) {
    res.sendStatus(404);
    return;
  }
  res.setHeader('Content-Type', record.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
  res.sendFile(record.filePath);
});

app.post(config.APP_WEBHOOK_PATH, validateLineSignature, async (req, res) => {
  try {
    await storage.initialize();
    await handleEvents(req.body.events);
    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
  if (config.APP_DEBUG) printPrompts();
});

if (config.APP_PORT) {
  app.listen(config.APP_PORT);
}

export default app;

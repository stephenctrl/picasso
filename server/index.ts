import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer } from 'node:http';
import { aiConfiguration, suggest } from './ai';
import { parseRequest } from './validation';

const root = fileURLToPath(new URL('..', import.meta.url));
const app = express();
const httpServer = createHttpServer(app);
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(req.hostname)) {
    res.status(403).json({ error: 'Picasso only accepts local hostnames.' });
    return;
  }
  const origin = req.get('origin');
  if (req.path.startsWith('/api/') && origin && origin !== `http://${req.get('host')}`) {
    res.status(403).json({ error: 'Cross-origin API requests are not allowed.' });
    return;
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => {
  const config = aiConfiguration();
  res.json({ ok: true, aiConfigured: Boolean(config.key), model: config.model });
});
app.post('/api/suggest', async (req, res) => {
  let input;
  try {
    input = parseRequest(req.body);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid design request.' });
    return;
  }
  if (!aiConfiguration().key) {
    res.status(503).json({ error: 'AI is not configured. Copy .env.example to .env, set GEMINI_API_KEY, and restart Picasso. Your editor works without AI.' });
    return;
  }
  const controller = new AbortController();
  const cancelDisconnectedRequest = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', cancelDisconnectedRequest);
  try {
    const suggestion = await suggest(input.project, input.instruction, controller.signal);
    if (!controller.signal.aborted) res.json({ suggestion });
  } catch (error) {
    if (controller.signal.aborted) return;
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    res.status(timeout ? 504 : 502).json({ error: timeout ? 'The AI request timed out. Your canvas is unchanged; try again.' : error instanceof Error ? error.message : 'The AI request failed.' });
  } finally {
    res.off('close', cancelDisconnectedRequest);
  }
});
app.use('/api', (_req, res) => { res.status(404).json({ error: 'Unknown API endpoint.' }); });

if (process.argv.includes('--production')) {
  app.use(express.static(path.join(root, 'dist')));
  app.get('/{*path}', (_req, res) => { res.sendFile(path.join(root, 'dist', 'index.html')); });
} else {
  const vite = await createServer({ root, server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.use((error: { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  res.status(error.status === 413 ? 413 : 400).json({ error: error.status === 413 ? 'Project is too large (maximum 1 MB).' : 'Invalid request body.' });
});
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
httpServer.listen(port, '127.0.0.1', () => { console.log(`Picasso is ready at http://127.0.0.1:${port}`); });

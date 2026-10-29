import 'dotenv/config';
import express from 'express';
import type { ViteDevServer } from 'vite';
import { createServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer } from 'node:http';
import { promisify } from 'node:util';
import { AiError, aiConfiguration, suggest } from './ai';
import { parseRequest } from './validation';
import { handleRequestError } from './errors';
import { parsePort, serverFailureMessage } from './startup';

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
app.use(express.json({ limit: '8mb' }));
app.get('/api/health', (_req, res) => {
  const config = aiConfiguration();
  res.json({
    ok: true, aiConfigured: !config.configurationError, model: config.model,
    configurationScope: 'local', configurationError: config.configurationError,
  });
});
app.post('/api/suggest', async (req, res) => {
  let input;
  try {
    input = parseRequest(req.body);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid design request.' });
    return;
  }
  const controller = new AbortController();
  const cancelDisconnectedRequest = () => { if (!res.writableEnded) controller.abort(); };
  res.on('close', cancelDisconnectedRequest);
  try {
    const suggestion = await suggest(input.project, input.instruction, controller.signal, input);
    if (!controller.signal.aborted) res.json({ suggestion });
  } catch (error) {
    if (controller.signal.aborted) return;
    res.status(error instanceof AiError ? error.status : 502).json({
      error: error instanceof AiError ? error.message : 'The AI request failed. Your canvas is unchanged; check the server configuration and connection.',
    });
  } finally {
    res.off('close', cancelDisconnectedRequest);
  }
});
app.use('/api', (_req, res) => { res.status(404).json({ error: 'Unknown API endpoint.' }); });

let port: number | undefined;
let vite: ViteDevServer | undefined;
let shuttingDown = false;

async function stopAfterFailure(error: unknown): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = 1;
  console.error(serverFailureMessage(error, port));
  const httpClosed = promisify(httpServer.close.bind(httpServer))().catch((closeError: NodeJS.ErrnoException) => {
    if (closeError.code !== 'ERR_SERVER_NOT_RUNNING') throw closeError;
  });
  httpServer.closeAllConnections();
  const cleanup = await Promise.allSettled([
    (async () => { await vite?.close(); })(),
    httpClosed,
  ]);
  if (cleanup.some((result) => result.status === 'rejected')) {
    console.error('Picasso could not fully close its server resources; the process will now exit.');
  }
  process.exit(1);
}

httpServer.on('error', (error) => { void stopAfterFailure(error); });

async function start(): Promise<void> {
  try {
    port = parsePort(process.env.PORT);
    if (process.argv.includes('--production')) {
      app.use(express.static(path.join(root, 'dist')));
      app.get('/{*path}', (_req, res) => { res.sendFile(path.join(root, 'dist', 'index.html')); });
    } else {
      vite = await createServer({ root, server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'spa' });
      if (shuttingDown) {
        await vite.close();
        return;
      }
      app.use(vite.middlewares);
    }
    app.use(handleRequestError);
    httpServer.listen(port, '127.0.0.1', () => {
      if (!shuttingDown) console.log(`Picasso is ready at http://127.0.0.1:${port}`);
    });
  } catch (error) {
    await stopAfterFailure(error);
  }
}

await start();

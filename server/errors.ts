import { constants } from 'node:zlib';
import type { ErrorRequestHandler, Request } from 'express';

const brotliFormatErrors = new Map(
  Object.entries(constants)
    .filter(([name]) => name.startsWith('BROTLI_DECODER_ERROR_FORMAT_'))
    .map(([name, errno]) => [name.replace('BROTLI_DECODER', 'ERR_'), errno]),
);

function isMalformedCompressedBody(error: unknown, req: Request): boolean {
  if (!(error instanceof Error)) return false;
  const inflaterError = error as Error & {
    status?: unknown; statusCode?: unknown; expose?: unknown; code?: unknown; errno?: unknown;
  };
  // body-parser wraps native inflater errors with http-errors, but leaves type unset.
  // Require its 400 envelope, the request encoding, and a known native data-error pair.
  if (inflaterError.status !== 400 || inflaterError.statusCode !== 400 || inflaterError.expose !== true) return false;
  const encoding = req.headers['content-encoding']?.toLowerCase();
  if (encoding !== 'gzip' && encoding !== 'deflate' && encoding !== 'br') return false;
  if (inflaterError.code === 'Z_BUF_ERROR' && inflaterError.errno === constants.Z_BUF_ERROR) return true;
  if (encoding === 'br') {
    return typeof inflaterError.code === 'string'
      && brotliFormatErrors.has(inflaterError.code)
      && brotliFormatErrors.get(inflaterError.code) === inflaterError.errno;
  }
  return (inflaterError.code === 'Z_DATA_ERROR' && inflaterError.errno === constants.Z_DATA_ERROR)
    || (encoding === 'deflate' && inflaterError.code === 'Z_NEED_DICT' && inflaterError.errno === constants.Z_NEED_DICT);
}

export const handleRequestError: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const type = error && typeof error === 'object' && 'type' in error ? error.type : undefined;
  if (type === 'request.aborted' && req.aborted) return;

  switch (type) {
    case 'entity.parse.failed':
    case 'request.aborted':
    case 'request.size.invalid':
      res.status(400).json({ error: 'Invalid request body.' });
      return;
    case 'entity.too.large':
      res.status(413).json({ error: 'Request is too large (maximum 8 MiB including images and project JSON).' });
      return;
    case 'charset.unsupported':
    case 'encoding.unsupported':
      res.status(415).json({ error: 'Unsupported request body charset or encoding. Send UTF-8 JSON with a supported content encoding.' });
      return;
    default:
      if (type === undefined && isMalformedCompressedBody(error, req)) {
        res.status(400).json({ error: 'Invalid request body.' });
        return;
      }
      console.error('Picasso could not complete a request due to an internal server error.');
      res.status(500).json({ error: 'The server could not complete the request. Please try again.' });
  }
};

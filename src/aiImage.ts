import type { Project } from './types';
import { projectSvg } from './export';

const maxImageBytes = 2 * 1024 * 1024;
const maxReferenceBytes = 5 * 1024 * 1024;
const maxImageEdge = 1600;

async function rasterImage(blob: Blob, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const image = new Image();
  const abort = () => { image.src = ''; };
  signal.addEventListener('abort', abort, { once: true });
  try {
    image.src = url;
    try {
      await image.decode();
    } catch {
      signal.throwIfAborted();
      throw new Error('This image could not be read. Choose an unmodified PNG, JPEG or WebP image.');
    }
    signal.throwIfAborted();
    const scale = Math.min(1, maxImageEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser cannot prepare an image for AI. Local editing and exports remain available.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/jpeg', 0.85);
    if (!data.startsWith('data:image/jpeg;base64,') || (data.length - data.indexOf(',') - 1) * 3 / 4 > maxImageBytes) {
      throw new Error('The prepared image exceeds 2 MiB. Choose a smaller or simpler design image.');
    }
    return data;
  } finally {
    signal.removeEventListener('abort', abort);
    image.src = '';
    URL.revokeObjectURL(url);
  }
}

export function projectImage(project: Project, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  return rasterImage(new Blob([projectSvg(project)], { type: 'image/svg+xml' }), signal);
}

export async function referenceImage(file: File, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a PNG, JPEG or WebP reference design.');
  }
  if (!file.size || file.size > maxReferenceBytes) throw new Error('Reference designs must be nonempty and no larger than 5 MiB.');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  signal.throwIfAborted();
  const png = bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!(file.type === 'image/png' && png || file.type === 'image/jpeg' && jpeg || file.type === 'image/webp' && webp)) {
    throw new Error('The file contents do not match its PNG, JPEG or WebP format. Choose an unmodified design image.');
  }
  return rasterImage(file, signal);
}

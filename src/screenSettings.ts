export type ScreenRatioResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: string };

export function screenDimensionsFromRatio(ratioWidth: number, ratioHeight: number, width: number): ScreenRatioResult {
  if (!Number.isFinite(ratioWidth) || !Number.isFinite(ratioHeight) || ratioWidth <= 0 || ratioHeight <= 0) {
    return { ok: false, error: 'Enter positive, finite numbers for both sides of the aspect ratio.' };
  }
  if (!Number.isFinite(width) || width < 240 || width > 4000) {
    return { ok: false, error: 'Enter a screen width from 240 to 4,000 document units.' };
  }
  const height = width * (ratioHeight / ratioWidth);
  if (!Number.isFinite(height) || height < 240 || height > 4000) {
    return { ok: false, error: 'This ratio and width put the height outside 240–4,000. Change the ratio or screen width.' };
  }
  return { ok: true, width, height: Math.round(height) };
}

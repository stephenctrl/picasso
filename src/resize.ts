import { clamp } from './document';
import type { DesignElement } from './types';

export const resizeDirections = [
  { direction: 'n', label: 'top edge' },
  { direction: 'ne', label: 'top-right corner' },
  { direction: 'e', label: 'right edge' },
  { direction: 'se', label: 'bottom-right corner' },
  { direction: 's', label: 'bottom edge' },
  { direction: 'sw', label: 'bottom-left corner' },
  { direction: 'w', label: 'left edge' },
  { direction: 'nw', label: 'top-left corner' },
] as const;
export type ResizeDirection = typeof resizeDirections[number]['direction'];
type ResizeBounds = Pick<DesignElement, 'x' | 'y' | 'width' | 'height'>;

// Clamp the moving edge, not the anchor: position and size must remain valid together.
function resizeAxis(position: number, size: number, delta: number, leading: boolean): [number, number] {
  if (!leading) return [position, clamp(size + Math.round(delta), 1, 4000)];
  const anchor = position + size;
  const nextSize = clamp(size - Math.round(delta), Math.max(1, anchor - 8000), Math.min(4000, anchor + 4000));
  return [anchor - nextSize, nextSize];
}

export function resizeBounds(bounds: ResizeBounds, direction: ResizeDirection, dx: number, dy: number): ResizeBounds {
  let { x, y, width, height } = bounds;
  if (direction.includes('w') || direction.includes('e')) [x, width] = resizeAxis(x, width, dx, direction.includes('w'));
  if (direction.includes('n') || direction.includes('s')) [y, height] = resizeAxis(y, height, dy, direction.includes('n'));
  return { x, y, width, height };
}

// Six screen pixels at every zoom, capped to preserve an interior on tiny layers.
export function resizeHitArea(width: number, height: number, scale: number) {
  return { x: Math.min(6 / scale, width / 4), y: Math.min(6 / scale, height / 4) };
}

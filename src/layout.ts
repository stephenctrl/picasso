import type { DesignElement, Project } from './types';

export type LayoutAction = 'align-left' | 'align-center' | 'align-right' | 'align-top' | 'align-middle' | 'align-bottom' | 'arrange-horizontal' | 'arrange-vertical' | 'arrange-grid';
export interface AlignmentGuide { axis: 'x' | 'y'; position: number }

/** Align one layer to the screen, or multiple layers to their shared bounds. */
export function applyLayout(project: Project, selectedIds: readonly string[], action: LayoutAction): DesignElement[] {
  const ids = new Set(selectedIds);
  const selected = project.elements.filter(element => ids.has(element.id));
  if (!selected.length) return project.elements;
  const left = Math.min(...selected.map(element => element.x));
  const top = Math.min(...selected.map(element => element.y));
  const right = Math.max(...selected.map(element => element.x + element.width));
  const bottom = Math.max(...selected.map(element => element.y + element.height));
  const placements = new Map<string, { x: number; y: number }>();

  if (action.startsWith('align-')) {
    const bounds = selected.length === 1
      ? { left: 0, top: 0, right: project.width, bottom: project.height }
      : { left, top, right, bottom };
    for (const element of selected) {
      let { x, y } = element;
      switch (action) {
        case 'align-left': x = bounds.left; break;
        case 'align-center': x = (bounds.left + bounds.right - element.width) / 2; break;
        case 'align-right': x = bounds.right - element.width; break;
        case 'align-top': y = bounds.top; break;
        case 'align-middle': y = (bounds.top + bounds.bottom - element.height) / 2; break;
        case 'align-bottom': y = bounds.bottom - element.height; break;
      }
      if (x < -4000 || x > 8000 || y < -4000 || y > 8000) throw new Error('This alignment exceeds the supported coordinates. Move the selected layers closer to the screen first.');
      placements.set(element.id, { x, y });
    }
  } else {
    if (selected.length < 2) return project.elements;
    const gap = 24;
    let columns = action === 'arrange-vertical' ? 1 : selected.length;
    let columnWidths: number[] = [];
    let rowHeights: number[] = [];
    let totalWidth = 0;
    let totalHeight = 0;
    let bestScore = Infinity;
    const first = action === 'arrange-grid' ? 1 : columns;
    const last = action === 'arrange-grid' ? selected.length : columns;
    for (let candidate = first; candidate <= last; candidate += 1) {
      const widths = Array<number>(candidate).fill(0);
      const heights = Array<number>(Math.ceil(selected.length / candidate)).fill(0);
      selected.forEach((element, index) => {
        widths[index % candidate] = Math.max(widths[index % candidate], element.width);
        heights[Math.floor(index / candidate)] = Math.max(heights[Math.floor(index / candidate)], element.height);
      });
      const width = widths.reduce((sum, size) => sum + size, 0) + gap * (widths.length - 1);
      const height = heights.reduce((sum, size) => sum + size, 0) + gap * (heights.length - 1);
      if (width > project.width || height > project.height) continue;
      const score = Math.abs(Math.log((width / height) / (project.width / project.height)));
      if (score < bestScore) {
        bestScore = score;
        columns = candidate;
        columnWidths = widths;
        rowHeights = heights;
        totalWidth = width;
        totalHeight = height;
      }
    }
    if (!Number.isFinite(bestScore)) throw new Error('These layers do not fit in this arrangement without resizing. Choose fewer layers or enlarge the screen.');
    const marginX = Math.min(24, (project.width - totalWidth) / 2);
    const marginY = Math.min(24, (project.height - totalHeight) / 2);
    const originX = Math.max(marginX, Math.min(left, project.width - marginX - totalWidth));
    const originY = Math.max(marginY, Math.min(top, project.height - marginY - totalHeight));
    const columnOffsets = [originX];
    const rowOffsets = [originY];
    for (let index = 1; index < columnWidths.length; index += 1) columnOffsets.push(columnOffsets[index - 1] + columnWidths[index - 1] + gap);
    for (let index = 1; index < rowHeights.length; index += 1) rowOffsets.push(rowOffsets[index - 1] + rowHeights[index - 1] + gap);
    selected.forEach((element, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      placements.set(element.id, {
        x: columnOffsets[column] + (columnWidths[column] - element.width) / 2,
        y: rowOffsets[row] + (rowHeights[row] - element.height) / 2,
      });
    });
  }
  let changed = false;
  const elements = project.elements.map(element => {
    const placement = placements.get(element.id);
    if (!placement || (placement.x === element.x && placement.y === element.y)) return element;
    changed = true;
    return { ...element, ...placement };
  });
  return changed ? elements : project.elements;
}

/** Snap the dragged bounds to nearby screen/layer anchors; tolerance is in document units. */
export function getAlignmentGuides(project: Project, element: DesignElement, tolerance: number): { x: number; y: number; guides: AlignmentGuide[] } {
  const threshold = Number.isFinite(tolerance) ? Math.max(0, tolerance) : 0;
  let x = element.x;
  let y = element.y;
  let distanceX = threshold + Number.EPSILON;
  let distanceY = threshold + Number.EPSILON;
  let guideX: number | undefined;
  let guideY: number | undefined;
  const xAnchors = [element.x, element.x + element.width / 2, element.x + element.width];
  const yAnchors = [element.y, element.y + element.height / 2, element.y + element.height];
  const targets = [{ x: 0, y: 0, width: project.width, height: project.height }, ...project.elements.filter(other => other.id !== element.id)];
  for (const target of targets) {
    for (const anchor of [target.x, target.x + target.width / 2, target.x + target.width]) {
      for (const current of xAnchors) {
        const delta = anchor - current;
        const distance = Math.abs(delta);
        const position = element.x + delta;
        if (distance <= threshold && distance < distanceX && position >= -4000 && position <= 8000) {
          distanceX = distance; x = position; guideX = anchor;
        }
      }
    }
    for (const anchor of [target.y, target.y + target.height / 2, target.y + target.height]) {
      for (const current of yAnchors) {
        const delta = anchor - current;
        const distance = Math.abs(delta);
        const position = element.y + delta;
        if (distance <= threshold && distance < distanceY && position >= -4000 && position <= 8000) {
          distanceY = distance; y = position; guideY = anchor;
        }
      }
    }
  }
  const guides: AlignmentGuide[] = [];
  if (guideX !== undefined) guides.push({ axis: 'x', position: guideX });
  if (guideY !== undefined) guides.push({ axis: 'y', position: guideY });
  return { x, y, guides };
}

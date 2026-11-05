import type { DesignElement, Project } from '../../types';

// Project v1 is a fixed, validated schema. Compare content without serializing or
// allocating key lists, and skip immutable layers that have not changed.
export function sameElementContent(left: DesignElement, right: DesignElement): boolean {
  return left === right || (
    left.id === right.id && left.type === right.type && left.name === right.name &&
    left.x === right.x && left.y === right.y && left.width === right.width && left.height === right.height &&
    left.fill === right.fill && left.text === right.text && left.textColor === right.textColor &&
    left.fontSize === right.fontSize && left.borderRadius === right.borderRadius
  );
}

export function sameProjectContent(left: Project, right: Project): boolean {
  if (left === right) return true;
  if (left.version !== right.version || left.name !== right.name || left.width !== right.width ||
    left.height !== right.height || left.background !== right.background || left.elements.length !== right.elements.length) return false;
  if (left.elements === right.elements) return true;
  for (let index = 0; index < left.elements.length; index += 1) {
    if (!sameElementContent(left.elements[index], right.elements[index])) return false;
  }
  return true;
}

import type { DesignElement, Project, Suggestion } from '../src/types';

const color = /^#[0-9a-f]{6}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object.');
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`Invalid ${label}.`);
  return value;
}
function number(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${label}.`);
  return value;
}
function hex(value: unknown): string {
  if (typeof value !== 'string' || !color.test(value)) throw new Error('Colors must use six-digit hex values.');
  return value;
}
export function parseElements(value: unknown): DesignElement[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error('A project supports up to 200 elements.');
  const ids = new Set<string>();
  return value.map((entry): DesignElement => {
    const e = object(entry);
    const id = text(e.id, 120, 'element id');
    if (!id || ids.has(id)) throw new Error('Element IDs must be nonempty and unique.');
    ids.add(id);
    if (e.type !== 'rectangle' && e.type !== 'text' && e.type !== 'button') throw new Error('Unsupported element type.');
    return {
      id, type: e.type, name: text(e.name, 120, 'element name'),
      x: number(e.x, -4000, 8000, 'x'), y: number(e.y, -4000, 8000, 'y'),
      width: number(e.width, 1, 4000, 'element width'), height: number(e.height, 1, 4000, 'element height'),
      fill: hex(e.fill), text: text(e.text, 2000, 'element text'), textColor: hex(e.textColor),
      fontSize: number(e.fontSize, 1, 300, 'font size'), borderRadius: number(e.borderRadius, 0, 2000, 'corner radius'),
    };
  });
}
export function parseProject(value: unknown): Project {
  const p = object(value);
  if (p.version !== 1) throw new Error('Unsupported project version.');
  return {
    version: 1, name: text(p.name, 120, 'project name'),
    width: number(p.width, 240, 4000, 'artboard width'), height: number(p.height, 240, 4000, 'artboard height'),
    background: hex(p.background), elements: parseElements(p.elements),
  };
}
export function parseSuggestion(value: unknown): Suggestion {
  const s = object(value);
  const elements = parseElements(s.elements);
  if (!elements.length) throw new Error('The AI returned an empty design.');
  return { title: text(s.title, 120, 'suggestion title'), rationale: text(s.rationale, 2000, 'suggestion rationale'), elements };
}
export function parseRequest(value: unknown): { project: Project; instruction: string } {
  const request = object(value);
  return { project: parseProject(request.project), instruction: text(request.instruction, 2000, 'AI direction') };
}

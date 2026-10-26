import type { DesignElement, Project, Suggestion } from './types';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a project object.');
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label} must be text with at most ${max} characters.`);
  return value;
}

function number(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a finite number from ${min} to ${max}.`);
  }
  return value;
}

function color(value: unknown): string {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Colors must use six-digit hex values, such as #253C32.');
  return value;
}

export function parseElements(value: unknown): DesignElement[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error('The project must contain an array of at most 200 elements.');
  const ids = new Set<string>();
  return value.map((entry, index) => {
    const element = object(entry);
    const id = text(element.id, 120, `Element ${index + 1} ID`);
    if (!id || ids.has(id)) throw new Error('Each element needs a nonempty, unique ID.');
    ids.add(id);
    if (element.type !== 'rectangle' && element.type !== 'text' && element.type !== 'button') throw new Error(`Element ${index + 1} has an unsupported type.`);
    return {
      id, type: element.type, name: text(element.name, 120, 'Element name'),
      x: number(element.x, -4000, 8000, 'X position'), y: number(element.y, -4000, 8000, 'Y position'),
      width: number(element.width, 1, 4000, 'Element width'), height: number(element.height, 1, 4000, 'Element height'),
      fill: color(element.fill), text: text(element.text, 2000, 'Element text'), textColor: color(element.textColor),
      fontSize: number(element.fontSize, 1, 300, 'Font size'), borderRadius: number(element.borderRadius, 0, 2000, 'Corner radius'),
    };
  });
}

export function parseProject(value: unknown): Project {
  const project = object(value);
  if (project.version !== 1) throw new Error('Unsupported project version. Import a Picasso version 1 project.');
  return {
    version: 1, name: text(project.name, 120, 'Project name'),
    width: number(project.width, 240, 4000, 'Artboard width'), height: number(project.height, 240, 4000, 'Artboard height'),
    background: color(project.background), elements: parseElements(project.elements),
  };
}

export function parseSuggestion(value: unknown): Suggestion {
  const suggestion = object(value);
  const elements = parseElements(suggestion.elements);
  if (!elements.length) throw new Error('The AI returned an empty design. Request a new suggestion.');
  return {
    title: text(suggestion.title, 120, 'Suggestion title'),
    rationale: text(suggestion.rationale, 2000, 'Suggestion rationale'),
    elements,
  };
}

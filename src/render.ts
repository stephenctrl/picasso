import type { CSSProperties } from 'react';
import type { DesignElement, Project } from './types';
import { parseProject } from './validation';

export type HtmlTag = 'div' | 'p' | 'button';

export interface ProjectCode {
  html: string;
  css: string;
  document: string;
  nodes: Array<{ elementId: string; selector: string; html: string; css: string }>;
}

const ROOT_CLASS = 'picasso-root';
const FONT_FAMILY = '"Segoe UI", Arial, sans-serif';
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '\r': '&#13;',
};

function escapeHtml(value: string): string {
  return value
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '\uFFFD')
    .replace(/[&<>"'\r]/g, character => HTML_ENTITIES[character]);
}

export function elementTag(element: DesignElement): HtmlTag {
  return element.type === 'rectangle' ? 'div' : element.type === 'text' ? 'p' : 'button';
}

export function elementClass(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error('Element index must be a nonnegative safe integer.');
  return `picasso-node-${index}`;
}

/** The same complete appearance description is used by React and exported CSS. */
export function elementStyles(element: DesignElement): CSSProperties {
  const button = element.type === 'button';
  return {
    position: 'absolute',
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    minWidth: 0,
    minHeight: 0,
    maxWidth: 'none',
    maxHeight: 'none',
    margin: 0,
    padding: 0,
    border: '0 solid transparent',
    boxSizing: 'border-box',
    appearance: 'none',
    borderRadius: Math.min(element.borderRadius, element.width / 2, element.height / 2),
    background: element.fill,
    color: element.textColor,
    display: button ? 'flex' : 'block',
    alignItems: button ? 'center' : 'normal',
    justifyContent: button ? 'center' : 'normal',
    overflow: 'hidden',
    fontFamily: FONT_FAMILY,
    fontSize: element.fontSize,
    fontWeight: button ? 500 : 400,
    fontStyle: 'normal',
    fontVariant: 'normal',
    fontStretch: 'normal',
    fontSynthesis: 'none',
    fontFeatureSettings: 'normal',
    fontVariationSettings: 'normal',
    fontKerning: 'normal',
    lineHeight: button ? 1.2 : 1.18,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'normal',
    wordBreak: 'normal',
    hyphens: 'none',
    textAlign: button ? 'center' : 'left',
    textAlignLast: 'auto',
    textIndent: 0,
    textTransform: 'none',
    textDecoration: 'none',
    textShadow: 'none',
    letterSpacing: element.type === 'text' ? -element.fontSize * 0.02 : 0,
    wordSpacing: 0,
    tabSize: 8,
    direction: 'ltr',
    unicodeBidi: 'plaintext',
    writingMode: 'horizontal-tb',
    textOrientation: 'mixed',
    textRendering: 'optimizeLegibility',
    WebkitFontSmoothing: 'antialiased',
    boxShadow: 'none',
    opacity: 1,
    transform: 'none',
    cursor: button ? 'pointer' : 'auto',
  };
}

// Only the controlled property descriptions above enter CSS. Colors and numeric
// dimensions are checked by the existing v1 parser before serialization.
function rule(selector: string, styles: CSSProperties): string {
  const declarations = Object.entries(styles).map(([property, value]) => {
    const name = property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    const unitless = property === 'fontWeight' || property === 'lineHeight' || property === 'tabSize' || property === 'opacity';
    const serialized = typeof value === 'number' && !unitless ? `${value}px` : String(value);
    return `  ${name}: ${serialized};`;
  });
  return `${selector} {\n${declarations.join('\n')}\n}`;
}

/** Pure offline serialization of a committed v1 project, never editor state. */
export function projectCode(project: Project): ProjectCode {
  const checked = parseProject(project);
  const rootCss = rule(`.${ROOT_CLASS}`, {
    position: 'relative',
    isolation: 'isolate',
    width: checked.width,
    height: checked.height,
    minWidth: checked.width,
    minHeight: checked.height,
    maxWidth: 'none',
    maxHeight: 'none',
    margin: 0,
    padding: 0,
    border: '0 solid transparent',
    boxSizing: 'border-box',
    display: 'block',
    overflow: 'hidden',
    background: checked.background,
    direction: 'ltr',
    writingMode: 'horizontal-tb',
    textDecoration: 'none',
  });
  const wrap = (markup: string) => `<div class="${ROOT_CLASS}" role="group" aria-label="${escapeHtml(checked.name)}">\n${markup}\n</div>`;
  const entries = checked.elements.map((element, index) => {
    const tag = elementTag(element);
    const className = elementClass(index);
    const selector = `.${ROOT_CLASS} > .${className}`;
    const content = element.type === 'rectangle' ? '' : escapeHtml(element.text);
    const html = `  <${tag} class="${className}"${tag === 'button' ? ' type="button"' : ''}>${content}</${tag}>`;
    const css = rule(selector, elementStyles(element));
    return { elementId: element.id, selector, html, css };
  });
  const html = wrap(entries.map(entry => entry.html).join('\n'));
  const css = [rootCss, ...entries.map(entry => entry.css)].join('\n\n');
  const document = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(checked.name)}</title>\n<style>\nhtml, body { margin: 0; padding: 0; }\n${css}\n</style>\n</head>\n<body>\n${html}\n</body>\n</html>`;
  return {
    html,
    css,
    document,
    // A node snippet includes its positioning/clipping/background context, not
    // merely a child whose scoped CSS would fail without a matching parent.
    nodes: entries.map(entry => ({ ...entry, html: wrap(entry.html), css: `${rootCss}\n\n${entry.css}` })),
  };
}

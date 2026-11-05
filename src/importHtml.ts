import type { DesignElement, Project } from './types';
import { parseProject } from './validation';

export interface HtmlImportSource {
  html: string;
  css: string;
  name: string;
  width: number;
  height: number;
}

export interface HtmlImportResult {
  project: Project;
  warnings: string[];
}

type Rgba = { r: number; g: number; b: number; a: number };

const SAFE_TAGS = new Set('a abbr address article aside b bdi bdo blockquote br button caption center cite code col colgroup dd del details dfn dialog div dl dt em fieldset figcaption figure footer h1 h2 h3 h4 h5 h6 header hgroup hr i ins kbd label legend li main mark menu nav ol p pre q rp rt ruby s samp section small span strong sub summary sup table tbody td tfoot th thead time tr u ul var wbr'.split(' '));
const DROP_TAGS = new Set('script noscript iframe frame frameset object embed applet svg math canvas template portal fencedframe'.split(' '));
const RESOURCE_TAGS = new Set('img picture source video audio track link'.split(' '));
const URL_ATTRIBUTES = new Set('href src srcset imagesrcset poster action formaction background ping cite data codebase manifest profile longdesc usemap xlink:href srcdoc'.split(' '));
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };
const MAX_INPUT = 1_000_000;
const MAX_NODES = 5_000;

function over(front: Rgba, back: Rgba, opacity = 1): Rgba {
  const alpha = front.a * opacity;
  return {
    r: front.r * alpha + back.r * (1 - alpha),
    g: front.g * alpha + back.g * (1 - alpha),
    b: front.b * alpha + back.b * (1 - alpha),
    a: 1,
  };
}

function hex(color: Rgba): string {
  return `#${[color.r, color.g, color.b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function checkViewport(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 240 || value > 4000) {
    throw new Error(`${label} must be a number from 240 to 4000 pixels.`);
  }
}

function normalizedText(value: string, style: CSSStyleDeclaration, trim = true): string {
  const normalized = value.replace(/\r\n?/g, '\n');
  if (['pre', 'pre-wrap', 'break-spaces'].includes(style.whiteSpace)) return normalized;
  const collapsed = style.whiteSpace === 'pre-line'
    ? normalized.replace(/[\t\f ]+/g, ' ').replace(/ *\n */g, '\n')
    : normalized.replace(/[\t\n\f ]+/g, ' ');
  return trim ? collapsed.trim() : collapsed;
}

/** Preserve document-wrapper attributes that HTML fragment parsing discards.
 * This is not sanitization: the inert parse and allowlisted copy below remain
 * the security boundary, including for malformed markup.
 */
function preserveWrappers(html: string): string {
  return html.replace(/<!--[\s\S]*?(?:-->|$)|<(script|style|title|textarea|xmp|iframe|noembed|noframes)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)|<\/?(html|head|body)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi, (token: string, _rawText: string | undefined, wrapper: string | undefined) => {
    return wrapper ? token.replace(/^<(\/?)(html|head|body)\b/i, '<$1picasso-import-$2') : token;
  });
}

/** Untrusted markup is parsed only inside a disconnected, inert template. */
function copyMarkup(source: HtmlImportSource, warn: (message: string) => void): { fragment: DocumentFragment; title: string; wrappers: Map<string, Element> } {
  const template = document.createElement('template');
  template.innerHTML = preserveWrappers(source.html);
  const title = template.content.querySelector('title')?.textContent?.trim() ?? '';
  const fragment = document.createDocumentFragment();
  const wrappers = new Map<string, Element>();
  const copyAttributes = (element: Element, safe: Element): void => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || URL_ATTRIBUTES.has(name) || name === 'is' || name === 'autofocus' || name === 'autoplay') {
        warn('Event handlers, navigation, and resource-loading attributes were removed.');
        continue;
      }
      // No custom elements, browser actions, or browsing targets survive.
      if (['id', 'class', 'style', 'title', 'lang', 'dir', 'role', 'hidden', 'open', 'colspan', 'rowspan', 'span', 'start', 'reversed', 'value'].includes(name)
        || name.startsWith('aria-') || name.startsWith('data-')) {
        safe.setAttribute(name, attribute.value);
      }
    }
  };
  let count = 0;
  const copy = (node: Node, parent: Node, depth: number): void => {
    if (++count > MAX_NODES || depth > 100) throw new Error('This HTML is too complex to import (maximum 5,000 nodes and 100 nesting levels).');
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(node.textContent ?? ''));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    const tag = element.localName.toLowerCase();
    if (['picasso-import-html', 'picasso-import-head', 'picasso-import-body'].includes(tag)) {
      const wrapper = document.createElement('div');
      copyAttributes(element, wrapper);
      wrappers.set(tag.slice('picasso-import-'.length), wrapper);
      for (const child of Array.from(element.childNodes)) copy(child, parent, depth + 1);
      return;
    }
    if (DROP_TAGS.has(tag)) {
      warn('Scripts, embedded documents, SVG, canvas, and other active content were removed; they are not executed.');
      return;
    }
    if (RESOURCE_TAGS.has(tag)) {
      warn('Images, media, linked stylesheets, and other external resources were removed; resources are never loaded.');
      return;
    }
    if (tag === 'title') return;
    if (tag === 'meta' || tag === 'base') {
      if (tag === 'base' || element.hasAttribute('http-equiv')) warn('Document metadata and navigation directives were removed.');
      return;
    }
    if (tag === 'style') {
      const style = document.createElement('style');
      style.textContent = element.textContent;
      const media = element.getAttribute('media');
      if (media) style.media = media;
      parent.appendChild(style);
      return;
    }
    if (!SAFE_TAGS.has(tag)) {
      warn('Unsupported elements and form controls were omitted or reduced to their text and children.');
      for (const child of Array.from(element.childNodes)) copy(child, parent, depth + 1);
      return;
    }
    const safe = document.createElement(tag);
    copyAttributes(element, safe);
    if (tag === 'button') safe.setAttribute('type', 'button');
    parent.appendChild(safe);
    for (const child of Array.from(element.childNodes)) copy(child, safe, depth + 1);
  };
  for (const node of Array.from(template.content.childNodes)) copy(node, fragment, 0);
  return { fragment, title, wrappers };
}

function loadFrame(frame: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => finish(new Error('The isolated HTML preview did not load in time.')), 5_000);
    const finish = (error?: Error) => {
      window.clearTimeout(timer);
      frame.onload = null;
      frame.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    frame.onload = () => finish();
    frame.onerror = () => finish(new Error('The isolated HTML preview could not be loaded.'));
    // This document contains no user markup. The CSP exists before any copied
    // styles/nodes are adopted; sandbox intentionally does NOT allow scripts.
    frame.srcdoc = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'none\'; img-src \'none\'; font-src \'none\'; media-src \'none\'; connect-src \'none\'; frame-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><style>html,body{margin:0;padding:0}html{color-scheme:light}</style></head><body></body></html>';
    try {
      document.body.appendChild(frame);
    } catch (error) {
      finish(error instanceof Error ? error : new Error('The isolated HTML preview could not be attached.'));
    }
  });
}

/**
 * Render a passive, resource-free copy in an isolated viewport, then flatten its
 * measured boxes into Picasso's intentionally smaller, opaque v1 layer model.
 */
export async function importHtml(source: HtmlImportSource): Promise<HtmlImportResult> {
  if (!source.html.trim()) throw new Error('Add HTML containing visible text or a visible panel before importing.');
  if (source.html.length > MAX_INPUT || source.css.length > MAX_INPUT) throw new Error('HTML and CSS must each be no larger than 1,000,000 characters.');
  checkViewport(source.width, 'Viewport width');
  checkViewport(source.height, 'Viewport height');
  const warnings = new Set<string>();
  const warn = (message: string) => { warnings.add(message); };
  const { fragment, title, wrappers } = copyMarkup(source, warn);
  const cssText = [source.css, ...Array.from(fragment.querySelectorAll('style'), style => style.textContent ?? ''), ...Array.from(fragment.querySelectorAll('[style]'), element => element.getAttribute('style') ?? ''), ...Array.from(wrappers.values(), element => element.getAttribute('style') ?? '')].join('\n');
  if (/@import\b|url\s*\(/i.test(cssText)) warn('CSS imports, fonts, and URL resources are blocked; only inline CSS and installed fonts can affect this import.');
  if (/@font-face\b/i.test(cssText)) warn('Web fonts are blocked. Typography uses available local fonts during measurement and is normalized to Picasso typography.');
  if (/\banimation(?:-name)?\s*:|@keyframes\b|\btransition(?:-property)?\s*:/i.test(cssText)) warn('Animations and transitions were disabled; only a static layout is imported.');

  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.inert = true;
  for (const [property, value] of Object.entries({
    position: 'fixed', left: '-100000px', top: '0', width: `${source.width}px`, height: `${source.height}px`,
    border: '0', margin: '0', padding: '0', opacity: '0', 'pointer-events': 'none',
    'min-width': '0', 'max-width': 'none', 'min-height': '0', 'max-height': 'none',
    'box-sizing': 'content-box', transform: 'none',
  })) frame.style.setProperty(property, value, 'important');
  try {
    await loadFrame(frame);
    const doc = frame.contentDocument;
    if (!doc) throw new Error('The browser could not create an isolated HTML measurement document.');
    for (const [tag, wrapper] of wrappers) {
      const target = tag === 'html' ? doc.documentElement : tag === 'head' ? doc.head : doc.body;
      for (const attribute of Array.from(wrapper.attributes)) target.setAttribute(attribute.name, attribute.value);
    }
    doc.body.appendChild(doc.adoptNode(fragment));
    const suppliedCss = doc.createElement('style');
    suppliedCss.textContent = source.css;
    doc.body.appendChild(suppliedCss);
    const staticCss = doc.createElement('style');
    staticCss.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
    doc.body.appendChild(staticCss);

    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('The browser cannot resolve colors for HTML import.');
    const colorCache = new Map<string, Rgba>();
    const color = (value: string): Rgba => {
      const cached = colorCache.get(value);
      if (cached) return cached;
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = '#000000';
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      const result = { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] / 255 };
      colorCache.set(value, result);
      return result;
    };
    const root = doc.querySelector<HTMLElement>('.picasso-root') ?? doc.body;
    const picassoRoot = root !== doc.body;
    const rootBox = root.getBoundingClientRect();
    const width = picassoRoot ? rootBox.width : source.width;
    const height = picassoRoot ? rootBox.height : source.height;
    checkViewport(width, 'Imported artboard width');
    checkViewport(height, 'Imported artboard height');
    const offsetX = picassoRoot ? rootBox.left : 0;
    const offsetY = picassoRoot ? rootBox.top : 0;
    const styles = new Map<Element, CSSStyleDeclaration>();
    const styleOf = (element: Element): CSSStyleDeclaration => {
      let style = styles.get(element);
      if (!style) {
        style = window.getComputedStyle(element);
        styles.set(element, style);
      }
      return style;
    };
    let background = WHITE;
    let rootBackdrop = WHITE;
    let ancestorOpacity = 1;
    let rootInheritedOpacity = 1;
    const ancestors: Element[] = [];
    for (let ancestor: Element | null = root; ancestor; ancestor = ancestor.parentElement) ancestors.unshift(ancestor);
    for (const ancestor of ancestors) {
      if (ancestor === root) {
        rootBackdrop = background;
        rootInheritedOpacity = ancestorOpacity;
      }
      ancestorOpacity *= Number(styleOf(ancestor).opacity);
      background = over(color(styleOf(ancestor).backgroundColor), background, ancestorOpacity);
    }
    const elements: DesignElement[] = [];
    let hasVisibleRoot = false;
    const add = (element: Omit<DesignElement, 'id' | 'name'>, label: string): void => {
      if (elements.length >= 200) throw new Error('This HTML produces more than 200 editable layers. Simplify it before importing.');
      elements.push({ ...element, id: `html-${elements.length + 1}`, name: label.slice(0, 120) });
    };
    const inspect = (element: Element, style: CSSStyleDeclaration): void => {
      if (style.backgroundImage !== 'none') warn('Images and gradients cannot be represented and were omitted; solid background colors are retained.');
      if (['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && !['none', 'hidden'].includes(style.getPropertyValue(`border-${side.toLowerCase()}-style`)))) warn('Borders and outlines are not supported and were omitted.');
      if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) warn('Borders and outlines are not supported and were omitted.');
      if (style.boxShadow !== 'none' || style.textShadow !== 'none') warn('Box and text shadows are not supported and were omitted.');
      if (style.transform !== 'none' || style.perspective !== 'none' || style.getPropertyValue('rotate') && style.getPropertyValue('rotate') !== 'none' || style.getPropertyValue('scale') && style.getPropertyValue('scale') !== 'none' || style.getPropertyValue('translate') && style.getPropertyValue('translate') !== 'none') warn('Transforms were flattened to axis-aligned measured boxes; rotation and transformed text are not preserved.');
      if (Number(style.opacity) < 1 || style.mixBlendMode !== 'normal' || style.filter !== 'none') warn('Transparency, filters, and blending were approximated against ancestor backgrounds because Picasso layers are opaque.');
      for (const pseudo of ['::before', '::after']) {
        const content = window.getComputedStyle(element, pseudo).content;
        if (content && content !== 'none' && content !== 'normal' && content !== '""') warn('CSS-generated pseudo-element content is not editable and was omitted.');
      }
      if (style.zIndex !== 'auto') warn('Stacking contexts were flattened; complex overlapping z-index arrangements may differ.');
    };
    const corner = (style: CSSStyleDeclaration, box: DOMRect): number => {
      const values = [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius];
      if (new Set(values).size > 1 || values.some(value => value.trim().includes(' '))) warn('Unequal or elliptical corners were normalized to one corner radius per layer.');
      const value = values[0];
      const radius = value.endsWith('%') ? parseFloat(value) * Math.min(box.width, box.height) / 100 : parseFloat(value) || 0;
      // CSS itself limits a uniform radius to half the border box.
      return Math.min(radius, box.width / 2, box.height / 2);
    };
    const isVisible = (element: Element): boolean => {
      const style = styleOf(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && Number(style.opacity) > 0;
    };
    const canGroupText = (element: Element): boolean => {
      const parentStyle = styleOf(element);
      for (const child of Array.from(element.children)) {
        if (child.localName === 'style' || !isVisible(child) || child.localName === 'br' || child.localName === 'wbr') continue;
        const style = styleOf(child);
        inspect(child, style);
        const differentTextStyle = ['font-family', 'font-size', 'font-weight', 'font-style', 'color', 'line-height', 'letter-spacing', 'white-space', 'text-transform', 'text-decoration-line'].some(property => style.getPropertyValue(property) !== parentStyle.getPropertyValue(property));
        if (child.localName === 'button' || !['inline', 'contents'].includes(style.display) || color(style.backgroundColor).a > 0 || !canGroupText(child)) return false;
        if (differentTextStyle) warn('Inline text styling was normalized to its containing text layer; mixed fonts, weights, and colors are not retained.');
      }
      return true;
    };
    const textOf = (element: Element): string => {
      const lines: string[] = [''];
      const gather = (node: Node): void => {
        if (node.nodeType === Node.TEXT_NODE) lines[lines.length - 1] += node.textContent ?? '';
        else if (node.nodeType === Node.ELEMENT_NODE) {
          const child = node as Element;
          if (child.localName === 'style' || !isVisible(child)) return;
          if (child.localName === 'br') lines.push('');
          else for (const nested of Array.from(child.childNodes)) gather(nested);
        }
      };
      for (const child of Array.from(element.childNodes)) gather(child);
      const style = styleOf(element);
      const inline = ['inline', 'inline-block', 'inline-flex', 'inline-grid'].includes(style.display);
      return lines.map(line => normalizedText(line, style, !inline)).join('\n');
    };
    const textWarning = (style: CSSStyleDeclaration, button: boolean, exported: boolean): void => {
      if (!exported) warn('Typography was normalized to Picasso’s Segoe UI/Arial font, fixed weights, line spacing, and text alignment; wrapping and rich text may differ.');
      if (style.textTransform !== 'none' || style.textDecorationLine !== 'none' || style.writingMode !== 'horizontal-tb' || style.direction !== 'ltr' || !['start', 'left', ...(button ? ['center'] : [])].includes(style.textAlign)) warn('Text decorations, transforms, writing direction, and custom alignment are not preserved.');
    };
    const visit = (element: Element, ancestorBackground: Rgba, inheritedOpacity: number, depth: number): void => {
      if (element.localName === 'style') return;
      const style = styleOf(element);
      const opacity = inheritedOpacity * Number(style.opacity);
      if (style.display === 'none' || opacity === 0) return;
      const visible = style.visibility !== 'hidden' && style.visibility !== 'collapse';
      const box = element.getBoundingClientRect();
      const painted = color(style.display === 'contents' ? 'transparent' : style.backgroundColor);
      const fill = visible ? over(painted, ancestorBackground, opacity) : ancestorBackground;
      const isRoot = element === root;
      const button = element.localName === 'button';
      const exported = picassoRoot && element.parentElement === root && /(?:^|\s)picasso-node-\d+(?:\s|$)/.test(element.getAttribute('class') ?? '');
      const intersects = exported || box.width > 0 && box.height > 0 && box.right > offsetX && box.bottom > offsetY && box.left < offsetX + width && box.top < offsetY + height;
      if (visible && (intersects || isRoot)) inspect(element, style);
      if (visible && (intersects || isRoot) && painted.a > 0 && painted.a < 1) warn('Transparent colors were composited against their nearest ancestor background because Picasso layers are opaque.');
      if (visible && intersects && !isRoot && (depth > 1 || element.children.length > 0)) warn('Nested layout was flattened into independently editable layers; flex/grid relationships and responsive behavior are not retained.');
      if (isRoot && painted.a > 0 && visible) hasVisibleRoot = true;
      const grouped = !isRoot && (button || canGroupText(element));
      const text = grouped && visible ? textOf(element) : '';
      const textColor = color(style.color);
      const hasText = visible && (button && painted.a > 0 || exported && element.localName === 'p' || /\S/.test(text) && textColor.a > 0);
      if (hasText && textColor.a > 0 && textColor.a < 1) warn('Transparent colors were composited against their nearest ancestor background because Picasso layers are opaque.');
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
      const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const separatePanel = hasText && !button && !exported && (paddingX > 0 || paddingY > 0);
      if (!isRoot && visible && intersects && painted.a > 0 && (!hasText || separatePanel)) {
        add({ type: 'rectangle', x: box.left - offsetX, y: box.top - offsetY, width: box.width, height: box.height, fill: hex(fill), text: '', textColor: '#000000', fontSize: 16, borderRadius: corner(style, box) }, element.getAttribute('aria-label') || `${element.localName} panel`);
      }
      if (hasText && intersects) {
        textWarning(style, button, exported);
        const insetLeft = !button && !exported ? parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth) : 0;
        const insetTop = !button && !exported ? parseFloat(style.paddingTop) + parseFloat(style.borderTopWidth) : 0;
        add({ type: button ? 'button' : 'text', x: box.left - offsetX + insetLeft, y: box.top - offsetY + insetTop, width: box.width - (!button && !exported ? paddingX : 0), height: box.height - (!button && !exported ? paddingY : 0), fill: hex(fill), text, textColor: hex(over(textColor, fill, opacity)), fontSize: parseFloat(style.fontSize), borderRadius: separatePanel ? 0 : corner(style, box) }, element.getAttribute('aria-label') || text.trim().split('\n')[0] || 'Imported text');
      }
      if (grouped && hasText) return;
      if (element !== root && ['hidden', 'clip', 'scroll', 'auto'].some(value => style.overflowX === value || style.overflowY === value) && element.children.length) warn('Nested clipping and scrolling are not retained; only the artboard clips imported layers.');
      const children = Array.from(element.childNodes);
      // Numeric sibling z-index is the useful representable subset of stacking.
      children.sort((a, b) => {
        const z = (node: Node) => node.nodeType === Node.ELEMENT_NODE ? Number.parseInt(styleOf(node as Element).zIndex, 10) || 0 : 0;
        return z(a) - z(b);
      });
      for (const child of children) {
        if (child.nodeType === Node.ELEMENT_NODE) visit(child as Element, fill, opacity, depth + 1);
        else if (child.nodeType === Node.TEXT_NODE && visible) {
          const value = normalizedText(child.textContent ?? '', style, false);
          if (!/\S/.test(value) || textColor.a === 0) continue;
          const range = doc.createRange();
          range.selectNodeContents(child);
          const bounds = range.getBoundingClientRect();
          if (!bounds.width || !bounds.height || bounds.right <= offsetX || bounds.bottom <= offsetY || bounds.left >= offsetX + width || bounds.top >= offsetY + height) continue;
          textWarning(style, false, false);
          add({ type: 'text', x: bounds.left - offsetX, y: bounds.top - offsetY, width: bounds.width, height: bounds.height, fill: hex(fill), text: value, textColor: hex(over(textColor, fill, opacity)), fontSize: parseFloat(style.fontSize), borderRadius: 0 }, value.trim().split('\n')[0]);
        }
      }
    };
    visit(root, rootBackdrop, rootInheritedOpacity, 0);
    if (!elements.length && !hasVisibleRoot) throw new Error('No usable visible text, buttons, or solid-color panels were found in this HTML.');
    const name = root.getAttribute('aria-label')?.trim() || title || source.name.trim() || 'Imported HTML';
    let project: Project;
    try {
      project = parseProject({ version: 1, name, width, height, background: hex(background), elements });
    } catch (error) {
      throw new Error(`This HTML cannot fit Picasso’s editable project format: ${error instanceof Error ? error.message : String(error)} No content was truncated.`);
    }
    return { project, warnings: Array.from(warnings) };
  } finally {
    frame.onload = null;
    frame.onerror = null;
    frame.remove();
  }
}

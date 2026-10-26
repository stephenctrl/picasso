import type { DesignElement, Project } from './types';

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function createElement(type: DesignElement['type'], count: number): DesignElement {
  return {
    id: crypto.randomUUID(), type,
    name: `${type === 'rectangle' ? 'Rectangle' : type === 'text' ? 'Text' : 'Button'} ${count + 1}`,
    x: 64 + count % 6 * 24, y: 64 + count % 6 * 24,
    width: type === 'text' ? 320 : type === 'button' ? 180 : 240,
    height: type === 'text' ? 72 : type === 'button' ? 52 : 160,
    fill: type === 'text' ? '#F8F7F2' : type === 'button' ? '#253C32' : '#D8E3CC',
    text: type === 'text' ? 'A fresh perspective.' : type === 'button' ? 'Let’s begin' : '',
    textColor: type === 'button' ? '#FFFFFF' : '#253C32', fontSize: type === 'text' ? 32 : 16,
    borderRadius: type === 'text' ? 0 : type === 'button' ? 26 : 20,
  };
}

export function initialProject(): Project {
  const base = createElement('rectangle', 0);
  const element = (id: string, changes: Partial<DesignElement>): DesignElement => ({ ...base, id, ...changes });
  return {
    version: 1, name: 'A little room to grow', width: 800, height: 680, background: '#F8F7F2',
    elements: [
      element('backdrop', { name: 'Sage backdrop', x: 472, y: 0, width: 328, height: 680, fill: '#DFE7D7', borderRadius: 0 }),
      element('arch', { name: 'Quiet arch', x: 516, y: 120, width: 240, height: 440, fill: '#AEBFA0', borderRadius: 120 }),
      element('sun', { name: 'Morning sun', x: 558, y: 160, width: 156, height: 156, fill: '#F3E7AC', borderRadius: 100 }),
      element('leaf', { name: 'Forest form', x: 486, y: 360, width: 220, height: 160, fill: '#344E41', borderRadius: 110 }),
      element('eyebrow', { type: 'text', name: 'Brand label', x: 56, y: 56, width: 340, height: 30, fill: '#F8F7F2', text: 'STUDIO / A SLOWER KIND OF GOOD', fontSize: 11, borderRadius: 0 }),
      element('heading', { type: 'text', name: 'Hero headline', x: 56, y: 172, width: 400, height: 224, fill: '#F8F7F2', text: 'Make room\nfor your next\nbig idea.', fontSize: 56, borderRadius: 0 }),
      element('description', { type: 'text', name: 'Supporting copy', x: 58, y: 418, width: 330, height: 70, fill: '#F8F7F2', text: 'A little space. A fresh perspective.\nSomething wonderful starts here.', fontSize: 17, borderRadius: 0 }),
      element('cta', { type: 'button', name: 'Primary action', x: 56, y: 532, width: 192, height: 52, fill: '#253C32', text: 'Explore the possibilities  ↗', textColor: '#FFFFFF', fontSize: 12, borderRadius: 28 }),
      element('footer', { type: 'text', name: 'Edition note', x: 56, y: 628, width: 340, height: 20, fill: '#F8F7F2', text: 'THOUGHTFULLY MADE. ENDLESSLY YOURS.', fontSize: 10, borderRadius: 0 }),
    ],
  };
}

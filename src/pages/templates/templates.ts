import { initialProject } from '../../document';
import type { DesignElement, Project } from '../../types';
import { parseProject } from '../../validation';

export interface ProjectTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  createProject: () => Project;
}

export function blankProject(): Project {
  return parseProject({
    version: 1,
    name: 'An open canvas',
    width: 1200,
    height: 800,
    background: '#F8F7F2',
    elements: [],
  });
}

export function mobileProject(): Project {
  const element = (id: string, changes: Partial<DesignElement>): DesignElement => ({
    id,
    type: 'rectangle',
    name: id,
    x: 0,
    y: 0,
    width: 390,
    height: 100,
    fill: '#F8F7F2',
    text: '',
    textColor: '#253C32',
    fontSize: 16,
    borderRadius: 0,
    ...changes,
  });

  return parseProject({
    version: 1,
    name: 'A moment of calm',
    width: 390,
    height: 844,
    background: '#F8F7F2',
    elements: [
      element('mobile-label', { type: 'text', name: 'Studio label', x: 28, y: 32, width: 334, height: 24, text: 'FIELDNOTES / EVERYDAY INSPIRATION', fontSize: 11 }),
      element('mobile-panel', { name: 'Sage panel', x: 28, y: 84, width: 334, height: 302, fill: '#DFE7D7', borderRadius: 24 }),
      element('mobile-arch', { name: 'Soft arch', x: 112, y: 112, width: 166, height: 246, fill: '#AEBFA0', borderRadius: 83 }),
      element('mobile-sun', { name: 'Morning light', x: 137, y: 134, width: 116, height: 116, fill: '#F3E7AC', borderRadius: 58 }),
      element('mobile-leaf', { name: 'Forest form', x: 84, y: 258, width: 202, height: 100, fill: '#344E41', borderRadius: 50 }),
      element('mobile-eyebrow', { type: 'text', name: 'Edition label', x: 28, y: 420, width: 334, height: 24, text: 'A LITTLE SPACE TO SLOW DOWN', fontSize: 11 }),
      element('mobile-heading', { type: 'text', name: 'Card headline', x: 28, y: 460, width: 334, height: 118, text: 'Find your\nquiet moment.', fontSize: 44 }),
      element('mobile-copy', { type: 'text', name: 'Supporting copy', x: 28, y: 602, width: 334, height: 72, text: 'Make a little room for what matters.\nA fresh perspective starts with\na moment to yourself.', fontSize: 17 }),
      element('mobile-button', { type: 'button', name: 'Card action', x: 28, y: 708, width: 334, height: 56, fill: '#253C32', text: 'Take a little time', textColor: '#FFFFFF', borderRadius: 28 }),
      element('mobile-footer', { type: 'text', name: 'Closing note', x: 28, y: 796, width: 334, height: 20, text: 'LESS RUSH. MORE ROOM.', fontSize: 10 }),
    ],
  });
}

export const projectTemplates: readonly ProjectTemplate[] = [
  {
    id: 'blank',
    name: 'An open canvas',
    category: 'Blank canvas',
    description: 'A clean, wide artboard. Bring your own shapes, words, and point of view.',
    createProject: blankProject,
  },
  {
    id: 'studio',
    name: 'A little room to grow',
    category: 'Studio landing',
    description: 'The original Picasso composition: an expressive headline, soft shapes, and a clear focal point.',
    createProject: () => parseProject(initialProject()),
  },
  {
    id: 'mobile',
    name: 'A moment of calm',
    category: 'Mobile card',
    description: 'A compact, portrait composition with room for an illustration, a short story, and a button.',
    createProject: mobileProject,
  },
];

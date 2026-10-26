import type { Project } from './types';

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

function escapeXml(value: string): string {
  return value
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '\uFFFD')
    .replace(/[&<>"']/g, character => XML_ENTITIES[character]);
}

export function projectSvg(project: Project): string {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new Error('Your browser cannot prepare text for SVG export. You can still export project JSON.');
  const elements = project.elements.map((element, index) => {
    const radius = Math.min(element.borderRadius, element.width / 2, element.height / 2);
    const shape = `<rect width="${element.width}" height="${element.height}" rx="${radius}" fill="${element.fill}"/>`;
    let text = '';
    if (element.type !== 'rectangle') {
      context.font = `${element.type === 'button' ? 500 : 400} ${element.fontSize}px "Segoe UI",Arial,sans-serif`;
      const letterSpacing = element.type === 'text' ? -element.fontSize * 0.02 : 0;
      const lines: string[] = [];
      for (const paragraph of element.text.split('\n')) {
        let line = '';
        for (const token of paragraph.split(/(\s+)/)) {
          const candidate = line + token;
          if (line.trim() && token.trim() && context.measureText(candidate).width + Math.max(0, candidate.length - 1) * letterSpacing > element.width) {
            lines.push(line);
            line = token;
          } else {
            line = candidate;
          }
        }
        lines.push(line);
      }
      const lineHeight = element.fontSize * (element.type === 'button' ? 1.2 : 1.18);
      const centered = element.type === 'button';
      const top = centered ? (element.height - lines.length * lineHeight) / 2 : 0;
      text = `<text fill="${element.textColor}" font-family="'Segoe UI',Arial,sans-serif" font-size="${element.fontSize}" font-weight="${centered ? 500 : 400}" letter-spacing="${letterSpacing}" text-anchor="${centered ? 'middle' : 'start'}" xml:space="preserve">${lines.map((line, lineIndex) => `<tspan x="${centered ? element.width / 2 : 0}" y="${top + lineIndex * lineHeight + element.fontSize * 0.9}">${escapeXml(line)}</tspan>`).join('')}</text>`;
    }
    return `<g transform="translate(${element.x} ${element.y})"><defs><clipPath id="element-${index}"><rect width="${element.width}" height="${element.height}" rx="${radius}"/></clipPath></defs><g clip-path="url(#element-${index})">${shape}${text}</g></g>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${project.width}" height="${project.height}" viewBox="0 0 ${project.width} ${project.height}" overflow="hidden" role="img"><title>${escapeXml(project.name)}</title><rect width="100%" height="100%" fill="${project.background}"/>\n${elements}\n</svg>`;
}

export function download(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

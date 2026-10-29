import { useEffect, useRef, useState } from 'react';
import { elementStyles, elementTag } from '../render';
import type { Project } from '../types';

interface ProjectPreviewProps {
  project: Project;
  className?: string;
}

/** A scaled, noninteractive view of the actual fixed-size project. */
export default function ProjectPreview({ project, className = '' }: ProjectPreviewProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(size.width / project.width, size.height / project.height);

  return (
    <div
      className={`page-project-preview ${className}`}
      role="img"
      aria-label={`Preview of ${project.name || 'Untitled project'}, ${project.width} by ${project.height} pixels, ${project.elements.length} ${project.elements.length === 1 ? 'element' : 'elements'}`}
    >
      <div className="page-preview-viewport" ref={viewport} aria-hidden="true">
        <div
          className="page-preview-artboard"
          style={{
            width: project.width,
            height: project.height,
            background: project.background,
            left: (size.width - project.width * scale) / 2,
            top: (size.height - project.height * scale) / 2,
            transform: `scale(${scale})`,
            visibility: scale > 0 ? 'visible' : 'hidden',
          }}
        >
          {project.elements.map(element => {
            const Tag = elementTag(element);
            return (
              <Tag
                key={element.id}
                style={elementStyles(element)}
                {...(Tag === 'button' ? { type: 'button' as const, disabled: true, tabIndex: -1 } : {})}
              >
                {element.type === 'rectangle' ? null : element.text}
              </Tag>
            );
          })}
        </div>
      </div>
    </div>
  );
}

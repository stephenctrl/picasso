export interface DesignElement {
  id: string;
  type: 'rectangle' | 'text' | 'button';
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  text: string;
  textColor: string;
  fontSize: number;
  borderRadius: number;
}

export interface Project {
  version: 1;
  name: string;
  width: number;
  height: number;
  background: string;
  elements: DesignElement[];
}

export interface Suggestion {
  title: string;
  rationale: string;
  elements: DesignElement[];
}

import { GLOBAL_DISTRACTORS, PROMPT_TEMPLATE } from './config';
import type { HuntTarget } from './types';

export const toPrompt = (label: string): string => PROMPT_TEMPLATE.replace('{label}', label.trim());

/** Target prompt first, then every competitor. Order is relied on by `judge`. */
export function promptsForTarget(target: HuntTarget): string[] {
  const competitors = [...target.contrast, ...GLOBAL_DISTRACTORS];
  const unique = new Set([target.label, ...competitors].map(toPrompt));
  return [toPrompt(target.label), ...[...unique].filter((p) => p !== toPrompt(target.label))];
}

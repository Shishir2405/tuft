export interface HuntTarget {
  id: string;
  /** Spoken to the player. Written to be understood by ear, without looking at the screen. */
  clue: string;
  /** Noun phrase the vision model must recognise, e.g. "moss on a tree trunk". */
  label: string;
  /** Look-alikes the photo must be more similar to the label than to. Optional. */
  contrast: string[];
}

export interface Hunt {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  targets: HuntTarget[];
}

export type Verdict = 'found' | 'close' | 'miss';

export interface Judgement {
  verdict: Verdict;
  /** Target's share of the softmax over the target, its look-alikes and the cheat scenes. */
  share: number;
  /** Calibrated SigLIP probability for the target on its own. */
  probability: number;
  /** The label the model considered the best description of the photo. */
  bestLabel: string;
}

import { absoluteSeconds, type StepWindow } from './types';

const MS_PER_S = 1000;

export interface StepMark {
  stepId: string;
  timestamp: number;
  isCover?: boolean;
}

export function buildStepWindows(marks: StepMark[], audioEpochMs: number, durationSeconds: number): StepWindow[] {
  const windows: StepWindow[] = [];
  const sorted = [...marks].sort((a, b) => a.timestamp - b.timestamp);
  let from = 0;

  for (let i = 0; i < sorted.length; i++) {
    const mark = sorted[i];
    let to = Math.max(from, (mark.timestamp - audioEpochMs) / MS_PER_S);

    // If this is a cover step and it's the very first step, it consumes the audio
    // up to the NEXT step (the first actual action), instead of getting 0 seconds.
    if (mark.isCover && i === 0 && i + 1 < sorted.length) {
      const nextMark = sorted[i + 1];
      to = Math.max(from, (nextMark.timestamp - audioEpochMs) / MS_PER_S);
    }
    // If the PREVIOUS step was a cover step that consumed the audio up to this step,
    // this step gets an empty window (it shouldn't duplicate the cover's audio).
    if (i === 1 && sorted[0].isCover) {
      to = from;
    }

    windows.push({ stepId: mark.stepId, from: absoluteSeconds(from), to: absoluteSeconds(to) });
    from = to;
  }

  const last = windows[windows.length - 1];
  if (last) last.to = absoluteSeconds(Math.max(last.to, durationSeconds));
  return windows;
}

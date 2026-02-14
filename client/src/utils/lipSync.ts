export type Viseme = 'sil' | 'aa' | 'ee' | 'oh' | 'oo' | 'pp';

export interface VisemeEvent {
  viseme: Viseme;
  start: number; // ms from beginning
  duration: number; // ms
}

const charToViseme: Record<string, Viseme> = {
  a: 'aa', e: 'ee', i: 'ee', o: 'oh', u: 'oo',
  b: 'pp', p: 'pp', m: 'pp', f: 'pp', v: 'pp',
  w: 'oo',
  ' ': 'sil', ',': 'sil', '.': 'sil', '!': 'sil', '?': 'sil',
  ';': 'sil', ':': 'sil', '\n': 'sil', '\t': 'sil',
};

function getViseme(char: string): Viseme {
  const lower = char.toLowerCase();
  return charToViseme[lower] ?? 'aa';
}

export function generateVisemeTimeline(text: string, rate = 1): VisemeEvent[] {
  const baseDuration = 80 / rate;
  const raw: VisemeEvent[] = [];
  let time = 0;

  for (const ch of text) {
    const viseme = getViseme(ch);
    raw.push({ viseme, start: time, duration: baseDuration });
    time += baseDuration;
  }

  // Merge consecutive identical visemes
  const merged: VisemeEvent[] = [];
  for (const evt of raw) {
    const last = merged[merged.length - 1];
    if (last && last.viseme === evt.viseme) {
      last.duration += evt.duration;
    } else {
      merged.push({ ...evt });
    }
  }

  return merged;
}

export interface LipSyncController {
  start: () => void;
  stop: () => void;
}

export function createLipSyncController(
  timeline: VisemeEvent[],
  onVisemeChange: (viseme: Viseme) => void
): LipSyncController {
  let rafId: number | null = null;
  let startTime = 0;
  let running = false;

  function tick() {
    if (!running) return;
    const elapsed = performance.now() - startTime;

    // Find current viseme
    let current: Viseme = 'sil';
    for (const evt of timeline) {
      if (elapsed >= evt.start && elapsed < evt.start + evt.duration) {
        current = evt.viseme;
        break;
      }
      if (evt.start > elapsed) break;
    }

    // Check if past end of timeline
    const last = timeline[timeline.length - 1];
    if (last && elapsed > last.start + last.duration) {
      onVisemeChange('sil');
      return;
    }

    onVisemeChange(current);
    rafId = requestAnimationFrame(tick);
  }

  return {
    start() {
      running = true;
      startTime = performance.now();
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      onVisemeChange('sil');
    },
  };
}

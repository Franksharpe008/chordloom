import { moodProfile, harmonicRoutes, writePart } from "./composition.js?v=5";
export { MOODS } from "./composition.js?v=5";
export const musicalMode = (settings) =>
  moodProfile(settings, STYLES[settings.style]).mode;
const isLowBass = (sound) =>
  ["808", "sub", "punch808", "long808", "log"].includes(sound);
const isMonoBass = (sound) => isLowBass(sound) || sound === "finger";
export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
export const STYLES = {
  neo_soul: {
    name: "Neo-soul",
    mode: "major",
    rhythm: "pocket",
    patterns: [
      [2, 7, 0, 9],
      [5, 7, 4, 9],
    ],
    qualities: ["m", "dom", "maj", "m"],
    swing: 0.18,
  },
  lofi: {
    name: "Lo-fi jazz",
    mode: "major",
    rhythm: "pocket",
    patterns: [
      [0, 9, 5, 7],
      [2, 7, 0, 5],
    ],
    qualities: ["maj", "m", "maj", "dom"],
    swing: 0.25,
  },
  trap: {
    name: "Dark trap",
    mode: "minor",
    rhythm: "arp",
    patterns: [
      [0, 8, 5, 7],
      [0, 3, 8, 7],
    ],
    qualities: ["m", "maj", "m", "dom"],
    swing: 0.03,
  },
  cinematic: {
    name: "Cinematic",
    mode: "minor",
    rhythm: "flow",
    patterns: [
      [0, 8, 3, 7],
      [0, 5, 8, 7],
    ],
    qualities: ["m", "maj", "maj", "dom"],
    swing: 0,
  },
  amapiano: {
    name: "Amapiano keys",
    mode: "major",
    rhythm: "bounce",
    patterns: [
      [0, 5, 9, 7],
      [5, 0, 2, 7],
    ],
    qualities: ["maj", "maj", "m", "dom"],
    swing: 0.16,
  },
  uk_drill: {
    name: "UK drill",
    mode: "minor",
    rhythm: "arp",
    patterns: [
      [0, 1, 8, 7],
      [0, 5, 1, 7],
    ],
    qualities: ["m", "maj", "maj", "dom"],
    swing: 0.05,
  },
  hawaiian: {
    name: "Island piano",
    mode: "major",
    rhythm: "bounce",
    patterns: [
      [0, 9, 5, 7],
      [0, 5, 7, 0],
    ],
    qualities: ["maj", "m", "maj", "dom"],
    swing: 0.08,
  },
};
const QUALITIES = {
  maj: [0, 4, 7],
  m: [0, 3, 7],
  dom: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  7: [0, 4, 7, 10],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  9: [0, 4, 7, 10, 14],
  13: [0, 4, 10, 14, 21],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  m7b5: [0, 3, 6, 10],
};
export const PARTS = ["keys", "bass", "melody"];
export const SOUNDS = {
  keys: {
    piano: "Grand piano",
    electric: "Electric keys",
    pad: "Velvet pad",
    bell: "Prism bells",
    marimba: "Recorded marimba",
  },
  bass: {
    piano: "Piano bass",
    sub: "Round sub",
    808: "Warm 808 · synth",
    punch808: "Atlanta punch 808",
    long808: "Long slide 808",
    finger: "Finger bass · recorded",
    log: "Log drum · FM",
  },
  melody: {
    piano: "Grand piano",
    electric: "Electric keys",
    pad: "Velvet pad",
    bell: "Prism bells",
    marimba: "Recorded marimba",
  },
};
export const GROOVES = {
  keys: {
    auto: "Follow session",
    pocket: "Soul pocket",
    arp: "Rolling arpeggio",
    flow: "Cinematic flow",
    bounce: "Offbeat bounce",
    sustain: "Long sustain",
  },
  bass: {
    auto: "Follow session",
    trap: "Trap pocket",
    drill: "Drill slides",
    soul: "Soul movement",
    pulse: "Driving pulse",
  },
  melody: {
    auto: "Follow session",
    soul: "Soul phrases",
    trap: "Trap motif",
    cinematic: "Cinematic arc",
    spark: "Bright sparks",
  },
};
export const DEFAULT_PART = {
  sound: "piano",
  groove: "auto",
  density: 0.5,
  swing: 0,
  glide: 0.12,
  volume: 0.85,
  keep: false,
  seed: 0,
};
export const defaultParts = () =>
  Object.fromEntries(PARTS.map((l) => [l, { ...DEFAULT_PART }]));
export const DEFAULT_SETTINGS = {
  style: "neo_soul",
  mood: "auto",
  key: 0,
  bars: 8,
  bpm: 92,
  complexity: 2,
  rhythm: "auto",
  humanize: 0.45,
  layers: { keys: true, bass: true, melody: true },
  parts: defaultParts(),
};
export const partSettings = (settings, layer) => ({
  ...DEFAULT_PART,
  ...settings.parts?.[layer],
});
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const noteName = (midi) =>
  NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
export function random(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function quality(kind, complexity) {
  if (complexity === 1) return kind === "dom" ? "maj" : kind;
  if (complexity === 2)
    return kind === "maj" ? "maj7" : kind === "m" ? "m7" : "7";
  return kind === "maj" ? "maj9" : kind === "m" ? "m9" : "13";
}
function smoothVoicing(root, intervals, previous = []) {
  const basic = intervals.map((i) => 48 + root + i);
  const candidates = [];
  for (let inversion = 0; inversion < basic.length; inversion++) {
    const rotated = [
      ...basic.slice(inversion),
      ...basic.slice(0, inversion).map((n) => n + 12),
    ].sort((a, b) => a - b);
    for (const shift of [-12, 0, 12]) {
      const notes = rotated.map((n) => n + shift);
      if (notes[0] >= 48 && notes.at(-1) <= 86) candidates.push(notes);
    }
  }
  const cost = (notes) => {
    const mean = notes.reduce((a, b) => a + b) / notes.length;
    return (
      Math.abs(mean - 65) * 0.4 +
      (previous.length
        ? notes.reduce(
            (sum, n, i) =>
              sum +
              Math.abs(
                n -
                  previous[
                    Math.round(
                      (i * (previous.length - 1)) /
                        Math.max(1, notes.length - 1),
                    )
                  ],
              ),
            0,
          )
        : 0)
    );
  };
  return candidates.sort((a, b) => cost(a) - cost(b))[0] ?? basic;
}
function roman(offset, kind) {
  const major = {
    0: "I",
    1: "bII",
    2: "II",
    3: "bIII",
    4: "III",
    5: "IV",
    7: "V",
    8: "bVI",
    9: "VI",
    10: "bVII",
    11: "VII",
  };
  const numeral = major[offset] ?? "?";
  return kind.startsWith("m") && !kind.startsWith("maj")
    ? numeral.toLowerCase()
    : numeral;
}
export function makeChord(offset, kind, settings, previous, extra = {}) {
  const root = (settings.key + offset) % 12;
  const suffix =
    kind === "maj"
      ? ""
      : kind === "madd9"
        ? "m(add9)"
        : kind === "add9"
          ? "(add9)"
          : kind;
  return {
    root,
    offset,
    quality: kind,
    label: NOTE_NAMES[root] + suffix,
    roman: roman(offset, kind),
    notes: smoothVoicing(root, QUALITIES[kind], previous),
    locked: false,
    ...extra,
  };
}
export function generate(settings, seed, previous = []) {
  const rng = random(seed),
    style = STYLES[settings.style];
  const routes = harmonicRoutes(settings, style, rng);
  const mode = musicalMode(settings);
  const chords = [];
  // Quality follows harmonic function, including alternate patterns, rather than a fixed third on every root.
  const majorKinds = {
    0: "maj",
    2: "m",
    4: "m",
    5: "maj",
    7: "dom",
    9: "m",
    1: "maj",
    8: "maj",
  };
  const minorKinds = { 0: "m", 1: "maj", 3: "maj", 5: "m", 7: "dom", 8: "maj" };
  for (let bar = 0; bar < settings.bars; bar++) {
    if (previous[bar]?.locked) {
      chords.push(clone(previous[bar]));
      continue;
    }
    const returnPhrase = settings.bars >= 16 && bar >= settings.bars - 4;
    const section = returnPhrase
      ? "Return"
      : bar < settings.bars / 2
        ? bar >= 4
          ? "A′"
          : "A"
        : "B";
    let offset = routes[section === "B" ? 1 : 0][bar % 4];
    let kind = quality(
      (mode === "major" ? majorKinds : minorKinds)[offset] ?? "maj",
      settings.complexity,
    );
    let functionNote = "";
    if (settings.complexity === 3 && bar % 8 === 6 && mode === "major") {
      offset = 5;
      kind = "m9";
      functionNote = "Borrowed iv · a darker turn";
    }
    if (settings.complexity === 3 && bar % 8 === 4 && mode === "major") {
      offset = 4;
      kind = "7";
      functionNote = "V/vi · leads into the relative minor";
    }
    if (settings.complexity === 3 && bar % 8 === 5 && mode === "major") {
      offset = 9;
      kind = "m9";
      functionNote = "Relative minor · resolves the secondary dominant";
    }
    if (bar === settings.bars - 1 && settings.bars > 4) {
      offset = 7;
      kind = quality("dom", settings.complexity);
      functionNote = "Dominant turnaround · resolves on repeat";
    }
    chords.push(
      makeChord(offset, kind, settings, chords.at(-1)?.notes, {
        functionNote,
        ...(functionNote.startsWith("V/vi") ? { roman: "V/vi" } : {}),
        section,
      }),
    );
  }
  return {
    seed: seed >>> 0,
    settings: clone(settings),
    chords,
    events: perform(chords, settings, seed),
  };
}
export function alternatives(chord, settings) {
  const mode = musicalMode(settings);
  const kind =
    chord.quality.startsWith("m") && !chord.quality.startsWith("maj")
      ? "m"
      : chord.offset === 7
        ? "dom"
        : "maj";
  const colors =
    kind === "m"
      ? ["m", "m7", "m9", "madd9"]
      : kind === "dom"
        ? ["7", "9", "13", "sus4"]
        : ["maj", "maj7", "maj9", "add9"];
  const same = colors.map((q) =>
    makeChord(chord.offset, q, settings, chord.notes),
  );
  const substitution =
    mode === "major"
      ? makeChord(5, "m9", settings, chord.notes, {
          functionNote: "Borrowed iv",
        })
      : makeChord(7, "7", settings, chord.notes, {
          functionNote: "Dominant turnaround",
        });
  return [...same, substitution];
}
export const activeEvents = (project) =>
  project.events.filter((e) => project.settings.layers[e.layer]);

export function performPart(chords, settings, seed, layer) {
  const p = partSettings(settings, layer);
  const rng = random(
    seed ^ p.seed ^ { keys: 111, bass: 222, melody: 333 }[layer],
  );
  return writePart(chords, settings, rng, layer, p, STYLES[settings.style]);
}
export function perform(chords, settings, seed) {
  return PARTS.flatMap((l) => performPart(chords, settings, seed, l)).sort(
    (a, b) => a.beat - b.beat || a.midi - b.midi,
  );
}
export function replacePart(
  project,
  layer,
  newSeed = partSettings(project.settings, layer).seed,
) {
  const next = clone(project);
  next.settings.parts ??= defaultParts();
  next.settings.parts[layer] = {
    ...partSettings(next.settings, layer),
    seed: newSeed,
  };
  next.events = [
    ...next.events.filter((e) => e.layer !== layer),
    ...performPart(next.chords, next.settings, next.seed, layer),
  ].sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  return next;
}
export function eventsInSlice(project, startBeat, width = 0.25) {
  // Integer tick boundaries avoid missing/doubling a humanized note at a slice edge.
  const start = Math.round(startBeat * 10000),
    end = Math.round((startBeat + width) * 10000);
  return exportEvents(project).filter(
    (e) =>
      Math.round(e.beat * 10000) >= start && Math.round(e.beat * 10000) < end,
  );
}
export function exportEvents(project, scope = "mix") {
  let events = project.events.filter((e) =>
    scope === "mix"
      ? project.settings.layers[e.layer]
      : scope === "stems" || e.layer === scope,
  );
  const sound = partSettings(project.settings, "bass").sound;
  if (isMonoBass(sound)) {
    const bass = events
      .filter((e) => e.layer === "bass")
      .sort((a, b) => a.beat - b.beat || a.midi - b.midi)
      .filter(
        (e, i, list) =>
          !i ||
          Math.round(e.beat * 10000) !== Math.round(list[i - 1].beat * 10000),
      );
    events = [
      ...events.filter((e) => e.layer !== "bass"),
      ...bass.map((e, i) => ({
        ...e,
        duration: Math.min(
          e.duration,
          (bass[i + 1]?.beat ?? project.settings.bars * 4) - e.beat,
        ),
      })),
    ];
  }
  return events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
}

// Keep edited notes through variations, remap to the closest new chord tone,
// and populate newly added bars rather than leaving the protected lane empty.
export function preserveKeptParts(next, old) {
  for (const layer of PARTS)
    if (partSettings(next.settings, layer).keep) {
      const notes = old.events
        .filter((e) => e.layer === layer && e.bar < next.chords.length)
        .map((e) => {
          const prior = old.chords[e.bar],
            chord = next.chords[e.bar];
          if (
            prior &&
            prior.root === chord.root &&
            prior.quality === chord.quality
          )
            return clone(e);
          const pcs = chord.notes.map((n) => n % 12);
          const candidates = Array.from(
            { length: 77 },
            (_, i) => i + 24,
          ).filter((n) => pcs.includes(n % 12));
          return {
            ...e,
            midi: candidates.sort(
              (a, b) => Math.abs(a - e.midi) - Math.abs(b - e.midi),
            )[0],
          };
        });
      next.events = next.events
        .filter((e) => e.layer !== layer || e.bar >= old.settings.bars)
        .concat(notes);
    }
  next.events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  return next;
}

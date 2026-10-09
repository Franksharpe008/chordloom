// Phrase-level decisions are seeded once, then developed rather than re-rolled per note.
export const MOODS = {
  auto: { name: "Style character" },
  warm: {
    name: "Warm & soulful",
    mode: "major",
    space: 0.85,
    hold: 0.9,
    center: 72,
    energy: 0.9,
  },
  dreamy: {
    name: "Dreamy & floating",
    mode: "major",
    space: 0.6,
    hold: 1.5,
    center: 77,
    energy: 0.72,
  },
  dark: {
    name: "Dark & brooding",
    mode: "minor",
    space: 0.72,
    hold: 0.85,
    center: 68,
    energy: 0.88,
  },
  uplifting: {
    name: "Bright & uplifting",
    mode: "major",
    space: 1,
    hold: 0.8,
    center: 79,
    energy: 1.08,
  },
  tense: {
    name: "Tense & driving",
    mode: "minor",
    space: 1.15,
    hold: 0.6,
    center: 74,
    energy: 1,
  },
};
const CHARACTERS = {
  neo_soul: "warm",
  lofi: "dreamy",
  trap: "dark",
  cinematic: "dreamy",
  amapiano: "uplifting",
  uk_drill: "tense",
  hawaiian: "uplifting",
};
export function moodProfile(settings, style) {
  const id =
    settings.mood && settings.mood !== "auto"
      ? settings.mood
      : CHARACTERS[settings.style];
  return {
    ...MOODS[id],
    mode:
      settings.mood && settings.mood !== "auto" ? MOODS[id].mode : style.mode,
  };
}

// Each route is a harmonic sentence. Two routes provide contrast, not unrelated chord dice.
export const ROUTES = {
  major: {
    warm: [
      [2, 7, 0, 9],
      [5, 7, 4, 9],
      [0, 4, 5, 7],
      [9, 2, 5, 0],
      [0, 9, 2, 7],
      [5, 4, 2, 7],
    ],
    dreamy: [
      [0, 5, 4, 5],
      [5, 0, 9, 5],
      [0, 9, 5, 0],
      [4, 5, 0, 5],
      [9, 5, 0, 4],
      [0, 4, 9, 5],
    ],
    uplifting: [
      [0, 7, 9, 5],
      [5, 7, 0, 0],
      [0, 2, 5, 7],
      [9, 5, 0, 7],
      [0, 5, 2, 7],
      [5, 0, 7, 9],
    ],
  },
  minor: {
    dark: [
      [0, 8, 5, 7],
      [0, 3, 8, 7],
      [0, 5, 0, 7],
      [8, 5, 0, 0],
      [0, 8, 3, 5],
      [5, 8, 0, 7],
    ],
    tense: [
      [0, 1, 0, 7],
      [0, 5, 1, 7],
      [0, 8, 1, 7],
      [5, 0, 1, 7],
      [0, 7, 8, 7],
      [1, 0, 5, 7],
    ],
    dreamy: [
      [0, 8, 3, 8],
      [5, 8, 0, 3],
      [0, 3, 5, 8],
      [8, 3, 0, 5],
      [0, 5, 3, 8],
      [3, 8, 5, 0],
    ],
  },
};
export function harmonicRoutes(settings, style, rng) {
  const m = moodProfile(settings, style);
  const character =
    settings.mood && settings.mood !== "auto"
      ? settings.mood
      : CHARACTERS[settings.style];
  const bank =
    ROUTES[m.mode][character] ??
    ROUTES[m.mode][m.mode === "major" ? "warm" : "dark"];
  const candidates =
    settings.mood === "auto" || !settings.mood
      ? [...style.patterns, ...bank]
      : bank;
  const choices = candidates.filter(
    (route, i) =>
      candidates.findIndex(
        (other) => JSON.stringify(other) === JSON.stringify(route),
      ) === i,
  );
  const a = Math.floor(rng() * choices.length);
  let b = Math.floor(rng() * (choices.length - 1));
  if (b >= a) b++;
  return [choices[a], choices[b]];
}

const RHYTHMS = {
  pocket: [
    [0, 1.5, 2.75, 3.5],
    [0, 0.75, 2, 3.25],
    [0, 1.75, 2.5, 3.75],
    [0.5, 1.5, 2.5, 3.5],
  ],
  bounce: [
    [0.5, 1.5, 2.5, 3.5],
    [0, 0.75, 1.5, 2.75, 3.5],
    [0.5, 1.25, 2.5, 3.25],
  ],
  arp: [
    [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
    [0, 0.75, 1.5, 2, 2.75, 3.5],
    [0, 0.5, 1.5, 2, 3, 3.5],
  ],
  flow: [
    [0, 1, 2, 3],
    [0, 0.75, 1.5, 2.5, 3.25],
    [0, 1.5, 2.5, 3.5],
  ],
  sustain: [[0, 2.5]],
  trap: [
    [0, 0.75, 1.5, 2.75, 3.5],
    [0, 1.5, 2.25, 3.25, 3.75],
    [0, 0.5, 1.75, 2.5, 3.5],
    [0, 1.25, 2.75, 3.75],
  ],
  drill: [
    [0, 0.75, 1.75, 2.75, 3.25, 3.75],
    [0, 1.5, 1.75, 2.5, 3.25],
    [0, 0.5, 1.25, 2, 3.5, 3.75],
  ],
  soul: [
    [0.5, 1.25, 2, 2.75, 3.5],
    [0.75, 1.5, 2.5, 3.25],
    [0, 1.5, 2.25, 3.5],
    [0.5, 1, 2.5, 3.25],
  ],
  pulse: [
    [0, 1, 2, 3],
    [0, 0.5, 1, 2, 2.5, 3],
  ],
  cinematic: [
    [0, 1.5, 3],
    [0.5, 2, 3.5],
    [0, 1, 2.5, 3.5],
  ],
  spark: [
    [0, 0.5, 1.5, 2, 2.5, 3.5],
    [0.5, 1.25, 2, 2.75, 3.25],
    [0, 0.75, 1.5, 2.5, 3.5],
  ],
};
const CONTOURS = [
  [0, 1, 2, 1, 0, -1, 0, 0],
  [0, 2, 1, 0, -1, 1, 0, -1],
  [0, -1, -2, 0, 1, 2, 1, 0],
  [0, 0, 2, 1, 0, -2, -1, 0],
  [0, 1, 0, 3, 2, 1, 0, -1],
  [0, -2, -1, 0, 2, 1, 0, 0],
];
const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const round = (n) => Math.round(n * 10000) / 10000;
function phraseRhythm(pattern, rng) {
  const result = [...pattern];
  if (result.length > 2) {
    const i = 1 + Math.floor(rng() * (result.length - 1));
    const shifted = Math.max(
      0.25,
      Math.min(3.75, result[i] + pick([-0.25, 0.25], rng)),
    );
    if (!result.includes(shifted)) result[i] = shifted;
  }
  return result.sort((a, b) => a - b);
}
export function swingBeat(beat, amount) {
  // Eighth-note pairs: preserve the downbeat, delay the second half and its sixteenths.
  const whole = Math.floor(beat),
    fraction = beat - whole;
  return (
    whole +
    (fraction < 0.5
      ? fraction * (1 + amount / 3)
      : 0.5 + amount / 6 + (fraction - 0.5) * (1 - amount / 3))
  );
}
function positions(pattern, density, space, rng, layer, groove, phraseEnd) {
  const extras = Array.from({ length: 16 }, (_, i) => i / 4).filter(
    (b) => !pattern.includes(b),
  );
  const ranked = extras
    .map((b) => ({ b, rank: rng() }))
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.b);
  const ordered = [...pattern, ...ranked];
  const limit =
    groove === "sustain"
      ? 2
      : layer === "keys" && !["arp", "flow"].includes(groove)
        ? 6
        : layer === "bass"
          ? 8
          : 10;
  const count = Math.max(
    1,
    Math.min(limit, Math.round(1 + density * (limit - 1) * space)) -
      (phraseEnd && layer === "melody" ? 1 : 0),
  );
  return ordered.slice(0, count).sort((a, b) => a - b);
}
function chordPitch(chord, target, last, low = 60, high = 91) {
  const choices = Array.from(
    { length: high - low + 1 },
    (_, i) => low + i,
  ).filter((n) => chord.notes.some((p) => p % 12 === n % 12));
  return choices.sort(
    (a, b) =>
      Math.abs(a - target) +
      Math.abs(a - last) * 0.18 -
      (Math.abs(b - target) + Math.abs(b - last) * 0.18),
  )[0];
}
export function writePart(chords, settings, rng, layer, p, style) {
  const mood = moodProfile(settings, style),
    events = [];
  const groove =
    layer === "keys"
      ? settings.rhythm !== "auto"
        ? settings.rhythm
        : p.groove === "auto"
          ? style.rhythm
          : p.groove
      : p.groove === "auto"
        ? layer === "bass"
          ? ["trap", "uk_drill"].includes(settings.style)
            ? "trap"
            : "soul"
          : ["trap", "uk_drill"].includes(settings.style)
            ? "trap"
            : settings.style === "cinematic"
              ? "cinematic"
              : "soul"
        : p.groove;
  const rhythms = RHYTHMS[groove];
  const call = phraseRhythm(pick(rhythms, rng), rng),
    answer = phraseRhythm(pick(rhythms, rng), rng);
  const contour = [...pick(CONTOURS, rng)],
    center = mood.center + pick([-3, 0, 3], rng),
    direction = pick([1, -1], rng);
  // Mutate one contour step for a fresh hook, then repeat/develop that identity.
  const changedStep = 1 + Math.floor(rng() * 6);
  contour[changedStep] = Math.max(
    -3,
    Math.min(3, contour[changedStep] + pick([-1, 1], rng)),
  );
  const arpShape = pick(["up", "down", "pendulum", "broken"], rng);
  const rootRegister = ["808", "sub", "punch808", "long808", "log"].includes(
    p.sound,
  )
    ? 24
    : 36;
  let last = center;
  const add = (bar, beat, duration, midi, velocity) => {
    const local = round(
      Math.max(
        0,
        Math.min(
          3.98,
          swingBeat(beat, p.swing) + (rng() - 0.5) * 0.035 * settings.humanize,
        ),
      ),
    );
    events.push({
      bar,
      beat: round(bar * 4 + local),
      duration: Math.max(
        0.01,
        Math.floor(Math.min(duration, 4 - local) * 10000) / 10000,
      ),
      midi,
      velocity: Math.min(
        0.9,
        Math.max(
          0.12,
          velocity * mood.energy + (rng() - 0.5) * 0.1 * settings.humanize,
        ),
      ),
      layer,
    });
  };
  chords.forEach((c, bar) => {
    const response = bar % 2 === 1,
      phraseEnd = bar % 4 === 3;
    const bSection = c.section === "B",
      returnPhrase = c.section === "Return";
    const pattern = response ? answer : call;
    const density = Math.min(1, p.density * (0.8 + settings.complexity * 0.1));
    const onsets = positions(
      pattern,
      density,
      mood.space * (bSection ? 1.15 : returnPhrase ? 0.85 : 1),
      rng,
      layer,
      groove,
      phraseEnd,
    );
    onsets.forEach((beat, i) => {
      const gap = (onsets[i + 1] ?? 4) - beat;
      const accent =
        (i === 0 ? 1 : 0.84) * (bSection ? 1.08 : 1) * (phraseEnd ? 0.92 : 1);
      if (layer === "keys") {
        if (["arp", "flow"].includes(groove)) {
          let index =
            arpShape === "down"
              ? c.notes.length - 1 - (i % c.notes.length)
              : arpShape === "pendulum"
                ? Math.abs(
                    (i % (c.notes.length * 2 - 2)) - (c.notes.length - 1),
                  )
                : arpShape === "broken"
                  ? (i * 2 + (response ? 1 : 0)) % c.notes.length
                  : i % c.notes.length;
          add(
            bar,
            beat,
            Math.min(gap * (groove === "flow" ? 1.15 : 0.8) * mood.hold, 2.8),
            c.notes[index],
            0.56 * accent,
          );
        } else {
          const notes =
            p.density < 0.25 ? c.notes.filter((n, j) => j < 3) : c.notes;
          notes.forEach((n, j) =>
            add(
              bar,
              Math.min(3.95, beat + j * 0.008),
              groove === "sustain"
                ? Math.min(gap * 0.98, 3.8)
                : Math.min(gap * 0.78 * mood.hold, 1.6),
              n,
              0.48 * accent,
            ),
          );
        }
      } else if (layer === "bass") {
        const pc =
          i === 0
            ? c.root
            : response && i === onsets.length - 1
              ? c.root
              : c.notes[(i + (bar % 2)) % Math.min(3, c.notes.length)] % 12;
        let midi = rootRegister + pc;
        // Place upper bass tones near the root; occasional octave answers connect 808 phrases.
        while (
          midi < rootRegister + c.root - 5 &&
          midi + 12 <= rootRegister + 23
        )
          midi += 12;
        if (
          ["trap", "drill"].includes(groove) &&
          i === onsets.length - 2 &&
          response
        )
          midi = Math.min(59, rootRegister + c.root + 12);
        add(bar, beat, Math.min(gap * 0.94, 3.8), midi, 0.66 * accent);
      } else {
        const shape =
          contour[(i + (response ? 4 : 0)) % contour.length] * direction;
        const target =
          center + shape * 2 + (bSection ? 3 : c.section === "A′" ? 1 : 0);
        const midi =
          phraseEnd && i === onsets.length - 1
            ? chordPitch(c, center, last)
            : chordPitch(c, target, last);
        last = midi;
        const hold =
          groove === "cinematic" ? 1.25 : groove === "trap" ? 0.62 : 0.8;
        add(
          bar,
          beat,
          Math.min(gap * hold * mood.hold, phraseEnd ? 1.8 : 2.4),
          midi,
          0.47 * accent,
        );
      }
    });
  });
  return events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
}

// A composition is a repeating musical sentence. Randomness chooses its identity,
// not a new rhythm, bass function or melodic register on every note.
export const MOODS = {
  auto: { name: "Style character" },
  warm: {
    name: "Warm & soulful",
    mode: "major",
    space: 0.9,
    hold: 1,
    center: 74,
    energy: 0.9,
  },
  dreamy: {
    name: "Dreamy & floating",
    mode: "major",
    space: 0.62,
    hold: 1.5,
    center: 77,
    energy: 0.74,
  },
  dark: {
    name: "Dark & brooding",
    mode: "minor",
    space: 0.78,
    hold: 0.9,
    center: 68,
    energy: 0.9,
  },
  uplifting: {
    name: "Bright & uplifting",
    mode: "major",
    space: 1,
    hold: 0.85,
    center: 79,
    energy: 1,
  },
  tense: {
    name: "Tense & driving",
    mode: "minor",
    space: 1.1,
    hold: 0.65,
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
const pick = (items, rng) => items[Math.floor(rng() * items.length)];
const round = (n) => Math.round(n * 10000) / 10000;
const pc = (n) => ((n % 12) + 12) % 12;

// Harmonic rhythm belongs to the genre: trap/drill/score can sit on a chord
// for two bars; soul has functional movement; lo-fi has cyclical, softer turns.
const HARMONY = {
  neo_soul: {
    major: [
      [2, 7, 0, 9],
      [5, 7, 4, 9],
      [0, 9, 2, 7],
      [9, 2, 5, 7],
      [5, 4, 2, 7],
      [0, 4, 5, 7],
    ],
    minor: [
      [0, 5, 8, 7],
      [5, 7, 0, 0],
      [0, 8, 5, 7],
      [8, 3, 5, 7],
    ],
  },
  lofi: {
    major: [
      [0, 0, 9, 9],
      [5, 4, 9, 9],
      [2, 7, 0, 0],
      [0, 4, 9, 7],
      [5, 5, 0, 0],
      [0, 9, 5, 5],
    ],
    minor: [
      [0, 0, 5, 5],
      [5, 0, 5, 0],
      [0, 8, 7, 7],
      [0, 0, 8, 8],
    ],
  },
  trap: {
    major: [
      [0, 0, 9, 9],
      [9, 9, 5, 7],
      [0, 0, 5, 5],
      [0, 7, 9, 5],
    ],
    minor: [
      [0, 0, 8, 8],
      [0, 0, 5, 7],
      [0, 0, 3, 3],
      [0, 8, 5, 7],
      [0, 0, 0, 7],
      [0, 5, 8, 8],
    ],
  },
  uk_drill: {
    major: [
      [9, 9, 5, 5],
      [0, 0, 9, 7],
      [0, 5, 9, 9],
      [9, 5, 0, 7],
    ],
    minor: [
      [0, 0, 1, 1],
      [0, 0, 8, 7],
      [0, 5, 1, 7],
      [0, 0, 5, 5],
      [0, 1, 0, 7],
      [0, 0, 8, 8],
    ],
  },
  cinematic: {
    major: [
      [0, 0, 5, 5],
      [9, 9, 5, 5],
      [0, 0, 9, 9],
      [5, 5, 0, 0],
    ],
    minor: [
      [0, 0, 8, 8],
      [0, 0, 5, 5],
      [5, 5, 8, 8],
      [0, 0, 3, 3],
      [8, 8, 3, 3],
    ],
  },
  amapiano: {
    major: [
      [0, 5, 9, 7],
      [5, 5, 0, 0],
      [0, 9, 5, 7],
      [9, 5, 0, 7],
      [0, 0, 5, 5],
    ],
    minor: [
      [0, 8, 3, 7],
      [0, 0, 5, 5],
      [5, 8, 0, 7],
      [0, 8, 5, 7],
    ],
  },
  hawaiian: {
    major: [
      [0, 9, 5, 7],
      [0, 0, 5, 7],
      [0, 5, 7, 0],
      [5, 0, 7, 0],
      [0, 7, 9, 5],
    ],
    minor: [
      [0, 8, 3, 7],
      [0, 5, 7, 0],
      [0, 0, 8, 7],
      [5, 0, 8, 7],
    ],
  },
};
export function harmonicRoutes(settings, style, rng) {
  const mood = moodProfile(settings, style);
  let bank = HARMONY[settings.style][mood.mode];
  // A mood changes harmony, but keeps the style's harmonic rhythm and vocabulary.
  if (settings.mood === "dreamy") bank = bank.filter((r) => !r.includes(7));
  if (!bank.length) bank = HARMONY[settings.style][mood.mode];
  if (settings.mood && settings.mood !== "auto") {
    const colors = {
      warm: [
        [2, 7, 0, 9],
        [5, 7, 4, 9],
        [0, 9, 2, 7],
      ],
      dreamy: [
        [0, 9, 5, 0],
        [5, 5, 0, 9],
        [0, 4, 9, 5],
      ],
      uplifting: [
        [0, 7, 9, 5],
        [0, 5, 2, 7],
        [5, 7, 0, 0],
      ],
      dark: [
        [0, 8, 5, 7],
        [5, 8, 0, 7],
        [0, 0, 8, 5],
      ],
      tense: [
        [0, 1, 5, 7],
        [5, 1, 0, 7],
        [0, 7, 1, 7],
      ],
    };
    bank = colors[settings.mood];
    if (["trap", "uk_drill", "cinematic"].includes(settings.style))
      bank = bank.map((r) => [r[0], r[0], r[2], r[2]]);
  }
  const a = [...pick(bank, rng)],
    b = [...a];
  // Keep the recognizable first half. An answer alters one harmonic destination,
  // rather than replacing the entire sentence at the halfway point.
  const other = pick(bank, rng);
  b[2] = other[2];
  b[3] = other[3];
  return [a, b];
}

// Priority-ordered attacks, not random sixteenths. Low density keeps the anchor;
// higher density adds a related response or fill. Each pair is a two-bar phrase.
const RHYTHMS = {
  pocket: [
    [
      [0, 2.5, 1.5, 3.5],
      [0, 2.5, 3.25, 1.5],
    ],
    [
      [0, 2.75, 1.75, 3.5],
      [0, 2, 3.25, 1.25],
    ],
    [
      [0, 2, 3.5, 1.5],
      [0, 2.5, 1, 3.5],
    ],
  ],
  bounce: [
    [
      [0.5, 2.5, 1.5, 3.5],
      [0.5, 2.5, 1.5, 3.5],
    ],
    [
      [0.5, 1.5, 2.5, 3.5],
      [0.5, 2.5, 3.5, 1.5],
    ],
  ],
  arp: [
    [
      [0, 2, 0.5, 2.5, 1.5, 3.5, 1, 3],
      [0, 2, 0.5, 2.5, 1.5, 3.5, 1, 3],
    ],
    [
      [0, 1.5, 2.5, 0.5, 3.5, 2, 1, 3],
      [0, 1.5, 2.5, 0.5, 3.5, 2, 1, 3],
    ],
  ],
  flow: [
    [
      [0, 2, 1, 3, 0.5, 2.5],
      [0, 2, 1, 3, 0.5, 2.5],
    ],
    [
      [0, 2.5, 1.5, 3.5, 0.5, 2],
      [0, 2.5, 1.5, 3.5, 0.5, 2],
    ],
  ],
  sustain: [
    [
      [0, 2.5],
      [0, 2.5],
    ],
  ],
  trap: [
    [
      [0, 2.5, 1.5, 3.5, 3.75],
      [0, 2, 3.5, 1.5, 3.75],
    ],
    [
      [0, 2, 3.25, 1.5, 3.75],
      [0, 2.5, 3.5, 1.25, 3.75],
    ],
    [
      [0, 2.75, 1.5, 3.5, 3.75],
      [0, 2.75, 1.5, 3.5, 3.75],
    ],
  ],
  drill: [
    [
      [0, 1.5, 2.75, 3.5, 3.75],
      [0, 2.5, 1.75, 3.5, 3.75],
    ],
    [
      [0, 1.75, 2.5, 3.5, 3.75],
      [0, 2.75, 1.5, 3.5, 3.75],
    ],
  ],
  soul: [
    [
      [0, 2.5, 1.75, 3.5, 3.75],
      [0, 2.5, 1.5, 3.5, 3.75],
    ],
    [
      [0, 2, 3.25, 1.5, 3.75],
      [0, 2.75, 1.75, 3.5, 3.75],
    ],
  ],
  pulse: [
    [
      [0, 2, 1, 3],
      [0, 2, 1, 3],
    ],
  ],
  log: [
    [
      [0.75, 2.5, 1.75, 3.25, 3.5, 3.75],
      [0.75, 2.75, 1.5, 3.25, 3.5, 3.75],
    ],
    [
      [0.5, 2.25, 1.75, 3, 3.5, 3.75],
      [0.5, 2.5, 1.25, 3.25, 3.5, 3.75],
    ],
  ],
};
const LEADS = {
  neo_soul: [
    [
      [0.75, 1.5, 3, 2.5, 3.5],
      [0.5, 2.5, 1.25, 3.25, 3.5],
    ],
    [
      [0.5, 1.25, 2.75, 2, 3.25],
      [0.75, 2.5, 1.5, 3, 3.5],
    ],
    [
      [1, 2.5, 3.25, 1.75, 3.5],
      [0.75, 2, 3, 1.5, 3.5],
    ],
  ],
  lofi: [
    [
      [0.75, 2.5, 1.5, 3.25],
      [1, 2.75, 1.75, 3.5],
    ],
    [
      [1.5, 3, 2.25, 0.5],
      [0.75, 2.5, 1.5, 3.25],
    ],
  ],
  trap: [
    [
      [0.75, 1.5, 3, 2.5, 3.5],
      [0.75, 1.5, 3, 2.5, 3.5],
    ],
    [
      [0.5, 1.5, 2.75, 2.25, 3.5],
      [0.5, 1.5, 2.75, 2.25, 3.5],
    ],
    [
      [0, 1, 2.5, 1.75, 3.5],
      [0, 1, 2.5, 1.75, 3.5],
    ],
  ],
  uk_drill: [
    [
      [0.5, 2, 3.25, 1.25, 3.5],
      [0.5, 2, 3.25, 1.25, 3.5],
    ],
    [
      [0, 1.5, 3, 2.25, 3.5],
      [0, 1.5, 3, 2.25, 3.5],
    ],
  ],
  cinematic: [
    [
      [0.5, 2.5, 3.25],
      [1, 2.5, 3.5],
    ],
    [
      [0, 2, 3],
      [0.5, 2.5, 3.5],
    ],
    [
      [1, 2.75, 3.5],
      [0.5, 2.25, 3.25],
    ],
  ],
  amapiano: [
    [
      [1, 2.75, 1.75, 3.25],
      [0.5, 2, 3, 1.25],
    ],
    [
      [0.75, 2.25, 1.5, 3.5],
      [1, 2.5, 3.25, 1.75],
    ],
  ],
  hawaiian: [
    [
      [0.5, 1.5, 2.75, 2.25, 3.25],
      [0.75, 1.5, 3, 2.25, 3.5],
    ],
    [
      [0, 1.5, 2.5, 1, 3.25],
      [0.5, 2, 3, 1.25, 3.5],
    ],
  ],
};
const CONTOURS = [
  [0, 1, 2, 1, 0, -1, 1, 0],
  [0, 0, 2, 1, 0, 1, -1, 0],
  [2, 1, 0, 1, 2, 1, -1, 0],
  [0, -1, 0, 2, 1, 0, 1, 0],
  [1, 2, 1, 0, 1, 0, -1, 0],
  [0, 2, 1, 0, 0, -1, 1, 0],
  [0, 1, 0, -1, 0, 2, 1, 0],
  [1, 0, 1, 2, 1, 0, -1, 0],
];
const WRITING = {
  neo_soul: {
    bass: "soul",
    lead: "soul",
    keyHold: 0.68,
    bassHold: 0.65,
    leadHold: 0.72,
    chordHits: 4,
    bassHits: 5,
    leadHits: 5,
  },
  lofi: {
    bass: "soul",
    lead: "soul",
    keyHold: 0.8,
    bassHold: 0.78,
    leadHold: 0.86,
    chordHits: 3,
    bassHits: 4,
    leadHits: 4,
  },
  trap: {
    bass: "trap",
    lead: "trap",
    keyHold: 0.58,
    bassHold: 0.86,
    leadHold: 0.55,
    chordHits: 3,
    bassHits: 5,
    leadHits: 5,
  },
  uk_drill: {
    bass: "drill",
    lead: "trap",
    keyHold: 0.4,
    bassHold: 0.72,
    leadHold: 0.46,
    chordHits: 3,
    bassHits: 5,
    leadHits: 5,
  },
  cinematic: {
    bass: "pulse",
    lead: "cinematic",
    keyHold: 1.1,
    bassHold: 0.92,
    leadHold: 1.15,
    chordHits: 2,
    bassHits: 3,
    leadHits: 3,
  },
  amapiano: {
    bass: "log",
    lead: "spark",
    keyHold: 0.3,
    bassHold: 0.33,
    leadHold: 0.58,
    chordHits: 4,
    bassHits: 6,
    leadHits: 4,
  },
  hawaiian: {
    bass: "soul",
    lead: "soul",
    keyHold: 0.32,
    bassHold: 0.62,
    leadHold: 0.65,
    chordHits: 4,
    bassHits: 4,
    leadHits: 5,
  },
};
export function swingBeat(beat, amount) {
  const whole = Math.floor(beat),
    fraction = beat - whole;
  return (
    whole +
    (fraction < 0.5
      ? fraction * (1 + amount / 3)
      : 0.5 + amount / 6 + (fraction - 0.5) * (1 - amount / 3))
  );
}
function nearest(pcs, target, low, high, last = target) {
  const candidates = Array.from(
    { length: high - low + 1 },
    (_, i) => low + i,
  ).filter((n) => pcs.includes(pc(n)));
  return candidates.sort(
    (a, b) =>
      Math.abs(a - target) +
      0.32 * Math.abs(a - last) -
      (Math.abs(b - target) + 0.32 * Math.abs(b - last)),
  )[0];
}
function attacks(pattern, density, space, phase, max) {
  const limit = Math.min(max, pattern.length);
  // Fractional ranks spread activity across bars, giving the slider genuine
  // progression without turning every bar into a maximum-density fill.
  const count = Math.min(
    limit,
    1 + Math.floor(density * (limit - 1) * space + phase),
  );
  return pattern.slice(0, Math.max(1, count)).sort((a, b) => a - b);
}
export function writePart(chords, settings, rng, layer, p, style) {
  const mood = moodProfile(settings, style),
    rules = WRITING[settings.style];
  const groove =
    layer === "keys"
      ? settings.rhythm !== "auto"
        ? settings.rhythm
        : p.groove === "auto"
          ? style.rhythm
          : p.groove
      : p.groove === "auto"
        ? rules[layer === "bass" ? "bass" : "lead"]
        : p.groove;
  const logRole = layer === "bass" && p.sound === "log";
  const leadStyle =
    groove === "cinematic"
      ? "cinematic"
      : groove === "trap"
        ? settings.style === "uk_drill"
          ? "uk_drill"
          : "trap"
        : settings.style;
  const phrase = pick(
    layer === "melody" ? LEADS[leadStyle] : RHYTHMS[logRole ? "log" : groove],
    rng,
  );
  const shape = [...pick(CONTOURS, rng)];
  const center = mood.center + pick([-2, 0, 2], rng);
  const lowLead = Math.max(64, center - 4),
    highLead = Math.min(88, center + 7);
  const scale = (
    mood.mode === "major" ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]
  ).map((n) => pc(n + settings.key));
  const phases = Array.from({ length: 4 }, () => rng() * 0.95);
  const shapeStart = pick([0, 2, 4], rng);
  const upperBass = p.sound === "finger" || p.sound === "piano";
  const bassLow = upperBass ? 36 : 28,
    bassHigh = upperBass ? 55 : 51;
  const arpShape = pick(
    [
      [0, 1, 2, 1],
      [0, 2, 1, 2],
      [2, 1, 0, 1],
      [0, 1, 0, 2],
    ],
    rng,
  );
  const events = [];
  let last = center;
  function add(bar, beat, duration, midi, velocity, slide) {
    const local = round(
      Math.max(
        0,
        Math.min(
          3.98,
          swingBeat(beat, p.swing) + (rng() - 0.5) * 0.022 * settings.humanize,
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
      velocity: Math.max(
        0.12,
        Math.min(
          0.85,
          velocity * mood.energy + (rng() - 0.5) * 0.06 * settings.humanize,
        ),
      ),
      layer,
      ...(layer === "bass" ? { slide: Boolean(slide) } : {}),
    });
  }
  chords.forEach((c, bar) => {
    const answer = bar % 2,
      end = bar % 4 === 3,
      sectionLift =
        c.section === "B" ? 1.08 : c.section === "Return" ? 0.85 : 1;
    const arpeggio = layer === "keys" && ["arp", "flow"].includes(groove);
    const max =
      layer === "keys"
        ? groove === "sustain" || p.sound === "pad"
          ? 2
          : arpeggio
            ? settings.style === "cinematic"
              ? 5
              : 8
            : rules.chordHits
        : layer === "bass"
          ? logRole
            ? 6
            : groove === "pulse"
              ? 4
              : rules.bassHits
          : rules.leadHits;
    // Harmony color affects voices, not a random increase in all three lanes.
    const activity = layer === "keys" ? 1 : mood.space * sectionLift;
    const onsets = attacks(
      phrase[answer],
      p.density,
      activity,
      phases[bar % 4],
      max,
    );
    const timed = onsets.map((b) => swingBeat(b, p.swing));
    const chordPcs = c.notes.map(pc);
    // Keep accompaniment below the lead; avoid five-note clustered chord bursts.
    const shell =
      c.notes.length > 4
        ? c.notes.filter(
            (n) => pc(n) !== pc(c.root + (settings.layers.bass ? 0 : 7)),
          )
        : c.notes;
    const voicing = [
      ...new Set(
        shell.map((n) => {
          while (n > lowLead - 2) n -= 12;
          while (n < 48) n += 12;
          return n;
        }),
      ),
    ]
      .sort((a, b) => a - b)
      .slice(0, settings.complexity === 1 ? 3 : 4);
    const root = nearest(
      [c.root],
      upperBass ? 40 : 33,
      bassLow,
      upperBass ? 47 : 39,
    );
    onsets.forEach((beat, i) => {
      const gap = (timed[i + 1] ?? 4) - timed[i],
        accent = (i === 0 ? 1 : 0.87) * (end ? 0.95 : 1);
      if (layer === "keys") {
        if (arpeggio && p.sound !== "pad") {
          const n = voicing[arpShape[i % 4] % Math.min(3, voicing.length)];
          add(
            bar,
            beat,
            Math.min(
              gap * rules.keyHold * mood.hold,
              groove === "flow" ? 2.5 : 1.1,
            ),
            n,
            0.52 * accent,
          );
        } else {
          voicing.forEach((n, j) =>
            add(
              bar,
              beat + j * 0.006,
              Math.min(
                gap *
                  (groove === "sustain" || p.sound === "pad"
                    ? 0.97
                    : rules.keyHold) *
                  mood.hold,
                3.85,
              ),
              n,
              0.46 * accent,
            ),
          );
        }
      } else if (layer === "bass") {
        let midi = root,
          slide = false;
        const lastHit = i === onsets.length - 1;
        // Root anchors stay rooted. Soul may answer on a fifth; trap/drill use
        // a rare octave pickup, never thirds/sevenths wandering through the sub.
        if (
          i > 0 &&
          upperBass &&
          !["trap", "drill"].includes(groove) &&
          i === 1 &&
          answer
        )
          midi = nearest([pc(c.root + 7)], root + 5, bassLow, bassHigh);
        if (
          i > 0 &&
          ["trap", "drill"].includes(groove) &&
          answer &&
          lastHit &&
          beat >= 3
        ) {
          midi = Math.min(bassHigh, root + 12);
          slide = !logRole && !upperBass;
        }
        if (logRole && answer && lastHit) midi = Math.min(bassHigh, root + 12);
        // Only intentional slide targets have a connected preceding note. Normal
        // root changes release cleanly and retain their tuning.
        const connects =
          ["trap", "drill"].includes(groove) &&
          answer &&
          i === onsets.length - 2 &&
          onsets.at(-1) >= 3;
        const hold = connects ? 1 : logRole ? 0.33 : rules.bassHold;
        add(
          bar,
          beat,
          Math.min(gap * hold, logRole ? 0.36 : 3.7),
          midi,
          (logRole && i > 2 ? 0.43 : 0.65) * accent,
          slide,
        );
      } else {
        const s = shape[(shapeStart + i + (answer ? 4 : 0)) % shape.length];
        const target = center + s * 2 + (c.section === "B" && end ? 2 : 0);
        let midi = nearest(chordPcs, target, lowLead, highLead, last);
        const weak = !Number.isInteger(beat) && i > 0 && !lastHit(onsets, i);
        // Short neighboring pentatonic tones can connect anchors. Long/strong
        // notes resolve to the active harmony; cap leaps to keep a singable line.
        const passing = nearest(scale, target, lowLead, highLead, last);
        if (
          weak &&
          Math.abs(passing - last) <= 2 &&
          gap < 0.8 &&
          !["trap", "uk_drill"].includes(settings.style)
        )
          midi = passing;
        if (Math.abs(midi - last) > 7)
          midi = nearest(chordPcs, last, lowLead, highLead, last);
        last = midi;
        const ending = end && i === onsets.length - 1;
        const hold = !chordPcs.includes(pc(midi))
          ? Math.min(gap * 0.5, 0.35)
          : Math.min(
              gap * 0.95,
              gap * rules.leadHold * mood.hold,
              ending ? 1.25 : 2.8,
            );
        add(bar, beat, hold, midi, 0.5 * accent);
      }
    });
  });
  return events.sort((a, b) => a.beat - b.beat || a.midi - b.midi);
}
const lastHit = (onsets, i) => i === onsets.length - 1;

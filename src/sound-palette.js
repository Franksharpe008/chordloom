import { defaultParts } from "./music-engine.js?v=6";
// New sessions use a coherent palette; legacy sessions retain their saved choices.
export const STYLE_PALETTES = {
  neo_soul: {
    keys: ["electric", "pocket", 0.8],
    bass: ["finger", "soul", 0.8],
    melody: ["piano", "soul", 0.65],
  },
  lofi: {
    keys: ["electric", "pocket", 0.75],
    bass: ["finger", "soul", 0.8],
    melody: ["marimba", "soul", 0.52],
  },
  trap: {
    keys: ["piano", "arp", 0.7],
    bass: ["punch808", "trap", 0.8],
    melody: ["bell", "trap", 0.6],
  },
  uk_drill: {
    keys: ["piano", "arp", 0.7],
    bass: ["long808", "drill", 0.8],
    melody: ["bell", "trap", 0.6],
  },
  cinematic: {
    keys: ["pad", "flow", 0.7],
    bass: ["finger", "pulse", 0.7],
    melody: ["piano", "cinematic", 0.7],
  },
  amapiano: {
    keys: ["electric", "bounce", 0.75],
    bass: ["log", "trap", 0.75],
    melody: ["marimba", "spark", 0.58],
  },
  hawaiian: {
    keys: ["piano", "bounce", 0.75],
    bass: ["finger", "soul", 0.75],
    melody: ["marimba", "soul", 0.58],
  },
};
export const STYLE_TEMPOS = {
  neo_soul: 92,
  lofi: 78,
  trap: 140,
  uk_drill: 142,
  cinematic: 80,
  amapiano: 112,
  hawaiian: 100,
};
export function applyStylePalette(settings) {
  const parts = structuredClone(settings.parts ?? defaultParts());
  for (const [lane, [sound, groove, volume]] of Object.entries(
    STYLE_PALETTES[settings.style],
  )) {
    // Keep protects written notes, never freezes instrument choice.
    Object.assign(parts[lane], {
      sound,
      groove,
      volume,
      swing: ["trap", "uk_drill"].includes(settings.style) ? 0 : 0.12,
      glide: settings.style === "uk_drill" ? 0.65 : 0.12,
    });
  }
  return { ...settings, bpm: STYLE_TEMPOS[settings.style], parts };
}
export const SAMPLE_BANKS = {
  piano: Object.fromEntries(
    [2, 3, 4, 5]
      .flatMap((o) =>
        ["C", "D#", "F#", "A"].map((n) => [
          n + o,
          "samples/piano/" + n.replace("#", "s") + o + ".mp3",
        ]),
      )
      .concat([["C6", "samples/piano/C6.mp3"]]),
  ),
  finger: Object.fromEntries(
    ["B1", "E2", "A2", "D3", "G3"].map((n) => [
      n,
      "samples/bass/" + n.toLowerCase() + "-1.wav",
    ]),
  ),
  finger2: Object.fromEntries(
    ["B1", "E2", "A2", "D3", "G3"].map((n) => [
      n,
      "samples/bass/" + n.toLowerCase() + "-2.wav",
    ]),
  ),
  marimba: Object.fromEntries(
    ["G2", "F3", "C4", "B4", "F5", "C6"].map((n) => [
      n.slice(0, -1) + (Number(n.slice(-1)) + 1),
      "samples/mallets/" + n + ".wav",
    ]),
  ),
  punch808: { C2: "samples/808/punch-C2.wav" },
  long808: { C2: "samples/808/long-C2.wav" },
};

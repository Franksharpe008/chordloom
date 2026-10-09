import test from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  DEFAULT_SETTINGS,
  clone,
  MOODS,
  PARTS,
  GROOVES,
  replacePart,
  musicalMode,
  exportEvents,
} from "../src/music-engine.js";
import { applyStylePalette } from "../src/sound-palette.js";
import { validateProject } from "../src/project-store.js";
import { swingBeat } from "../src/composition.js";
import { bassTransition } from "../src/audio-engine.js";
const settings = () => ({
  ...applyStylePalette(clone(DEFAULT_SETTINGS)),
  humanize: 0,
});
const lane = (p, l) => p.events.filter((e) => e.layer === l);
test("moods change harmony, melodic register, articulation and space at the same seed and tempo", () => {
  const takes = Object.fromEntries(
    Object.keys(MOODS)
      .filter((m) => m !== "auto")
      .map((mood) => [
        mood,
        { ...generate({ ...settings(), mood }, 421), title: mood },
      ]),
  );
  assert.equal(
    new Set(
      Object.values(takes).map((p) =>
        JSON.stringify(p.chords.map((c) => [c.root, c.quality])),
      ),
    ).size,
    5,
  );
  const meanPitch = (p) =>
    lane(p, "melody").reduce((a, e) => a + e.midi, 0) /
    lane(p, "melody").length;
  const meanHold = (p) =>
    lane(p, "melody").reduce((a, e) => a + e.duration, 0) /
    lane(p, "melody").length;
  assert.ok(meanPitch(takes.uplifting) > meanPitch(takes.dark) + 5);
  assert.ok(meanHold(takes.dreamy) > meanHold(takes.tense) * 1.5);
  assert.ok(
    lane(takes.tense, "melody").length > lane(takes.dreamy, "melody").length,
  );
  assert.equal(musicalMode(takes.dark.settings), "minor");
  assert.equal(musicalMode(takes.uplifting.settings), "major");
  for (const p of Object.values(takes)) assert.deepEqual(validateProject(p), p);
});
test("new ideas differ without humanization and phrases reuse a hook before contrasting and returning", () => {
  const s = { ...settings(), bars: 16 };
  const signatures = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const p = generate(s, seed);
    signatures.add(
      JSON.stringify(p.events.map((e) => [e.midi, e.beat, e.duration])),
    );
    for (const e of p.events)
      assert.ok(e.beat + e.duration <= (e.bar + 1) * 4 + 0.00001);
  }
  assert.ok(signatures.size >= 95);
  const p = generate(s, 421),
    m = lane(p, "melody");
  const call = m
    .filter((e) => e.bar === 0)
    .map((e) => Math.round(e.beat * 10000));
  const repeat = m
    .filter((e) => e.bar === 2)
    .map((e) => Math.round((e.beat - 8) * 10000));
  assert.ok(
    call.filter((beat) => repeat.includes(beat)).length >=
      Math.min(call.length, repeat.length) - 1,
  );
  assert.equal(p.chords[8].section, "B");
  assert.equal(p.chords[12].section, "Return");
  assert.deepEqual(
    p.chords.slice(0, 3).map((c) => c.root),
    p.chords.slice(12, 15).map((c) => c.root),
  );
});
test("density reshapes every groove progressively and preserves the other lanes", () => {
  for (const l of PARTS)
    for (const groove of Object.keys(GROOVES[l])) {
      const s = settings();
      s.parts[l].groove = groove;
      const original = generate(s, 421);
      let prior = 0;
      for (const density of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const p = clone(original);
        p.settings.parts[l].density = density;
        const next = replacePart(p, l);
        assert.ok(
          lane(next, l).length >= prior,
          `${l}/${groove} density=${density}`,
        );
        prior = lane(next, l).length;
        assert.deepEqual(
          next.events.filter((e) => e.layer !== l),
          original.events.filter((e) => e.layer !== l),
        );
      }
      const low = clone(original);
      low.settings.parts[l].density = 0;
      assert.ok(prior > lane(replacePart(low, l), l).length);
    }
});
test("swing changes actual offbeat timing through its range while preserving downbeats and bar bounds", () => {
  assert.equal(swingBeat(0, 1), 0);
  assert.equal(swingBeat(1, 1), 1);
  assert.ok(Math.abs(swingBeat(0.5, 1) - 2 / 3) < 0.00001);
  assert.ok(swingBeat(0.75, 1) > 0.75);
  const p = generate(settings(), 421);
  p.settings.parts.bass.swing = 0;
  const straight = replacePart(p, "bass");
  p.settings.parts.bass.swing = 1;
  const swung = replacePart(p, "bass");
  assert.deepEqual(
    lane(straight, "bass").map((e) => e.midi),
    lane(swung, "bass").map((e) => e.midi),
  );
  assert.ok(
    lane(swung, "bass").some(
      (e, i) => e.beat > lane(straight, "bass")[i].beat + 0.1,
    ),
  );
  assert.equal(exportEvents(swung, "bass").length, lane(swung, "bass").length);
});
test("glide connects changing pitches across trap/sub phrases, with an audible duration range and safe exclusions", () => {
  const last = { midi: 24, time: 0, end: 0.9 },
    p = { glide: 1, groove: "trap" };
  assert.equal(bassTransition(last, 31, 1, 0.7, p).from, 24);
  assert.ok(
    bassTransition(last, 31, 1, 0.7, p).seconds >
      3 * bassTransition(last, 31, 1, 0.7, { ...p, glide: 0.2 }).seconds,
  );
  assert.equal(bassTransition(last, 31, 1, 0.7, { ...p, glide: 0 }), null);
  assert.equal(bassTransition(last, 24, 1, 0.7, p), null);
  assert.equal(bassTransition(last, 31, 2, 0.7, p), null);
  assert.equal(bassTransition(last, 48, 1, 0.7, p), null);
  assert.equal(bassTransition(last, 31, -1, 0.7, p), null);
});
test("legacy notes/settings stay exact on reopen and unsupported mood values cannot enter storage", () => {
  const old = { ...generate(settings(), 421), title: "Legacy" };
  delete old.settings.mood;
  assert.deepEqual(validateProject(old), old);
  assert.throws(() =>
    validateProject({ ...old, settings: { ...old.settings, mood: "invalid" } }),
  );
});

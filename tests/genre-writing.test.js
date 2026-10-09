import test from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  DEFAULT_SETTINGS,
  clone,
  STYLES,
  exportEvents,
  PARTS,
} from "../src/music-engine.js";
import { applyStylePalette, STYLE_TEMPOS } from "../src/sound-palette.js";
import { validateProject } from "../src/project-store.js";
import { bassTransition } from "../src/audio-engine.js";
const lane = (p, l) => exportEvents(p, l);

test("genre bass stays rooted, tuned in a useful register, and only declared pickups slide", () => {
  for (const style of Object.keys(STYLES))
    for (let key = 0; key < 12; key++)
      for (let seed = 0; seed < 20; seed++) {
        const s = applyStylePalette({
          ...clone(DEFAULT_SETTINGS),
          style,
          key,
          humanize: 0,
        });
        const p = generate(s, seed),
          bass = lane(p, "bass");
        assert.ok(
          bass.filter((e) => e.midi % 12 === p.chords[e.bar].root).length /
            bass.length >=
            0.7,
          style,
        );
        if (["trap", "uk_drill"].includes(style)) {
          assert.ok(bass.every((e) => e.midi % 12 === p.chords[e.bar].root));
          assert.ok(bass.every((e) => e.midi >= 28 && e.midi <= 51));
        }
        for (const e of bass.filter((e) => e.slide)) {
          assert.ok(["trap", "uk_drill"].includes(style));
          assert.equal(e.bar % 2, 1);
          assert.ok(e.beat - e.bar * 4 >= 3);
        }
        const previous = { midi: 28, time: 0, end: 1 };
        assert.equal(
          bassTransition(previous, 40, 1, 0.5, { glide: 1 }, false),
          null,
        );
      }
});
test("leads retain rests, bounded leaps and monophonic phrases even at maximum activity", () => {
  for (const style of Object.keys(STYLES))
    for (const mood of ["auto", "dreamy", "tense"])
      for (const key of [0, 6, 11])
        for (const density of [0, 0.5, 1])
          for (let seed = 0; seed < 20; seed++) {
            const s = applyStylePalette({
              ...clone(DEFAULT_SETTINGS),
              style,
              mood,
              key,
              humanize: 0,
            });
            s.parts.melody.density = density;
            const p = { ...generate(s, seed), title: "Writing check" },
              lead = lane(p, "melody");
            assert.deepEqual(validateProject(p), p);
            for (let i = 1; i < lead.length; i++) {
              assert.ok(
                Math.abs(lead[i].midi - lead[i - 1].midi) <= 7,
                `${style}/${mood}: leap`,
              );
              assert.ok(
                lead[i - 1].beat + lead[i - 1].duration <=
                  lead[i].beat + 0.00001,
                `${style}/${mood}: overlap`,
              );
            }
            assert.ok(
              lead.reduce((a, e) => a + e.duration, 0) < s.bars * 4 * 0.9,
              `${style}/${mood}: rests`,
            );
          }
});
test("styles have their own harmonic rhythm and tempo rather than a forced universal dominant", () => {
  for (const style of Object.keys(STYLES)) {
    const s = applyStylePalette({ ...clone(DEFAULT_SETTINGS), style });
    assert.equal(s.bpm, STYLE_TEMPOS[style]);
  }
  for (const style of ["trap", "cinematic", "uk_drill"]) {
    const signatures = new Set();
    for (let seed = 0; seed < 100; seed++) {
      const p = generate(
        applyStylePalette({ ...clone(DEFAULT_SETTINGS), style, complexity: 3 }),
        seed,
      );
      assert.ok(p.chords.every((c) => c.quality !== "13"));
      assert.ok(p.chords.every((c) => !c.functionNote?.startsWith("V/vi")));
      signatures.add(p.chords.at(-1).root);
    }
    assert.ok(signatures.size >= 2, `${style}: ending is not forced to V`);
  }
});
test("high density develops the two-bar phrase without arbitrary sixteenth scatter or uncontrolled bursts", () => {
  for (const style of Object.keys(STYLES))
    for (let seed = 0; seed < 30; seed++) {
      const s = applyStylePalette({
        ...clone(DEFAULT_SETTINGS),
        style,
        humanize: 0,
      });
      for (const l of PARTS) {
        s.parts[l].density = 1;
        s.parts[l].swing = 0;
      }
      const p = generate(s, seed);
      for (let bar = 0; bar < s.bars; bar++) {
        assert.ok(lane(p, "bass").filter((e) => e.bar === bar).length <= 6);
        assert.ok(lane(p, "melody").filter((e) => e.bar === bar).length <= 5);
        const hits = new Set(
          lane(p, "keys")
            .filter((e) => e.bar === bar)
            .map((e) => Math.round((e.beat - bar * 4) * 10) / 10),
        );
        assert.ok(hits.size <= 8);
      }
    }
});

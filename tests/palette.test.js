import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyStylePalette,
  STYLE_PALETTES,
  SAMPLE_BANKS,
} from "../src/sound-palette.js";
import {
  DEFAULT_SETTINGS,
  clone,
  generate,
  PARTS,
  exportEvents,
  eventsInSlice,
} from "../src/music-engine.js";
import { validateProject } from "../src/project-store.js";
test("every style palette generates harmonically linked bass/melody in all keys and survives session import", () => {
  for (const style of Object.keys(STYLE_PALETTES))
    for (let key = 0; key < 12; key++) {
      const s = applyStylePalette({ ...clone(DEFAULT_SETTINGS), style, key });
      const p = { ...generate(s, 819), title: "Palette proof" };
      assert.deepEqual(validateProject(p), p);
      for (const e of p.events.filter((e) => e.layer !== "keys"))
        assert.ok(
          p.chords[e.bar].notes.some((n) => n % 12 === e.midi % 12),
          `${style}: ${e.layer} ${e.midi}`,
        );
      const visited = [];
      for (let b = 0; b < s.bars * 4; b += 0.25)
        visited.push(...eventsInSlice(p, b));
      assert.deepEqual(visited, exportEvents(p));
    }
});
test("new palettes do not rewrite legacy settings or protected-note flags", () => {
  const s = clone(DEFAULT_SETTINGS);
  s.parts.melody.keep = true;
  const backup = clone(s);
  const next = applyStylePalette({ ...s, style: "trap" });
  assert.deepEqual(s, backup);
  assert.equal(next.parts.melody.keep, true);
  assert.equal(next.parts.bass.sound, "punch808");
  assert.equal(next.parts.melody.groove, "trap");
  assert.equal(
    validateProject({ ...generate(s, 5), title: "Legacy" }).settings.parts.bass
      .sound,
    "piano",
  );
});
test("every recorded instrument has bundled nonempty samples and an upstream provenance record", () => {
  const manifest = JSON.parse(
    readFileSync(new URL("../samples/PALETTE-MANIFEST.json", import.meta.url)),
  );
  for (const [bank, urls] of Object.entries(SAMPLE_BANKS))
    for (const path of Object.values(urls)) {
      const file = readFileSync(new URL("../" + path, import.meta.url));
      assert.ok(file.length > 1000);
      if (bank !== "piano") {
        const credit = manifest.find((c) => c.file === path);
        assert.ok(
          credit?.source.startsWith("https://raw.githubusercontent.com/"),
        );
        assert.equal(credit.license, "CC0-1.0");
      }
    }
});

test("recorded marimba maps acoustic octave rather than the upstream middle-C convention", () => {
  assert.equal(SAMPLE_BANKS.marimba.C5, "samples/mallets/C4.wav");
  assert.equal(SAMPLE_BANKS.marimba.G3, "samples/mallets/G2.wav");
});

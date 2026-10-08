import test from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  DEFAULT_SETTINGS,
  PARTS,
  GROOVES,
  clone,
  replacePart,
  eventsInSlice,
  exportEvents,
  preserveKeptParts,
} from "../src/music-engine.js";
import {
  validateProject,
  readLibrary,
  STORAGE_KEY,
} from "../src/project-store.js";
import { sessionName } from "../src/session-names.js";
import { pcmWave, zipFiles } from "../src/file-formats.js";
const project = () => ({ ...generate(DEFAULT_SETTINGS, 821), title: "Keeper" });
test("varying one part preserves other performed notes and harmonic choices exactly", () => {
  for (const layer of PARTS)
    for (const groove of Object.keys(GROOVES[layer])) {
      const p = project();
      p.settings.parts[layer].groove = groove;
      const next = replacePart(p, layer, 12345);
      assert.deepEqual(next.chords, p.chords);
      assert.deepEqual(
        next.events.filter((e) => e.layer !== layer),
        p.events.filter((e) => e.layer !== layer),
      );
      assert.deepEqual(next, replacePart(p, layer, 12345));
      assert.ok(next.events.filter((e) => e.layer === layer).length);
      for (const e of next.events) {
        assert.ok(
          e.beat >= e.bar * 4 &&
            e.beat + e.duration <= (e.bar + 1) * 4 + 0.00001,
        );
        assert.ok(e.midi >= 24 && e.midi <= 100);
      }
    }
});
test("the continuous scheduler visits every humanized event once, including exact slice boundaries", () => {
  for (const sound of ["piano", "808"])
    for (const groove of ["auto", "trap", "drill"]) {
      const p = project();
      p.settings.parts.bass = {
        ...p.settings.parts.bass,
        sound,
        groove,
        swing: 1,
      };
      const next = replacePart(p, "bass");
      const visited = [];
      for (let b = 0; b < next.settings.bars * 4; b += 0.25)
        visited.push(...eventsInSlice(next, b));
      assert.deepEqual(visited, exportEvents(next));
    }
  const p = project();
  p.events = [0, 0.2499, 0.25, 31.9999].map((beat) => ({
    layer: "keys",
    bar: Math.floor(beat / 4),
    beat,
    duration: 0.0001,
    midi: 60,
    velocity: 0.5,
  }));
  assert.equal(eventsInSlice(p, 0).length, 2);
  assert.equal(eventsInSlice(p, 0.25).length, 1);
  assert.equal(eventsInSlice(p, 31.75).length, 1);
});
test("808 bass is monophonic while explicit stem export can recover a muted part", () => {
  const p = project();
  p.settings.parts.bass.sound = "808";
  p.settings.layers.bass = false;
  p.events = [
    { layer: "bass", bar: 0, beat: 0, duration: 2, midi: 40, velocity: 0.7 },
    { layer: "bass", bar: 0, beat: 0, duration: 2, midi: 28, velocity: 0.7 },
    { layer: "bass", bar: 0, beat: 1, duration: 2, midi: 31, velocity: 0.7 },
  ];
  assert.equal(exportEvents(p).length, 0);
  const stem = exportEvents(p, "bass");
  assert.equal(stem.length, 2);
  assert.equal(stem[0].midi, 28);
  assert.equal(stem[0].duration, 1);
  assert.equal(p.events.length, 3);
});
test("kept edits survive regeneration and expanded bars are populated; harmony changes retune without losing timing", () => {
  const p = project();
  p.settings.parts.keys.keep = true;
  p.events.find((e) => e.layer === "keys").velocity = 0.123;
  const expanded = generate({ ...clone(p.settings), bars: 16 }, 945);
  expanded.chords.splice(0, 8, ...clone(p.chords));
  const next = preserveKeptParts(expanded, p);
  assert.deepEqual(
    next.events.filter((e) => e.layer === "keys" && e.bar < 8),
    p.events.filter((e) => e.layer === "keys"),
  );
  assert.ok(next.events.some((e) => e.layer === "keys" && e.bar >= 8));
  const transposed = preserveKeptParts(
    generate({ ...clone(p.settings), key: 1 }, 945),
    p,
  );
  const old = p.events.filter((e) => e.layer === "keys"),
    edited = transposed.events.filter((e) => e.layer === "keys");
  assert.deepEqual(
    edited.map(({ midi, ...e }) => e),
    old.map(({ midi, ...e }) => e),
  );
  assert.ok(
    edited.every((e) =>
      transposed.chords[e.bar].notes.some((n) => n % 12 === e.midi % 12),
    ),
  );
});
test("legacy sessions retain exact performed notes and corrupt part controls cannot enter the library", () => {
  const legacy = project();
  delete legacy.settings.parts;
  const raw = JSON.stringify({ version: 1, projects: [legacy] });
  const restored = readLibrary({ getItem: () => raw });
  assert.deepEqual(restored[0].events, legacy.events);
  assert.deepEqual(restored[0].chords, legacy.chords);
  assert.equal(restored[0].settings.parts.keys.sound, "piano");
  const bad = project();
  bad.settings.parts.bass.sound = "invalid";
  assert.throws(() => validateProject(bad), /part controls/);
  const empty = project();
  empty.events = [];
  assert.deepEqual(validateProject(empty).events, []);
});
test("session names avoid recent collisions and use explicit musical and local-time context", () => {
  const s = clone(DEFAULT_SETTINGS);
  s.parts.bass.groove = "trap";
  const recent = [];
  for (let seed = 1; seed <= 1000; seed++) {
    const name = sessionName(
      s,
      seed,
      new Date(2026, 9, 8, 3),
      "bright",
      recent,
    );
    assert.ok(!recent.includes(name));
    assert.ok(name.length <= 100);
    recent.push(name);
  }
  const differentTimes = [3, 9, 15, 20].map((h) =>
    sessionName(s, 34, new Date(2026, 9, 8, h), "bright"),
  );
  assert.equal(new Set(differentTimes).size, 4);
  assert.ok(recent.some((n) => n.includes("Afterhours")));
  assert.ok(recent.some((n) => n.includes("Voltage")));
});
test("PCM exports have a standard header, interleaved stereo and silent edges", () => {
  const bytes = pcmWave({
    numberOfChannels: 2,
    length: 1000,
    sampleRate: 48000,
    getChannelData: (i) => new Float32Array(1000).fill(i ? -0.2 : 0.3),
  });
  const v = new DataView(bytes.buffer);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "RIFF");
  assert.equal(v.getUint32(24, true), 48000);
  assert.equal(v.getUint16(22, true), 2);
  assert.equal(v.getUint32(40, true), 4000);
  assert.equal(v.getInt16(44, true), 0);
  assert.equal(v.getInt16(bytes.length - 2, true), 0);
  assert.ok(v.getInt16(44 + 500 * 4, true) > 0);
  assert.ok(v.getInt16(44 + 500 * 4 + 2, true) < 0);
});
test("ZIP produces a standard uncompressed container with every payload represented", async () => {
  const bytes = new Uint8Array(
    await zipFiles({
      "keys.mid": new Uint8Array([1, 2, 3]),
      "README.txt": "Aligned stems",
    }).arrayBuffer(),
  );
  const v = new DataView(bytes.buffer);
  assert.equal(v.getUint32(0, true), 0x04034b50);
  assert.equal(v.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(v.getUint16(bytes.length - 14, true), 2);
});

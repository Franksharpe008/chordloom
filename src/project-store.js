import {
  STYLES,
  MOODS,
  SOUNDS,
  GROOVES,
  PARTS,
  defaultParts,
  clone,
} from "./music-engine.js?v=6";
export const STORAGE_KEY = "chordloom.projects.v1";
export function validateProject(project) {
  const s = project?.settings;
  if (
    !project ||
    typeof project.title !== "string" ||
    project.title.length > 100 ||
    !s ||
    !STYLES[s.style] ||
    (s.mood !== undefined && !Object.hasOwn(MOODS, s.mood)) ||
    !Number.isInteger(s.key) ||
    s.key < 0 ||
    s.key > 11 ||
    ![4, 8, 16, 32].includes(s.bars) ||
    !Number.isFinite(s.bpm) ||
    s.bpm < 45 ||
    s.bpm > 190 ||
    ![1, 2, 3].includes(s.complexity) ||
    !["auto", "pocket", "arp", "flow", "bounce", "sustain"].includes(
      s.rhythm,
    ) ||
    !Number.isFinite(s.humanize) ||
    s.humanize < 0 ||
    s.humanize > 1 ||
    !s.layers ||
    !["keys", "bass", "melody"].every((l) => typeof s.layers[l] === "boolean")
  )
    throw new Error("This file is not a supported Chordloom session.");
  if (
    !Number.isInteger(project.seed) ||
    !Array.isArray(project.chords) ||
    project.chords.length !== s.bars ||
    !Array.isArray(project.events) ||
    project.events.length > 6000
  )
    throw new Error("Session arrangement is incomplete.");
  if (
    s.parts &&
    !PARTS.every((l) => {
      const p = s.parts[l];
      return (
        p &&
        Object.hasOwn(SOUNDS[l], p.sound) &&
        Object.hasOwn(GROOVES[l], p.groove) &&
        ["density", "swing", "glide", "volume"].every(
          (k) => Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 1,
        ) &&
        typeof p.keep === "boolean" &&
        Number.isInteger(p.seed) &&
        p.seed >= 0 &&
        p.seed <= 4294967295
      );
    })
  )
    throw new Error("Session part controls are invalid.");
  const validNote = (n) => Number.isInteger(n) && n >= 24 && n <= 100;
  if (
    !project.chords.every(
      (c) =>
        c &&
        typeof c.label === "string" &&
        c.label.length < 30 &&
        typeof c.roman === "string" &&
        c.roman.length < 20 &&
        Array.isArray(c.notes) &&
        c.notes.length >= 3 &&
        c.notes.length <= 7 &&
        c.notes.every(validNote) &&
        Number.isInteger(c.root) &&
        c.root >= 0 &&
        c.root < 12 &&
        Number.isInteger(c.offset) &&
        c.offset >= 0 &&
        c.offset < 12 &&
        typeof c.quality === "string" &&
        typeof c.locked === "boolean",
    )
  )
    throw new Error("Session chord data is invalid.");
  if (
    !project.events.every(
      (e) =>
        e &&
        (e.slide === undefined || typeof e.slide === "boolean") &&
        validNote(e.midi) &&
        ["keys", "bass", "melody"].includes(e.layer) &&
        Number.isInteger(e.bar) &&
        e.bar >= 0 &&
        e.bar < s.bars &&
        Number.isFinite(e.beat) &&
        e.beat >= e.bar * 4 &&
        e.beat < (e.bar + 1) * 4 &&
        Number.isFinite(e.duration) &&
        e.duration > 0 &&
        e.duration <= 4 &&
        Number.isFinite(e.velocity) &&
        e.velocity > 0 &&
        e.velocity <= 1,
    )
  )
    throw new Error("Session note data is invalid.");
  const valid = clone(project);
  valid.settings.parts ??= defaultParts();
  return valid;
}
export function readLibrary(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      "Saved session data could not be read. It has been preserved; export your current session as a backup.",
    );
  }
  if (
    data?.version !== 1 ||
    !Array.isArray(data.projects) ||
    data.projects.length > 100
  )
    throw new Error(
      "Saved session format is unsupported. Existing data has been preserved.",
    );
  return data.projects.map(validateProject);
}
export function saveProject(storage, project, makeCopy = false) {
  const projects = readLibrary(storage);
  const valid = validateProject(project);
  const id =
    !makeCopy && typeof project.id === "string"
      ? project.id
      : crypto.randomUUID();
  const saved = { ...valid, id, updatedAt: new Date().toISOString() };
  const index = projects.findIndex((p) => p.id === id);
  if (index >= 0) projects[index] = saved;
  else projects.unshift(saved);
  if (projects.length > 100)
    throw new Error(
      "Your library has 100 sessions. Keep a JSON backup before making room.",
    );
  // Write first; quota errors never produce a false saved indicator or overwrite corrupted data.
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects }));
  return saved;
}
export function importProject(text) {
  if (text.length > 2000000) throw new Error("Session file is too large.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Choose a valid Chordloom JSON session file.");
  }
  if (data?.version !== 1) throw new Error("Unsupported session file version.");
  const valid = validateProject(data.project);
  delete valid.id;
  return valid;
}

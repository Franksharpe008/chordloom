import {
  DEFAULT_SETTINGS,
  STYLES,
  musicalMode,
  MOODS,
  NOTE_NAMES,
  PARTS,
  SOUNDS,
  GROOVES,
  defaultParts,
  partSettings,
  clone,
  generate,
  perform,
  replacePart,
  alternatives,
  noteName,
  activeEvents,
  eventsInSlice,
  exportEvents,
  preserveKeptParts,
} from "./music-engine.js?v=6";
import {
  readLibrary,
  saveProject,
  importProject,
} from "./project-store.js?v=6";
import { createRack } from "./audio-engine.js?v=6";
import { pcmWave, zipFiles } from "./file-formats.js?v=6";
import { SAMPLE_BANKS, applyStylePalette } from "./sound-palette.js?v=6";
import { sessionName } from "./session-names.js?v=6";
const $ = (id) => document.getElementById(id);
let project = {
  ...generate(applyStylePalette(DEFAULT_SETTINGS), seed()),
  title: "",
};
let dirty = true,
  ready = false,
  loading = false,
  playing = false,
  paused = false,
  rack,
  transport,
  scheduler = null,
  selectedBar = null;
const undoStack = [],
  buffers = {},
  keyNodes = new Map();
let recentNames = [];
try {
  const names = JSON.parse(localStorage.getItem("chordloom.names.v1") || "[]");
  if (Array.isArray(names) && names.every((n) => typeof n === "string"))
    recentNames = names.slice(-500);
} catch {}
function seed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
function freshName(settings = project.settings) {
  const name = sessionName(
    settings,
    seed(),
    new Date(),
    $("name-mood").value,
    recentNames,
  );
  recentNames.push(name);
  recentNames = recentNames.slice(-500);
  try {
    localStorage.setItem("chordloom.names.v1", JSON.stringify(recentNames));
  } catch {}
  return name;
}
project.title = freshName();
function status(text, error = false) {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
}
function pushUndo() {
  undoStack.push(clone(project));
  if (undoStack.length > 30) undoStack.shift();
  $("undo").disabled = false;
}
function changed() {
  dirty = true;
  $("save-state").textContent = "Unsaved changes";
}
function loadControls() {
  for (const n of ["style", "key", "bars", "complexity", "bpm", "rhythm"])
    $(n).value = project.settings[n];
  $("mood").value = project.settings.mood ?? "auto";
  $("humanize").value = project.settings.humanize * 100;
  $("humanize-value").textContent =
    Math.round(project.settings.humanize * 100) + "%";
  document
    .querySelectorAll("[data-layer]")
    .forEach((n) => (n.checked = project.settings.layers[n.dataset.layer]));
  $("session-title").value = project.title;
}
function settingsFromControls() {
  const bpm = Number($("bpm").value);
  if (!Number.isFinite(bpm) || bpm < 45 || bpm > 190)
    throw Error("Choose a tempo from 45 to 190 BPM.");
  return {
    style: $("style").value,
    mood: $("mood").value,
    key: Number($("key").value),
    bars: Number($("bars").value),
    complexity: Number($("complexity").value),
    bpm,
    rhythm: $("rhythm").value,
    humanize: Number($("humanize").value) / 100,
    layers: Object.fromEntries(
      Array.from(document.querySelectorAll("[data-layer]")).map((n) => [
        n.dataset.layer,
        n.checked,
      ]),
    ),
    parts: clone(project.settings.parts ?? defaultParts()),
  };
}
function syncAudio() {
  if (ready) {
    transport.bpm.value = project.settings.bpm;
    transport.loopEnd = Tone.Ticks(project.settings.bars * 4 * transport.PPQ);
    if (playing) rack.sync(project.settings);
  }
}
function summary() {
  $("key-description").textContent =
    NOTE_NAMES[project.settings.key] +
    " " +
    musicalMode(project.settings) +
    " · " +
    project.settings.bars +
    " bars · " +
    activeEvents(project).length +
    " notes";
}
function render() {
  summary();
  $("chords").replaceChildren();
  project.chords.forEach((chord, index) => {
    const cell = document.createElement("div");
    cell.className = "chord-cell";
    const button = document.createElement("button");
    button.className = "chord-audition";
    button.setAttribute(
      "aria-label",
      "Bar " + (index + 1) + ": " + chord.label + ", hear and edit chord",
    );
    const num = document.createElement("span");
    num.className = "bar-number";
    num.textContent =
      String(index + 1).padStart(2, "0") +
      " · " +
      (chord.section ?? (index < project.settings.bars / 2 ? "A" : "B"));
    const name = document.createElement("strong");
    name.textContent = chord.label;
    const roman = document.createElement("span");
    roman.className = "roman";
    roman.textContent = chord.roman;
    button.append(num, name, roman);
    button.onclick = () => editChord(index);
    const lock = document.createElement("button");
    lock.className = "lock";
    lock.textContent = chord.locked ? "◆" : "◇";
    lock.setAttribute(
      "aria-label",
      (chord.locked ? "Unlock" : "Lock") + " bar " + (index + 1),
    );
    lock.setAttribute("aria-pressed", String(chord.locked));
    lock.onclick = () => {
      pushUndo();
      project.chords[index].locked = !chord.locked;
      changed();
      render();
      status(
        project.chords[index].locked
          ? "This chord stays in the next variation."
          : "This chord can change again.",
      );
    };
    cell.append(button, lock);
    $("chords").append(cell);
  });
  $("chord-editor").hidden = true;
  selectedBar = null;
  renderParts();
  renderRoll();
  updateLibrary();
  $("save-state").textContent = dirty
    ? "Unsaved changes"
    : "Saved on this device";
  if (!playing && !paused)
    $("position").textContent =
      "BAR 01 / " + String(project.settings.bars).padStart(2, "0");
  syncAudio();
  if (!$("note-editor").hidden) refreshNotes();
}
function renderRoll() {
  const svg = $("piano-roll"),
    ns = "http://www.w3.org/2000/svg";
  svg.replaceChildren();
  const bars = project.settings.bars,
    colors = { keys: "#e9b87a", bass: "#9dd3b0", melody: "#c2a4da" };
  const add = (tag, attrs) => {
    const n = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
    svg.append(n);
    return n;
  };
  for (let bar = 0; bar <= bars; bar++) {
    const x = (bar / bars) * 1000;
    add("line", {
      x1: x,
      y1: 0,
      x2: x,
      y2: 180,
      stroke: "#30342d",
      "stroke-width": 1,
    });
    if (bar < bars)
      add("text", {
        x: x + 7,
        y: 15,
        fill: "#777e6d",
        "font-size": 8,
      }).textContent = bar + 1;
  }
  project.events.forEach((e, i) => {
    const rect = add("rect", {
      x: (e.beat / (bars * 4)) * 1000,
      y: 169 - ((e.midi - 24) / 76) * 145,
      width: Math.max(1.4, (e.duration / (bars * 4)) * 1000),
      height: 4.2,
      rx: 1.5,
      fill: colors[e.layer],
      opacity: project.settings.layers[e.layer] ? 0.8 : 0.1,
      tabindex: 0,
      role: "button",
      "aria-label":
        "Edit " +
        e.layer +
        " " +
        noteName(e.midi) +
        " in bar " +
        (e.bar + 1) +
        " note " +
        (i + 1),
    });
    rect.onclick = () => openNotes(e.layer, e.bar, i);
    rect.onkeydown = (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openNotes(e.layer, e.bar, i);
      }
    };
  });
  svg.setAttribute(
    "aria-label",
    bars +
      "-bar editable piano roll: " +
      activeEvents(project).length +
      " active notes",
  );
}
function updateLibrary() {
  try {
    const list = readLibrary(localStorage);
    $("library-list").replaceChildren();
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "Your first keeper starts here. Name it, then Save.";
      $("library-list").append(p);
    }
    list
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      .forEach((saved) => {
        const b = document.createElement("button");
        b.className =
          "saved-project" + (saved.id === project.id ? " current" : "");
        const title = document.createElement("strong");
        title.textContent = saved.title;
        const meta = document.createElement("span");
        meta.textContent =
          NOTE_NAMES[saved.settings.key] +
          " · " +
          saved.settings.bpm +
          " BPM · " +
          saved.settings.bars +
          " bars";
        b.append(title, meta);
        b.setAttribute("aria-label", "Open session " + saved.title);
        b.onclick = () => {
          pushUndo();
          stop();
          project = clone(saved);
          dirty = false;
          loadControls();
          render();
          status(
            "Opened " +
              project.title +
              " with its exact saved notes and sounds.",
          );
        };
        $("library-list").append(b);
      });
  } catch (e) {
    status(e.message, true);
  }
}
const withKeeps = preserveKeptParts;
async function editChord(index) {
  selectedBar = index;
  const chord = project.chords[index];
  document
    .querySelectorAll(".chord-cell")
    .forEach((c, i) => c.classList.toggle("selected", i === index));
  $("chord-editor").hidden = false;
  $("editor-heading").textContent = "Bar " + (index + 1) + " · " + chord.label;
  $("alternatives").replaceChildren();
  alternatives(chord, project.settings).forEach((alt) => {
    const b = document.createElement("button");
    b.textContent = alt.label;
    b.title = alt.functionNote || "Alternate chord color";
    b.onclick = () => {
      pushUndo();
      const old = clone(project);
      project.chords[index] = {
        ...alt,
        locked: chord.locked,
        section: chord.section,
      };
      project.events = perform(project.chords, project.settings, project.seed);
      project = withKeeps(project, old);
      changed();
      render();
      editChord(index);
      status(
        "Chord updated. Kept parts follow its harmony; playback continues.",
      );
    };
    $("alternatives").append(b);
  });
  if (ready && !playing) {
    await Tone.start();
    rack.sync(project.settings);
    const t = Tone.now();
    chord.notes.forEach((midi) =>
      rack.trigger(
        { midi, layer: "keys", duration: 0.7, velocity: 0.5 },
        t,
        1,
        project.settings,
      ),
    );
    flash(chord.notes, 700);
  }
}
function labelledSelect(label, id, options, value) {
  const l = document.createElement("label");
  l.textContent = label;
  const s = document.createElement("select");
  s.id = id;
  s.setAttribute("aria-label", label);
  Object.entries(options).forEach(([v, text]) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = text;
    s.append(o);
  });
  s.value = value;
  l.append(s);
  return { label: l, input: s };
}
function renderParts() {
  $("part-cards").replaceChildren();
  for (const layer of PARTS) {
    const p = partSettings(project.settings, layer);
    const card = document.createElement("div");
    card.className = "part-card";
    card.style.setProperty(
      "--part-color",
      { keys: "var(--amber)", bass: "var(--mint)", melody: "var(--lav)" }[
        layer
      ],
    );
    const top = document.createElement("div");
    top.className = "part-top";
    const h = document.createElement("h3");
    h.textContent = layer[0].toUpperCase() + layer.slice(1);
    const keep = document.createElement("label");
    keep.className = "part-keep";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = p.keep;
    box.setAttribute("aria-label", "Keep " + layer + " notes");
    keep.append(box, document.createTextNode("Keep notes"));
    top.append(h, keep);
    card.append(top);
    box.onchange = () => {
      pushUndo();
      project.settings.parts[layer].keep = box.checked;
      changed();
      renderParts();
      status(
        box.checked
          ? layer +
              " notes are protected from variations. Sound and level remain adjustable."
          : layer + " notes can vary again.",
      );
    };
    const selects = document.createElement("div");
    selects.className = "part-selects";
    for (const [field, options] of [
      ["sound", SOUNDS[layer]],
      ["groove", GROOVES[layer]],
    ]) {
      const c = labelledSelect(
        layer + " " + field,
        layer + "-" + field,
        options,
        p[field],
      );
      c.input.disabled = field === "groove" && p.keep;
      c.input.onchange = () => partChange(layer, field, c.input.value);
      selects.append(c.label);
    }
    card.append(selects);
    const sliders = document.createElement("div");
    sliders.className = "part-sliders";
    for (const field of [
      "density",
      "swing",
      "volume",
      ...(layer === "bass" ? ["glide"] : []),
    ]) {
      const l = document.createElement("label");
      const text = document.createElement("span");
      text.textContent = field === "volume" ? "LEVEL" : field.toUpperCase();
      const input = document.createElement("input");
      input.type = "range";
      input.min = 0;
      input.max = 100;
      input.step = 1;
      input.value = Math.round(p[field] * 100);
      input.id = layer + "-" + field;
      input.setAttribute("aria-label", layer + " " + field);
      const glideSupported =
        layer === "bass" &&
        ["808", "sub", "punch808", "long808"].includes(p.sound);
      input.disabled =
        (p.keep && ["density", "swing"].includes(field)) ||
        (field === "glide" && !glideSupported);
      input.title =
        field === "glide"
          ? glideSupported
            ? "Slide time for intentional octave pickups; normal root changes stay straight"
            : "Choose an 808 or sub bass to use pitch glide"
          : field === "density"
            ? "Write fewer or more notes in this part"
            : field === "swing"
              ? "Move from straight eighths toward a swung triplet feel"
              : "Live part gain, also applied to WAV and MIDI exports";
      const out = document.createElement("output");
      out.textContent = input.value + "%";
      let recordedUndo = false;
      input.oninput = () => {
        if (!recordedUndo) {
          pushUndo();
          recordedUndo = true;
        }
        out.textContent = input.value + "%";
        partChange(layer, field, Number(input.value) / 100, true);
        count.textContent =
          project.events.filter((e) => e.layer === layer).length +
          " notes · " +
          (p.keep ? "protected" : "open to variations");
      };
      input.onchange = () => {
        recordedUndo = false;
      };
      l.append(text, input, out);
      sliders.append(l);
    }
    card.append(sliders);
    const actions = document.createElement("div");
    actions.className = "part-actions";
    const vary = document.createElement("button");
    vary.textContent = "↗ Vary " + layer;
    vary.id = "vary-" + layer;
    vary.disabled = p.keep;
    vary.onclick = () => {
      pushUndo();
      project = replacePart(project, layer, seed());
      changed();
      render();
      status(
        "New " +
          layer +
          " variation. Other parts and the playhead stay intact.",
      );
    };
    const edit = document.createElement("button");
    edit.textContent = "Edit notes";
    edit.setAttribute("aria-label", "Edit " + layer + " notes");
    edit.onclick = () => openNotes(layer);
    actions.append(vary, edit);
    card.append(actions);
    const count = document.createElement("div");
    count.className = "part-count";
    count.textContent =
      project.events.filter((e) => e.layer === layer).length +
      " notes · " +
      (p.keep ? "protected" : "open to variations");
    card.append(count);
    if (layer === "bass") {
      const hint = document.createElement("div");
      hint.className = "part-count";
      hint.textContent = ["808", "sub", "punch808", "long808"].includes(p.sound)
        ? "Glide shapes intentional octave pickups in trap/drill grooves. Raise density to add fills; 0% keeps them straight."
        : "Pitch glide is available on 808 and sub bass sounds.";
      card.append(hint);
    }
    $("part-cards").append(card);
  }
}
function partChange(layer, field, value, live = false) {
  if (!live) pushUndo();
  project.settings.parts ??= defaultParts();
  project.settings.parts[layer] = {
    ...partSettings(project.settings, layer),
    [field]: value,
  };
  if (["groove", "density", "swing"].includes(field))
    project = replacePart(project, layer);
  changed();
  if (live) {
    renderRoll();
    summary();
    syncAudio();
  } else render();
  status(
    layer +
      " " +
      (field === "volume" ? "level" : field) +
      " updated" +
      (live ? " · " + Math.round(value * 100) + "%" : "") +
      ". Playback continues.",
  );
}
async function activate() {
  if (loading || ready) return;
  loading = true;
  $("activate").disabled = true;
  $("activate").textContent = "Loading instruments…";
  try {
    if (!window.Tone)
      throw Error(
        "The audio library did not load. Check your connection and reload.",
      );
    const samples = Object.entries(SAMPLE_BANKS).flatMap(([bank, urls]) =>
      Object.entries(urls).map(([name, url]) => ({ bank, name, url })),
    );
    let completed = 0;
    const result = [];
    for (let i = 0; i < samples.length; i += 4)
      result.push(
        ...(await Promise.allSettled(
          samples.slice(i, i + 4).map(async ({ bank, name, url }) => {
            buffers[bank] ??= {};
            if (!buffers[bank][name])
              buffers[bank][name] = (
                await Tone.ToneAudioBuffer.fromUrl(url)
              ).get();
            completed++;
            $("sound-state").textContent =
              "Loading sounds " +
              Math.round((completed / samples.length) * 100) +
              "%";
          }),
        )),
      );
    if (result.some((r) => r.status === "rejected"))
      throw Error(
        "Some sounds could not load. Retry keeps recordings already loaded.",
      );
    // Keep the live clock separate from temporary offline rendering contexts.
    transport = Tone.Transport;
    rack = createRack(Tone, buffers);
    ready = true;
    $("sound-state").textContent = "Instruments ready";
    $("activate").hidden = true;
    $("play").disabled = false;
    $("stop").disabled = false;
    $("export-wav").disabled = false;
    keyNodes.forEach((n) => (n.disabled = false));
    rack.sync(project.settings);
    status("Sounds are ready. Press Play or a key to hear your session.");
  } catch (e) {
    $("activate").hidden = false;
    $("activate").disabled = false;
    $("activate").textContent = "Retry sounds";
    $("sound-state").textContent = "Load interrupted";
    status(e.message, true);
  } finally {
    loading = false;
  }
}
function flash(notes, duration) {
  notes.forEach((n) => keyNodes.get(n)?.classList.add("active"));
  setTimeout(
    () => notes.forEach((n) => keyNodes.get(n)?.classList.remove("active")),
    Math.min(1500, duration),
  );
}
function schedule() {
  if (scheduler !== null) return;
  transport.loop = true;
  syncAudio();
  scheduler = transport.scheduleRepeat(
    (time) => {
      const beat =
        Math.round((transport.getTicksAtTime(time) / transport.PPQ) * 4) / 4;
      const start =
        ((beat % (project.settings.bars * 4)) + project.settings.bars * 4) %
        (project.settings.bars * 4);
      const spb = 60 / transport.bpm.value;
      for (const e of eventsInSlice(project, start)) {
        const at = time + (e.beat - start) * spb;
        rack.trigger(e, at, spb, project.settings);
        Tone.Draw.schedule(() => flash([e.midi], e.duration * spb * 1000), at);
      }
    },
    "16n",
    0,
  );
}
async function togglePlay() {
  if (!ready) return;
  await Tone.start();
  if (playing) {
    transport.pause();
    rack.release();
    rack.sync({
      ...project.settings,
      layers: { keys: false, bass: false, melody: false },
    });
    playing = false;
    paused = true;
    setPlayButton("▶ Resume", "Resume session");
    return;
  }
  schedule();
  rack.sync(project.settings);
  transport.start();
  playing = true;
  paused = false;
  setPlayButton("Ⅱ Pause", "Pause session");
}
function setPlayButton(text, label) {
  $("play").textContent = text;
  $("play").setAttribute("aria-label", label);
  document.body.classList.toggle("playing", playing);
}
function stop() {
  if (ready) {
    transport.stop();
    transport.ticks = 0;
    rack.release();
    rack.sync({
      ...project.settings,
      layers: { keys: false, bass: false, melody: false },
    });
    if (scheduler !== null) transport.clear(scheduler);
  }
  scheduler = null;
  playing = false;
  paused = false;
  setPlayButton("▶ Play", "Play session");
  $("playhead").style.left = "0%";
  document
    .querySelectorAll(".chord-cell.current,.piano-key.active")
    .forEach((n) => n.classList.remove("current", "active"));
  $("position").textContent =
    "BAR 01 / " + String(project.settings.bars).padStart(2, "0");
}
function animate() {
  if (playing && ready) {
    const beat = transport.ticks / transport.PPQ;
    const bar = Math.min(project.settings.bars - 1, Math.floor(beat / 4));
    $("playhead").style.left = (beat / (project.settings.bars * 4)) * 100 + "%";
    $("position").textContent =
      "BAR " +
      String(bar + 1).padStart(2, "0") +
      " / " +
      String(project.settings.bars).padStart(2, "0");
    document
      .querySelectorAll(".chord-cell")
      .forEach((c, i) => c.classList.toggle("current", i === bar));
  }
  requestAnimationFrame(animate);
}
function buildKeyboard() {
  const whites = [0, 2, 4, 5, 7, 9, 11],
    all = [];
  for (let oct = 3; oct <= 5; oct++)
    whites.forEach((pc) => all.push(12 * (oct + 1) + pc));
  const make = (midi, black = false, left = 0) => {
    const b = document.createElement("button");
    b.className = "piano-key" + (black ? " black" : "");
    b.disabled = true;
    b.setAttribute("aria-label", "Play " + noteName(midi));
    if (black) {
      b.style.left = left + "%";
      b.style.width = (100 / 21) * 0.6 + "%";
    } else if (midi % 12 === 0) b.textContent = noteName(midi);
    const hit = async () => {
      if (ready) {
        await Tone.start();
        rack.sync(project.settings);
        rack.trigger(
          { midi, layer: "keys", duration: 0.6, velocity: 0.7 },
          Tone.now(),
          1,
          project.settings,
        );
        flash([midi], 450);
      }
    };
    b.onpointerdown = hit;
    b.onkeydown = (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        hit();
      }
    };
    $("keyboard").append(b);
    keyNodes.set(midi, b);
  };
  all.forEach((n) => make(n));
  all.forEach((n, i) => {
    if ([0, 2, 5, 7, 9].includes(n % 12))
      make(n + 1, true, ((i + 1) / 21) * 100 - (100 / 21) * 0.3);
  });
}
function openNotes(layer = "keys", bar = 0, index) {
  $("note-editor").hidden = false;
  $("note-layer").value = layer;
  $("note-bar").replaceChildren();
  for (let i = 0; i < project.settings.bars; i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = i + 1;
    $("note-bar").append(o);
  }
  $("note-bar").value = Math.min(bar, project.settings.bars - 1);
  refreshNotes(index);
  $("note-heading").textContent =
    "Edit " + layer + " · bar " + (Number($("note-bar").value) + 1);
}
function refreshNotes(index) {
  const layer = $("note-layer").value,
    bar = Math.min(Number($("note-bar").value), project.settings.bars - 1);
  if ($("note-bar").options.length !== project.settings.bars) {
    openNotes(layer, bar);
    return;
  }
  $("note-pick").replaceChildren();
  project.events.forEach((e, i) => {
    if (e.layer !== layer || e.bar !== bar) return;
    const o = document.createElement("option");
    o.value = i;
    o.textContent =
      noteName(e.midi) + " · beat " + (e.beat - bar * 4).toFixed(3);
    $("note-pick").append(o);
  });
  if (index !== undefined) $("note-pick").value = index;
  $("note-heading").textContent = "Edit " + layer + " · bar " + (bar + 1);
  $("note-harmony").textContent =
    "Chord: " +
    project.chords[bar].label +
    " · tones " +
    [...new Set(project.chords[bar].notes.map((n) => NOTE_NAMES[n % 12]))].join(
      ", ",
    );
  loadNote();
}
function loadNote() {
  const e = project.events[Number($("note-pick").value)],
    ok = $("note-pick").value !== "" && !!e;
  for (const id of [
    "note-pitch",
    "note-beat",
    "note-duration",
    "note-velocity",
    "apply-note",
    "delete-note",
  ])
    $(id).disabled = !ok;
  if (ok) {
    $("note-pitch").value = e.midi;
    $("note-beat").value = (e.beat - e.bar * 4).toFixed(4);
    $("note-duration").value = e.duration.toFixed(4);
    $("note-velocity").value = e.velocity.toFixed(3);
  }
}
for (let n = 24; n <= 100; n++) {
  const o = document.createElement("option");
  o.value = n;
  o.textContent = noteName(n);
  $("note-pitch").append(o);
}
$("note-layer").onchange = () => refreshNotes();
$("note-bar").onchange = () => refreshNotes();
$("note-pick").onchange = loadNote;
$("close-notes").onclick = () => ($("note-editor").hidden = true);
$("apply-note").onclick = () => {
  try {
    const index = Number($("note-pick").value),
      old = project.events[index];
    if (!old) throw Error("Choose a note first.");
    const beat = Number($("note-beat").value),
      duration = Number($("note-duration").value),
      velocity = Number($("note-velocity").value),
      midi = Number($("note-pitch").value);
    if (
      !Number.isFinite(beat) ||
      beat < 0 ||
      beat >= 4 ||
      !Number.isFinite(duration) ||
      duration < 0.0001 ||
      duration > 4 ||
      !Number.isFinite(velocity) ||
      velocity < 0.05 ||
      velocity > 1 ||
      !Number.isInteger(midi) ||
      midi < 24 ||
      midi > 100
    )
      throw Error(
        "Use beat 0–3.9999, length 0.0001–4, velocity 0.05–1 and a listed pitch.",
      );
    pushUndo();
    project.events[index] = {
      ...old,
      midi,
      beat: old.bar * 4 + beat,
      duration: Math.min(duration, 4 - beat),
      velocity,
    };
    project.settings.parts[old.layer].keep = true;
    changed();
    render();
    status(
      "Note updated; " +
        old.layer +
        " notes are now kept. Undo restores the previous note.",
    );
  } catch (e) {
    status(e.message, true);
  }
};
$("delete-note").onclick = () => {
  if ($("note-pick").value === "") return;
  const index = Number($("note-pick").value),
    e = project.events[index];
  pushUndo();
  project.events.splice(index, 1);
  project.settings.parts[e.layer].keep = true;
  changed();
  render();
  status("Note removed. Undo restores it; the other parts stay intact.");
};
$("add-note").onclick = () => {
  const layer = $("note-layer").value,
    bar = Number($("note-bar").value),
    chord = project.chords[bar];
  if (project.events.length >= 6000) {
    status("This session has reached its 6,000-note limit.", true);
    return;
  }
  pushUndo();
  const used = project.events.filter((e) => e.layer === layer && e.bar === bar);
  const at =
    [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 3.75].find(
      (b) => !used.some((e) => Math.abs(e.beat - bar * 4 - b) < 0.08),
    ) ?? 3.875;
  const midi =
    (layer === "bass"
      ? partSettings(project.settings, layer).sound === "piano"
        ? 36
        : 24
      : layer === "melody"
        ? 72
        : 60) + chord.root;
  project.events.push({
    bar,
    beat: bar * 4 + at,
    duration: Math.min(0.5, 4 - at),
    midi,
    velocity: 0.6,
    layer,
  });
  project.settings.parts[layer].keep = true;
  changed();
  render();
  refreshNotes(project.events.length - 1);
  status(
    "Added a chord-root note. This part is kept; Undo can remove the addition.",
  );
};
const readyExports = [];
function filename(title, extension) {
  return (
    (title
      .replace(/[^a-z0-9 _-]/gi, "")
      .trim()
      .replace(/ +/g, "-") || "chordloom-session") +
    "." +
    extension
  );
}
async function download(blob, extension, title = project.title, save = true) {
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(Error("Export could not be prepared."));
    reader.readAsDataURL(blob);
  });
  const name = filename(title, extension);
  if (["wav", "mid"].includes(extension)) {
    const file = new File([blob], name, {
      type: blob.type,
      lastModified: Date.now(),
    });
    const old = readyExports.findIndex((e) => e.file.name === name);
    if (old >= 0) readyExports.splice(old, 1);
    readyExports.push({ file, data });
    if (readyExports.length > 8) readyExports.shift();
    renderExports();
  }
  if (save) {
    const a = $("download-ready");
    a.href = data;
    a.download = name;
    a.textContent = "Download " + name;
    a.hidden = false;
    a.click();
  }
}
function renderExports() {
  $("export-tray").hidden = !readyExports.length;
  $("ready-files").replaceChildren();
  for (const { file, data } of readyExports) {
    const a = document.createElement("a");
    a.href = data;
    a.download = file.name;
    a.draggable = true;
    a.className = "export-file";
    a.textContent = "⠿ " + file.name;
    a.title = "Drag this rendered file, or click to download";
    a.addEventListener("dragstart", (event) => {
      const transfer = event.dataTransfer;
      if (!transfer) return;
      transfer.effectAllowed = "copy";
      try {
        transfer.items.add(file);
      } catch {}
      transfer.setData("DownloadURL", file.type + ":" + file.name + ":" + data);
      transfer.setData("text/uri-list", data);
      $("drag-status").textContent =
        "File prepared: " +
        file.name +
        ". If your DAW rejects a browser drop, click this file to save it and drag it from Downloads.";
    });
    $("ready-files").append(a);
  }
}
function midiBytes(snapshot, scope) {
  if (typeof Midi !== "function")
    throw Error("The MIDI library did not load. Reload and retry.");
  const midi = new Midi();
  midi.header.name = snapshot.title;
  midi.header.setTempo(snapshot.settings.bpm);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] });
  const events = exportEvents(snapshot, scope);
  for (const layer of PARTS) {
    const notes = events.filter((e) => e.layer === layer);
    const p = partSettings(snapshot.settings, layer);
    if (!notes.length || p.volume <= 0) continue;
    const track = midi.addTrack();
    track.channel = PARTS.indexOf(layer);
    track.name = "Chordloom " + layer + " · " + SOUNDS[layer][p.sound];
    track.instrument.number = {
      piano: 0,
      electric: 4,
      pad: 89,
      bell: 10,
      sub: 38,
      808: 38,
      punch808: 38,
      long808: 38,
      finger: 33,
      log: 38,
      marimba: 12,
    }[p.sound];
    notes.forEach((e) =>
      track.addNote({
        midi: e.midi,
        ticks: Math.round(e.beat * midi.header.ppq),
        durationTicks: Math.max(1, Math.round(e.duration * midi.header.ppq)),
        velocity: Math.max(0.01, e.velocity * p.volume),
      }),
    );
  }
  return midi.toArray();
}
const exportReadme =
  "Chordloom stems start at beat zero with the same BPM and length. Import WAVs on aligned DAW tracks. Session.json reopens exact editable notes, part sounds, rhythms and levels in Chordloom. MIDI carries notes, velocity and tempo; a DAW supplies its own instruments. The exact 808 sound and slides are preserved in WAV and Session settings, not portable MIDI program changes. Piano: Salamander Grand Piano, Alexander Holm, CC BY 3.0; https://creativecommons.org/licenses/by/3.0/ . Seventeen unmodified samples: https://github.com/Tonejs/audio/tree/master/salamander . Recorded bass: Karoryfer Black And Blue Basses, D. Smolken. Marimba: Versilian Community Sample Library. Recorded TR-808: Michael Fischer / TidalCycles; Atlanta punch and long slide processing by Chordloom (not proprietary producer samples). These three recording sets are CC0; see samples/ATTRIBUTION.md and samples/PALETTE-MANIFEST.json. Electric/pad/bell/sub/log sounds are synthesized in this app.\n";
async function exportMidi() {
  try {
    const snapshot = clone(project),
      scope = $("export-scope").value;
    if (!exportEvents(snapshot, scope).length)
      throw Error(
        "The chosen export has no notes. Add a note or choose another part.",
      );
    if (scope === "stems") {
      const files = Object.fromEntries(
        PARTS.map((l) => [l + ".mid", midiBytes(snapshot, l)]),
      );
      files["Session.json"] = JSON.stringify(
        { version: 1, project: snapshot },
        null,
        2,
      );
      files["README.txt"] = exportReadme;
      for (const layer of PARTS)
        await download(
          new Blob([files[layer + ".mid"]], { type: "audio/midi" }),
          "mid",
          snapshot.title + "-" + layer,
          false,
        );
      await download(zipFiles(files), "zip", snapshot.title + "-MIDI-stems");
    } else
      await download(
        new Blob([midiBytes(snapshot, scope)], { type: "audio/midi" }),
        "mid",
        snapshot.title + (scope === "mix" ? "" : "-" + scope),
      );
    status(
      "MIDI ready. Notes, levels and tempo are included; WAV captures the exact sounds and 808 slides.",
    );
  } catch (e) {
    status(e.message, true);
  }
}
async function renderAudio(snapshot, scope, tail) {
  const spb = 60 / snapshot.settings.bpm,
    events = exportEvents(snapshot, scope),
    length = snapshot.settings.bars * 4 * spb + (tail ? 1.7 : 0);
  const rendered = await Tone.Offline(
    () => {
      const offline = createRack(Tone, buffers);
      offline.sync(snapshot.settings, 0, 0, scope);
      events.forEach((e) =>
        offline.trigger(e, e.beat * spb, spb, snapshot.settings),
      );
    },
    length,
    2,
    48000,
  );
  return pcmWave(rendered);
}
async function exportWav() {
  if (!ready) return;
  const snapshot = clone(project),
    scope = $("export-scope").value,
    tail = $("export-tail").checked;
  if (!exportEvents(snapshot, scope).length) {
    status(
      "The chosen export has no notes. Add a note or choose another part.",
      true,
    );
    return;
  }
  $("export-wav").disabled = true;
  $("export-wav").textContent = "Rendering…";
  try {
    if (scope === "stems") {
      const files = {};
      for (const layer of PARTS) {
        $("export-wav").textContent = "Rendering " + layer + "…";
        files[layer + ".wav"] = await renderAudio(snapshot, layer, tail);
        await download(
          new Blob([files[layer + ".wav"]], { type: "audio/wav" }),
          "wav",
          snapshot.title + "-" + layer,
          false,
        );
      }
      files["Session.json"] = JSON.stringify(
        { version: 1, project: snapshot },
        null,
        2,
      );
      files["README.txt"] = exportReadme;
      await download(zipFiles(files), "zip", snapshot.title + "-WAV-stems");
      status(
        "Three aligned WAV stems and an editable Session backup are ready.",
      );
    } else {
      const bytes = await renderAudio(snapshot, scope, tail);
      await download(
        new Blob([bytes], { type: "audio/wav" }),
        "wav",
        snapshot.title + (scope === "mix" ? "" : "-" + scope),
      );
      status(
        (scope === "mix" ? "Mix" : scope) +
          " WAV ready: 48 kHz stereo, " +
          (tail
            ? "release tail included."
            : "exact bar length with a short edge fade."),
      );
    }
  } catch (e) {
    status("WAV render failed: " + e.message, true);
  } finally {
    $("export-wav").disabled = false;
    $("export-wav").textContent = "↓ WAV";
  }
}
$("activate").onclick = activate;
$("play").onclick = togglePlay;
$("stop").onclick = stop;
$("generate").onclick = () => {
  try {
    const s = settingsFromControls();
    pushUndo();
    const old = clone(project),
      keep =
        s.key === old.settings.key && s.style === old.settings.style
          ? old.chords
          : [];
    project = withKeeps(
      { ...generate(s, seed(), keep), title: freshName(s) },
      old,
    );
    changed();
    loadControls();
    render();
    status(
      "Fresh variation and name. Kept chords/parts stay; playback continues. Save a copy to keep both versions.",
    );
  } catch (e) {
    status(e.message, true);
  }
};
for (const name of ["style", "mood", "key", "bars", "complexity"])
  $(name).onchange = () => {
    try {
      const s =
        name === "style"
          ? applyStylePalette(settingsFromControls())
          : settingsFromControls();
      pushUndo();
      const old = clone(project),
        keep =
          s.key === old.settings.key && s.style === old.settings.style
            ? old.chords
            : [];
      project = withKeeps(
        { ...project, ...generate(s, project.seed, keep) },
        old,
      );
      if (name === "style") $("bpm").value = project.settings.bpm;
      changed();
      render();
      status(
        name === "style"
          ? "Style tempo, palette, bass pocket and melody updated together. Tempo stays editable; playback continues."
          : name === "mood"
            ? MOODS[s.mood].name +
              " · new harmony, phrasing and space. Playback continues."
            : "Harmony updated. Kept parts follow chord changes; the playhead continues.",
      );
    } catch (e) {
      status(e.message, true);
    }
  };
for (const name of ["rhythm", "humanize"])
  $(name).onchange = () => {
    try {
      pushUndo();
      const old = clone(project);
      project.settings = settingsFromControls();
      project.events = perform(project.chords, project.settings, project.seed);
      project = withKeeps(project, old);
      $("humanize-value").textContent =
        Math.round(project.settings.humanize * 100) + "%";
      changed();
      render();
      status(
        "Session feel updated; kept parts and the running playhead are preserved.",
      );
    } catch (e) {
      status(e.message, true);
    }
  };
$("humanize").oninput = () =>
  ($("humanize-value").textContent = $("humanize").value + "%");
function updateTempo() {
  const bpm = Number($("bpm").value);
  if (!Number.isFinite(bpm) || bpm < 45 || bpm > 190) return false;
  if (bpm !== project.settings.bpm) {
    pushUndo();
    project.settings.bpm = bpm;
    syncAudio();
    changed();
    status("Tempo updated for playback and exports.");
  }
  return true;
}
$("bpm").oninput = updateTempo;
$("bpm").onchange = () => {
  if (!updateTempo()) {
    $("bpm").value = project.settings.bpm;
    status("Choose a tempo from 45 to 190 BPM.", true);
  }
};
for (const node of document.querySelectorAll("[data-layer]"))
  node.onchange = () => {
    pushUndo();
    project.settings.layers[node.dataset.layer] = node.checked;
    changed();
    renderRoll();
    summary();
    if (ready) rack.sync(project.settings);
    status(
      "Part switched smoothly. The playhead keeps moving; its notes stay in the session.",
    );
  };
$("session-title").oninput = () => {
  project.title = $("session-title").value;
  changed();
};
$("rename").onclick = () => {
  pushUndo();
  project.title = freshName();
  $("session-title").value = project.title;
  changed();
  status("Fresh name from your local time, chosen mood and musical settings.");
};
function save(copy = false) {
  try {
    project.title = $("session-title").value.trim() || freshName();
    project = saveProject(localStorage, project, copy);
    dirty = false;
    loadControls();
    render();
    status(
      "Saved " +
        project.title +
        " on this device. Export Session for a portable backup.",
    );
  } catch (e) {
    status(
      e.message + " Your arrangement is still open; export a Session backup.",
      true,
    );
  }
}
$("save").onclick = () => save();
$("save-copy").onclick = () => save(true);
$("new-session").onclick = () => {
  pushUndo();
  stop();
  project = {
    ...generate(applyStylePalette(DEFAULT_SETTINGS), seed()),
    title: freshName(DEFAULT_SETTINGS),
  };
  dirty = true;
  $("note-editor").hidden = true;
  loadControls();
  render();
  status("A fresh session. Undo returns to the previous working idea.");
};
$("undo").onclick = () => {
  if (!undoStack.length) return;
  project = undoStack.pop();
  dirty = true;
  loadControls();
  render();
  $("undo").disabled = !undoStack.length;
  status("Previous working version restored. Playback stays in motion.");
};
$("close-editor").onclick = () => {
  $("chord-editor").hidden = true;
  selectedBar = null;
  document
    .querySelectorAll(".chord-cell.selected")
    .forEach((n) => n.classList.remove("selected"));
};
$("export-midi").onclick = exportMidi;
$("export-wav").onclick = exportWav;
$("export-json").onclick = () => {
  download(
    new Blob([JSON.stringify({ version: 1, project }, null, 2)], {
      type: "application/json",
    }),
    "json",
  );
  status(
    "Editable Session backup ready with all notes, sounds and part controls.",
  );
};
$("import").onclick = () => $("import-file").click();
$("import-file").onchange = async () => {
  const file = $("import-file").files[0];
  if (!file) return;
  try {
    if (file.size > 2000000) throw Error("Session file is too large.");
    const imported = importProject(await file.text());
    pushUndo();
    stop();
    project = imported;
    dirty = true;
    loadControls();
    render();
    status(
      "Session imported with exact notes and sounds. Save to keep it here.",
    );
  } catch (e) {
    status(e.message, true);
  } finally {
    $("import-file").value = "";
  }
};
window.addEventListener("storage", (e) => {
  if (e.key === "chordloom.projects.v1") updateLibrary();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && playing) {
    transport.pause();
    rack.release();
    rack.sync({
      ...project.settings,
      layers: { keys: false, bass: false, melody: false },
    });
    playing = false;
    paused = true;
    setPlayButton("▶ Resume", "Resume session");
  }
});
loadControls();
buildKeyboard();
render();
requestAnimationFrame(animate);

activate();

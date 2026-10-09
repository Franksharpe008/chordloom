import { PARTS, SOUNDS, partSettings, noteName } from "./music-engine.js?v=5";

// A glide is a connected phrase, never a detuned attack on every bass note.
export function bassTransition(previous, midi, time, duration, part) {
  if (
    !previous ||
    part.glide <= 0 ||
    time < previous.time ||
    time - previous.end >= 0.24 ||
    midi === previous.midi ||
    Math.abs(midi - previous.midi) > 12
  )
    return null;
  return {
    from: previous.midi,
    seconds: Math.min(0.34 * part.glide, duration * 0.65),
  };
}

// One factory for live playback and offline stems: no approximate export instrument.
export function createRack(Tone, buffers) {
  const nodes = [],
    voices = {},
    gains = {},
    lastBass = {};
  const own = (node) => (nodes.push(node), node);
  const limiter = own(new Tone.Limiter(-1).toDestination());
  const master = own(new Tone.Gain(0.8).connect(limiter));
  for (const layer of PARTS) {
    voices[layer] = {};
    gains[layer] = {};
    const sounds = Object.keys(SOUNDS[layer]);
    for (const sound of sounds) {
      const gain = own(new Tone.Gain(0).connect(master));
      gains[layer][sound] = gain;
      let instrument;
      if (sound === "piano")
        instrument = new Tone.Sampler({
          urls: buffers.piano,
          attack: 0,
          release: 1.2,
          volume: -12,
        });
      else if (sound === "finger") {
        const takes = [buffers.finger, buffers.finger2].map((urls) =>
          own(
            new Tone.Sampler({
              urls,
              attack: 0.003,
              release: 0.12,
              volume: -20,
            }).connect(gain),
          ),
        );
        let take = 0;
        instrument = {
          triggerAttackRelease(...args) {
            takes[take++ % 2].triggerAttackRelease(...args);
          },
          releaseAll() {
            takes.forEach((v) => v.releaseAll());
          },
          dispose() {},
        };
      } else if (sound === "marimba")
        instrument = new Tone.Sampler({
          urls: buffers.marimba,
          attack: 0.002,
          release: 0.45,
          volume: -17,
        });
      else if (sound === "punch808" || sound === "long808") {
        instrument = sampled808(Tone, buffers[sound].C2, gain);
      } else if (sound === "log")
        instrument = new Tone.FMSynth({
          harmonicity: 1,
          modulationIndex: 2.5,
          envelope: { attack: 0.003, decay: 0.2, sustain: 0.02, release: 0.08 },
          modulationEnvelope: {
            attack: 0,
            decay: 0.08,
            sustain: 0,
            release: 0.03,
          },
          volume: -16,
        });
      else if (sound === "808" || sound === "sub") {
        instrument = new Tone.Synth({
          oscillator: { type: "sine" },
          envelope: {
            attack: 0.008,
            decay: sound === "808" ? 0.38 : 0.15,
            sustain: sound === "808" ? 0.2 : 0.7,
            release: 0.18,
          },
          volume: -18,
        });
        if (sound === "808") {
          const drive = own(
            new Tone.Distortion({
              distortion: 0.08,
              wet: 0.08,
              oversample: "2x",
            }),
          );
          const filter = own(new Tone.Filter(1400, "lowpass"));
          instrument.chain(drive, filter, gain);
        }
      } else if (sound === "electric")
        instrument = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 3,
          modulationIndex: 2.2,
          envelope: { attack: 0.008, decay: 0.7, sustain: 0.15, release: 0.65 },
          modulationEnvelope: {
            attack: 0.002,
            decay: 0.4,
            sustain: 0.1,
            release: 0.4,
          },
          volume: -18,
        });
      else if (sound === "pad")
        instrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: "triangle" },
          envelope: { attack: 0.12, decay: 0.35, sustain: 0.55, release: 1.2 },
          volume: -22,
        });
      else
        instrument = new Tone.PolySynth(Tone.FMSynth, {
          harmonicity: 2,
          modulationIndex: 5,
          envelope: { attack: 0.002, decay: 0.75, sustain: 0.03, release: 0.4 },
          modulationEnvelope: {
            attack: 0.002,
            decay: 0.3,
            sustain: 0,
            release: 0.2,
          },
          volume: -14,
        });
      own(instrument);
      if (!["808", "finger", "punch808", "long808"].includes(sound))
        instrument.connect(gain);
      voices[layer][sound] = instrument;
    }
  }
  function sync(settings, time = Tone.now(), ramp = 0.035, scope = "mix") {
    for (const layer of PARTS) {
      const p = partSettings(settings, layer);
      for (const [sound, gain] of Object.entries(gains[layer])) {
        const value =
          sound === p.sound &&
          (scope === "mix" ? settings.layers[layer] : scope === layer)
            ? p.volume
            : 0;
        gain.gain.cancelScheduledValues(time);
        gain.gain.setValueAtTime(gain.gain.value, time);
        gain.gain.linearRampToValueAtTime(value, time + ramp);
      }
    }
  }
  function trigger(e, time, secondsPerBeat, settings) {
    const p = partSettings(settings, e.layer),
      voice = voices[e.layer][p.sound];
    const duration = Math.max(0.008, e.duration * secondsPerBeat);
    if (e.layer === "bass" && ["punch808", "long808"].includes(p.sound)) {
      const previous = lastBass[p.sound];
      const slide = bassTransition(previous, e.midi, time, duration, p);
      voice.play(e.midi, duration, time, e.velocity, slide);
      lastBass[p.sound] = { midi: e.midi, time, end: time + duration };
    } else if (e.layer === "bass" && (p.sound === "808" || p.sound === "sub")) {
      // Monophonic bass is cut at the next attack; glide only connects close phrases.
      const previous = lastBass[p.sound];
      voice.triggerAttackRelease(noteName(e.midi), duration, time, e.velocity);
      const target = Tone.Frequency(noteName(e.midi)).toFrequency();
      const slide = bassTransition(previous, e.midi, time, duration, p);
      if (slide) {
        voice.frequency.setValueAtTime(
          Tone.Frequency(noteName(slide.from)).toFrequency(),
          time,
        );
        voice.frequency.exponentialRampToValueAtTime(
          target,
          time + slide.seconds,
        );
      }
      // No pitch-drop on every attack: the selected note must remain in tune.
      lastBass[p.sound] = { midi: e.midi, time, end: time + duration };
    } else
      voice.triggerAttackRelease(noteName(e.midi), duration, time, e.velocity);
  }
  function release() {
    for (const lane of Object.values(voices))
      for (const v of Object.values(lane)) {
        if (v.releaseAll) v.releaseAll();
        else if (v.triggerRelease) v.triggerRelease();
      }
    for (const key of Object.keys(lastBass)) delete lastBass[key];
  }
  return {
    sync,
    trigger,
    release,
    dispose() {
      release();
      nodes.reverse().forEach((n) => n.dispose());
    },
  };
}

// Rate automation changes pitch on the recorded body; note-off gates it cleanly.
function sampled808(Tone, buffer, output) {
  const sources = new Set();
  let previous;
  return {
    play(midi, duration, time, velocity, slide) {
      if (previous && time < previous.end) previous.source.stop(time);
      const rate = 2 ** ((midi - 36) / 12);
      const source = new Tone.ToneBufferSource({
        url: buffer,
        fadeIn: 0.004,
        fadeOut: 0.04,
        curve: "linear",
        playbackRate: rate,
        onended: () => {
          sources.delete(source);
        },
      }).connect(output);
      sources.add(source);
      if (slide) {
        source.playbackRate.setValueAtTime(2 ** ((slide.from - 36) / 12), time);
        source.playbackRate.exponentialRampToValueAtTime(
          rate,
          time + slide.seconds,
        );
      }
      source.start(time, 0, duration, velocity * 0.11);
      previous = { source, end: time + duration };
    },
    releaseAll() {
      const now = Tone.now();
      for (const s of sources) s.stop(now);
      previous = undefined;
    },
    dispose() {
      for (const s of sources) s.dispose();
      sources.clear();
    },
  };
}

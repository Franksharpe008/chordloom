import { PARTS, partSettings, noteName } from "./music-engine.js";

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
    const sounds =
      layer === "bass"
        ? ["piano", "sub", "808"]
        : ["piano", "electric", "pad", "bell"];
    for (const sound of sounds) {
      const gain = own(new Tone.Gain(0).connect(master));
      gains[layer][sound] = gain;
      let instrument;
      if (sound === "piano")
        instrument = new Tone.Sampler({
          urls: buffers,
          attack: 0,
          release: 1.2,
          volume: -12,
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
          volume: -20,
        });
      own(instrument);
      if (sound !== "808") instrument.connect(gain);
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
    if (e.layer === "bass" && (p.sound === "808" || p.sound === "sub")) {
      // Monophonic bass is cut at the next attack; glide only connects close phrases.
      const previous = lastBass[p.sound];
      voice.triggerAttackRelease(noteName(e.midi), duration, time, e.velocity);
      const target = Tone.Frequency(noteName(e.midi)).toFrequency();
      if (
        p.sound === "808" &&
        previous &&
        time >= previous.time &&
        p.groove === "drill" &&
        time - previous.end < 0.08 &&
        Math.abs(e.midi - previous.midi) <= 12 &&
        p.glide > 0
      ) {
        voice.frequency.setValueAtTime(
          Tone.Frequency(noteName(previous.midi)).toFrequency(),
          time,
        );
        voice.frequency.exponentialRampToValueAtTime(
          target,
          time + Math.min(0.09, p.glide * 0.12, duration * 0.4),
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
        else v.triggerRelease();
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

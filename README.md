# Chordloom · Sampled Grand Piano Loop Studio

Generate, play, and export chord loops with **recorded acoustic grand-piano notes**.

**[Play Chordloom](https://chordloom-kappa.vercel.app)** · [Selected work](https://github.com/Franksharpe008/frank-sharpe-portfolio) · [LinkedIn](https://www.linkedin.com/in/therelentlessconnoisseur/)

## What it does

- Generates randomized chord progressions from genre rules, scales, key roots, and voicing choices.
- Plays recorded Yamaha C5 grand-piano samples through Tone.js, with pitch interpolation between 17 recordings.
- Provides a playable keyboard and synchronized timeline, with pause and stop controls.
- Exports an acoustic-grand-piano MIDI track at the chosen tempo, or renders stereo WAV using the **same recordings, gain, velocity and note duration** as live playback.

This is a **rules-based music tool**, not a trained AI music model or a full digital audio workstation. Genre presets are starting points for experimentation.

## Try it

1. Activate audio; the app waits for the piano recordings to load and offers retry if a file fails.
2. Select a style, key root, tempo and 4, 16 or 32 bars, then **Generate New**.
3. Play keys directly, pause the progression, or stop to return to its beginning.
4. Export `.MID` to edit notes in a DAW, or `.WAV` to use the rendered piano audio.

MIDI carries note information and a grand-piano program selection; the instrument used when opening it depends on your DAW. WAV contains the piano recording itself.

## Run locally

Serve this directory over HTTP, for example:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. The app uses browser Web Audio. Its Tone.js, MIDI and Tailwind libraries load from CDNs; the piano samples are bundled locally with the app.

## Audio attribution

**Salamander Grand Piano by Alexander Holm**, recorded Yamaha C5, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). The MP3 files are copied unmodified from the [Tone.js audio repository](https://github.com/Tonejs/audio/tree/master/salamander). Source notice and attribution are in `samples/piano/`. Retain the credit when redistributing samples or rendered audio. No endorsement is implied.

## Checked October 8, 2026

Browser checks covered sample loading, missing-file recovery, manual keys, generation, pause and stop. A four-bar export at 60 BPM produced a 17.7-second stereo WAV at 48 kHz with nonzero signal and no clipped samples. MIDI parsing confirmed 60 BPM, program 0, and note starts at four-beat bar boundaries. These checks do not establish music quality for every randomly generated progression or every browser/device.

AI-assisted implementation directed and reviewed by Frank D. Sharpe.

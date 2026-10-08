# Chordloom · Piano Producer Studio

Turn a piano idea into a layered performance, shape its harmony, and keep the sessions worth returning to.

**[Open the live studio](https://chordloom-kappa.vercel.app)** · [Selected work](https://github.com/Franksharpe008/frank-sharpe-portfolio) · [LinkedIn](https://www.linkedin.com/in/therelentlessconnoisseur/)

## Produce an idea

- Seven starting styles: neo-soul, lo-fi jazz, dark trap, cinematic, amapiano keys, UK drill, and island piano.
- Three harmonic levels: triads, sevenths, and richer extensions with borrowed chords and secondary-dominant turns.
- Inversions chosen to reduce movement between chords; independent keys, bass and melodic parts follow the harmony.
- Editable chord colors, locked bars, rhythm choices, human timing/velocity, tempo, and 4–32 bars.
- **Part Lab:** change the sound and groove of keys, bass or melody independently. Combine soul keys with trap/808 bass, or add cinematic melody. Adjust density, swing, level and bass glide.
- Recorded Yamaha C5 piano, two-take finger bass guitar and marimba, plus electric keys, pads, bells, sub and log drum. **Atlanta punch 808** and **Long slide 808** use processed hardware recordings with a stable C2 reference and per-note tuning. Style changes select matching sounds, pockets and motifs; you can still mix parts independently. The legacy synthesized 808 remains available for old takes.
- Part muting, sound swaps, groove changes, tempo and note edits keep the running playhead in place. New session, opening/importing a session, and Stop intentionally return to the start.
- Click a piano-roll note or **Edit notes** to change pitch, beat, duration and velocity; add or remove notes. Edits automatically enable **Keep notes**. Undo restores removals.
- **Keep notes** protects a part during variations. A changed harmony retunes protected notes to its nearest chord tone; added bars receive new material. Sound and level stay adjustable.
- Fresh session names use local time, your selected name mood, musical choices and random variation. Recent names are avoided on this device; no listening or behavior tracking is involved.
- A synchronized piano roll, playhead, chord highlighting, and playable three-octave keyboard.
- **Real Yamaha C5 piano recordings**, bundled with the site, used for playback and WAV rendering.

The arrangements are original rule-based performances inspired by common harmonic practice. This is not a trained AI music model, a song-copying service, or a browser host for desktop VST plugins.

## Keep your work

Name a session and **Save**. Reopen it from the studio library to restore the exact chords, performed notes, settings, part sounds and locks. **Save a copy** keeps a separate variation. Undo retains up to 30 working versions during the current visit.

Sessions stay in this browser/device's local storage. They do not sync to an account. Export a **Session JSON** backup before clearing browser data; import the file on another device. Failed writes and unreadable storage never report a false successful save or silently overwrite corrupt data.

## Take it into a DAW

- Choose **Active mix**, a single part, or **All stems**. A selected single part exports even when muted in the mix.
- **MIDI:** performed notes, timing, velocities, part levels, instrument hints and tempo. All stems creates a ZIP with three MIDI files, the editable Session JSON and a README. Your DAW supplies its own instruments; MIDI does not reproduce the exact sampled/synthesized instruments or slides.
- **WAV:** 48 kHz, 16-bit stereo through the same instrument rack used for playback. All stems creates aligned keys/bass/melody WAVs plus an editable Session backup. A short edge fade prevents hard export boundaries.
- Keep **Release tail** on for natural endings; switch it off for exact bar-length files suitable for aligned DAW loops. All stems share the same start and duration.
- Rendered WAV/MIDI files appear in a **Take it to your DAW** tray. Drag a file out or click it to save. The tray includes real File objects and Chromium DownloadURL data; native DAW drag acceptance varies by browser/DAW, so download and drag from Downloads remains the portable route. All-stems ZIP also exposes the three separate files in the tray. Files remain as rendered when you edit the session. Exports show a download link when a browser does not save automatically. Rendering uses a snapshot, so later changes do not alter the exported take.

## Run and check

Use a static HTTP server, for example `python3 -m http.server 8080`. Open `http://localhost:8080`. No build step is required.

`npm test` checks repeatable harmony across styles/keys/complexities, event bounds, locking, independent part preservation, continuous scheduling boundaries, monophonic bass, protected edits, legacy save/reopen, unique names, PCM/ZIP structure, portable backup, and corruption/write-failure recovery. `npm run check` checks module syntax.

Audio starts after a user gesture. Tone.js 14.8.49 and MIDI 2.0.28 load from CDNs; this is not a fully offline installation. All 35 instrument recordings preload automatically with progress; Retry appears only after failure. Press Play, a key or chord to unlock browser sound. No separate instrument-load step.

## Instrument attribution

**Salamander Grand Piano by Alexander Holm**, recorded Yamaha C5, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Seventeen unmodified MP3 recordings come from the [Tone.js audio repository](https://github.com/Tonejs/audio/tree/master/salamander). Original notice and source details are retained in `samples/piano/`. Keep this attribution when redistributing samples or rendered audio. No endorsement is implied.

Finger bass: D. Smolken / Karoryfer Black And Blue Basses. Marimba: Sam Gossner / VCSL. 808: Michael Fischer / TidalCycles recording, processed and tuned by Chordloom. These recording sources are CC0; the Atlanta-style timbre is not a proprietary producer sample. [Full provenance and licenses](samples/ATTRIBUTION.md) and a reproducible preparation script are included.

AI-assisted implementation directed and reviewed by Frank D. Sharpe.

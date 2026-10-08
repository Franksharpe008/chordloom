# Chordloom · Piano Producer Studio

Turn a piano idea into a layered performance, shape its harmony, and keep the sessions worth returning to.

**[Open the live studio](https://chordloom-kappa.vercel.app)** · [Selected work](https://github.com/Franksharpe008/frank-sharpe-portfolio) · [LinkedIn](https://www.linkedin.com/in/therelentlessconnoisseur/)

## Produce an idea

- Seven starting styles: neo-soul, lo-fi jazz, dark trap, cinematic, amapiano keys, UK drill, and island piano.
- Three harmonic levels: triads, sevenths, and richer extensions with borrowed chords and secondary-dominant turns.
- Inversions chosen to reduce movement between chords; independent keys, bass and melodic parts follow the harmony.
- Editable chord colors, locked bars, rhythm choices, human timing/velocity, layer muting, tempo, and 4–32 bars.
- A synchronized piano roll, playhead, chord highlighting, and playable three-octave keyboard.
- **Real Yamaha C5 piano recordings**, bundled with the site, used for playback and WAV rendering.

The arrangements are original rule-based performances inspired by common harmonic practice. This is not a trained AI music model, a song-copying service, or a browser host for desktop VST plugins.

## Keep your work

Name a session and **Save**. Reopen it from the studio library to restore the exact chords, performed notes, settings and locks. **Save a copy** keeps a separate variation. Undo retains up to 20 working versions during the current visit.

Sessions stay in this browser/device's local storage. They do not sync to an account. Export a **Session JSON** backup before clearing browser data; import the file on another device. Failed writes and unreadable storage never report a false successful save or silently overwrite corrupt data.

## Take it into a DAW

- **MIDI:** separate active keys/bass/melody tracks, grand-piano program, performed timing and velocities, and the chosen tempo. Your DAW supplies the instrument.
- **Piano WAV:** renders the same active event plan through the recorded grand piano, including human feel and release tail.
- Exports also expose a download link for browsers that do not save the file automatically.

## Run and check

Use a static HTTP server, for example `python3 -m http.server 8080`. Open `http://localhost:8080`. No build step is required.

`npm test` checks repeatable harmony across styles/keys/complexities, event bounds, locking, layer preservation, exact save/reopen, portable backup, and corruption/write-failure recovery. `npm run check` checks module syntax.

Audio starts after a user gesture. Tone.js 14.8.49 and MIDI 2.0.28 load from CDNs; this is not a fully offline installation. Sample loading has progress and a retry path.

## Piano attribution

**Salamander Grand Piano by Alexander Holm**, recorded Yamaha C5, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Seventeen unmodified MP3 recordings come from the [Tone.js audio repository](https://github.com/Tonejs/audio/tree/master/salamander). Original notice and source details are retained in `samples/piano/`. Keep this attribution when redistributing samples or rendered audio. No endorsement is implied.

AI-assisted implementation directed and reviewed by Frank D. Sharpe.

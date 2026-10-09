const fs = require('node:fs/promises');
const path = require('node:path');
const { packager } = require('@electron/packager');
(async () => {
  const staging = path.join(__dirname, 'staging');
  await fs.mkdir(path.join(staging, 'studio/vendor'), { recursive: true });
  for (const file of ['main.cjs', 'preload.cjs', 'export-store.cjs', 'drag-icon.png'])
    await fs.copyFile(path.join(__dirname, file), path.join(staging, file));
  await fs.writeFile(path.join(staging, 'package.json'), JSON.stringify({ name: 'chordloom-studio', version: '6.1.0', main: 'main.cjs' }));
  for (const directory of ['src', 'samples']) await fs.cp(path.join(__dirname, '..', directory), path.join(staging, 'studio', directory), { recursive: true });
  await fs.copyFile(path.join(__dirname, '../styles.css'), path.join(staging, 'studio/styles.css'));
  let html = await fs.readFile(path.join(__dirname, '../index.html'), 'utf8');
  html = html.replace('https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js', 'vendor/Tone.js')
    .replace('https://unpkg.com/@tonejs/midi@2.0.28/build/Midi.js', 'vendor/Midi.js');
  await fs.writeFile(path.join(staging, 'studio/index.html'), html);
  for (const [source, destination] of [
    ['tone/build/Tone.js', 'Tone.js'], ['tone/LICENSE.md', 'TONE-LICENSE.md'],
    ['@tonejs/midi/build/Midi.js', 'Midi.js'], ['@tonejs/midi/LICENSE.md', 'MIDI-LICENSE.md']
  ]) await fs.copyFile(path.join(__dirname, 'node_modules', source), path.join(staging, 'studio/vendor', destination));
  const apps = await packager({ dir: staging, name: 'Chordloom Studio', appBundleId: 'com.franksharpe.chordloom',
    platform: 'darwin', arch: 'arm64', electronVersion: '44.7.0', out: path.join(__dirname, 'dist'), overwrite: true,
    appCopyright: 'Frank D. Sharpe', icon: undefined });
  console.log(apps.join('\n'));
})().catch(error => { console.error(error); process.exitCode = 1; });

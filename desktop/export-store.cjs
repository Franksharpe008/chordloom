const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function payload(request) {
  if (!request || !/^[a-f0-9-]{36}$/.test(request.batchId) ||
      typeof request.title !== 'string' || request.title.length > 100 ||
      !/^[a-z0-9 _-]+\.(wav|mid|zip|json)$/i.test(request.name))
    throw Error('Invalid export request.');
  if (!(request.bytes instanceof Uint8Array)) throw Error('Invalid export bytes.');
  const ext = path.extname(request.name).toLowerCase();
  const limit = (ext === '.zip' ? 128 : 64) * 1024 * 1024;
  if (!request.bytes.length || request.bytes.length > limit) throw Error('Invalid export size.');
  const bytes = Buffer.from(request.bytes);
  const ok = ext === '.wav' ? bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WAVE'
    : ext === '.mid' ? bytes.subarray(0, 4).toString() === 'MThd'
    : ext === '.zip' ? bytes.subarray(0, 2).toString() === 'PK'
    : bytes.length <= 2e6 && JSON.parse(bytes.toString()).version === 1;
  if (!ok) throw Error('Unsupported export data.');
  if (typeof request.backup !== 'string' || request.backup.length > 2e6 ||
      JSON.parse(request.backup).version !== 1) throw Error('Invalid Session backup.');
  return bytes;
}

class ExportStore {
  constructor(root) { this.root = path.resolve(root); this.batches = new Map(); this.files = new Map(); this.written = 0; }
  async prepare(request) {
    const bytes = payload(request);
    if (this.files.size >= 120 || this.written + bytes.length > 512 * 1024 * 1024)
      throw Error('This session has reached its export limit. Existing files are saved; restart the studio to export more.');
    let directory = this.batches.get(request.batchId);
    if (!directory) {
      const title = request.title.replace(/[^a-z0-9 _-]/gi, '').trim().slice(0, 70) || 'Chordloom';
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      await fs.mkdir(this.root, { recursive: true });
      directory = await fs.mkdtemp(path.join(this.root, title + '-' + stamp + '-'));
      await fs.writeFile(path.join(directory, 'Session.json'), request.backup, { flag: 'wx' });
      await fs.writeFile(path.join(directory, 'README.txt'),
        'Chordloom rendered take. WAV files are 48 kHz stereo and start together. Set your DAW tempo to the Session.json BPM. MIDI needs a DAW instrument. Session.json keeps exact editable notes and sound choices.\n' +
        'Piano: Salamander Grand Piano by Alexander Holm, CC BY 3.0; https://creativecommons.org/licenses/by/3.0/ . Seventeen unmodified Yamaha C5 samples: https://github.com/Tonejs/audio/tree/master/salamander .\n' +
        'Recorded bass: Karoryfer Black And Blue Basses, D. Smolken. Marimba: Sam Gossner / VCSL. TR-808 recording: Michael Fischer / TidalCycles, processed and tuned by Chordloom. These three recording sets are CC0. Other sounds are synthesized in the studio. No source endorsement is implied. Full credits: https://github.com/Franksharpe008/chordloom/blob/composition-review-06/samples/ATTRIBUTION.md\n', { flag: 'wx' });
      this.batches.set(request.batchId, directory);
    }
    let name = request.name;
    let destination;
    // Exclusive creation never replaces a prior rendered take.
    for (let i = 0; i < 100; i++) {
      destination = path.join(directory, name);
      try { await fs.writeFile(destination, bytes, { flag: 'wx' }); break; }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        const ext = path.extname(request.name);
        name = path.basename(request.name, ext) + '-' + (i + 2) + ext;
        if (i === 99) throw Error('Too many exports with this name.');
      }
    }
    const id = randomUUID();
    this.files.set(id, destination);
    this.written += bytes.length;
    return { id, name, folder: path.basename(directory) };
  }
  paths(ids) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 8) throw Error('Choose prepared files.');
    return ids.map(id => { const file = this.files.get(id); if (!file) throw Error('Unknown export.'); return file; });
  }
}
module.exports = { ExportStore, payload };

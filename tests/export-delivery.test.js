import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { writeExportFolder } from '../src/export-folder.js';
import { pcmWave } from '../src/file-formats.js';
const { ExportStore } = createRequire(import.meta.url)('../desktop/export-store.cjs');
const wav = () => pcmWave({ length: 480, sampleRate: 48000, numberOfChannels: 2,
  getChannelData: () => new Float32Array(480).fill(.1) });
const backup = JSON.stringify({ version: 1, project: { title: 'Fictional take' } });

test('native exports are real unchanged files; stems share a folder and names never overwrite', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'chordloom-delivery-'));
  try {
    const store = new ExportStore(root);
    const request = { batchId: randomUUID(), title: 'Fictional take', name: 'bass.wav', bytes: wav(), backup };
    const bass = await store.prepare(request);
    const keys = await store.prepare({ ...request, name: 'keys.wav' });
    const duplicate = await store.prepare(request);
    const later = await store.prepare({ ...request, batchId: randomUUID() });
    const [a,b,c,d] = store.paths([bass.id,keys.id,duplicate.id,later.id]);
    assert.equal(path.dirname(a),path.dirname(b));
    assert.notEqual(a,c); assert.notEqual(path.dirname(a),path.dirname(d));
    assert.deepEqual(await fs.readFile(a), Buffer.from(request.bytes));
    assert.deepEqual(await fs.readFile(c), Buffer.from(request.bytes));
    assert.equal(await fs.readFile(path.join(path.dirname(a),'Session.json'),'utf8'),backup);
    assert.throws(() => store.paths(['/etc/passwd']));
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test('native bridge rejects traversal, arbitrary files, malformed headers and oversized data before writing', async () => {
  const root = path.join(os.tmpdir(),'chordloom-reject-'+randomUUID());
  const store = new ExportStore(root);
  const base = { batchId: randomUUID(), title: 'Test', name: 'take.wav', bytes: wav(), backup };
  for (const change of [{name:'../take.wav'}, {name:'take.exe'}, {batchId:'../../escape'},
    {bytes:new Uint8Array([1,2,3])}, {bytes:'not bytes'}, {backup:'no json'}, {bytes:new Uint8Array(64*1024*1024+1)}])
    await assert.rejects(store.prepare({...base,...change}));
  await assert.rejects(fs.access(root));
});

test('browser folder delivery saves separate takes with audio and editable backup', async () => {
  const takes = new Map();
  const directory = { getDirectoryHandle: async name => {
    assert.ok(!takes.has(name)); const files = new Map(); takes.set(name,files);
    return { getFileHandle: async filename => ({ createWritable: async () => ({
      write: async file => files.set(filename,Buffer.from(await file.arrayBuffer())), close:async()=>{},abort:async()=>{}
    }) }) };
  } };
  const file = new File([wav()], 'take.wav', {type:'audio/wav'});
  const first = await writeExportFolder(directory,[{file}],'Test',backup,'Credits');
  const second = await writeExportFolder(directory,[{file}],'Test',backup,'Credits');
  assert.notEqual(first.name,second.name);
  for (const files of takes.values()) {
    assert.deepEqual(files.get('take.wav'),Buffer.from(await file.arrayBuffer()));
    assert.equal(files.get('Session.json').toString(),backup);
    assert.equal(files.get('README.txt').toString(),'Credits');
  }
});

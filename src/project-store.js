import { STYLES, clone } from './music-engine.js';
export const STORAGE_KEY = 'chordloom.projects.v1';
export function validateProject(project) {
  const s = project?.settings;
  if (!project || typeof project.title !== 'string' || project.title.length > 100 || !s || !STYLES[s.style] || !Number.isInteger(s.key) || s.key<0 || s.key>11 || ![4,8,16,32].includes(s.bars) || !Number.isFinite(s.bpm) || s.bpm<45 || s.bpm>190 || ![1,2,3].includes(s.complexity) || !['auto','pocket','arp','flow','bounce','sustain'].includes(s.rhythm) || !Number.isFinite(s.humanize) || s.humanize<0 || s.humanize>1 || !s.layers || !['keys','bass','melody'].every(l=>typeof s.layers[l]==='boolean')) throw new Error('This file is not a supported Chordloom session.');
  if (!Number.isInteger(project.seed) || !Array.isArray(project.chords) || project.chords.length!==s.bars || !Array.isArray(project.events) || project.events.length>6000 || project.events.length<1) throw new Error('Session arrangement is incomplete.');
  const validNote = n => Number.isInteger(n) && n>=24 && n<=100;
  if (!project.chords.every(c=>c && typeof c.label==='string' && c.label.length<30 && typeof c.roman==='string' && c.roman.length<20 && Array.isArray(c.notes) && c.notes.length>=3 && c.notes.length<=7 && c.notes.every(validNote) && Number.isInteger(c.root) && c.root>=0 && c.root<12 && Number.isInteger(c.offset) && c.offset>=0 && c.offset<12 && typeof c.quality==='string' && typeof c.locked==='boolean')) throw new Error('Session chord data is invalid.');
  if (!project.events.every(e=>e && validNote(e.midi) && ['keys','bass','melody'].includes(e.layer) && Number.isInteger(e.bar) && e.bar>=0 && e.bar<s.bars && Number.isFinite(e.beat) && e.beat>=e.bar*4 && e.beat<(e.bar+1)*4 && Number.isFinite(e.duration) && e.duration>0 && e.duration<=4 && Number.isFinite(e.velocity) && e.velocity>0 && e.velocity<=1)) throw new Error('Session note data is invalid.');
  return clone(project);
}
export function readLibrary(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Saved session data could not be read. It has been preserved; export your current session as a backup.'); }
  if (data?.version!==1 || !Array.isArray(data.projects) || data.projects.length>100) throw new Error('Saved session format is unsupported. Existing data has been preserved.');
  data.projects.forEach(validateProject);
  return data.projects;
}
export function saveProject(storage, project, makeCopy=false) {
  const projects = readLibrary(storage);
  const valid = validateProject(project);
  const id = !makeCopy && typeof project.id==='string' ? project.id : crypto.randomUUID();
  const saved = { ...valid, id, updatedAt: new Date().toISOString() };
  const index = projects.findIndex(p=>p.id===id);
  if (index>=0) projects[index]=saved; else projects.unshift(saved);
  if (projects.length>100) throw new Error('Your library has 100 sessions. Keep a JSON backup before making room.');
  // Write first; quota errors never produce a false saved indicator or overwrite corrupted data.
  storage.setItem(STORAGE_KEY,JSON.stringify({version:1,projects}));
  return saved;
}
export function importProject(text) {
  if (text.length>2000000) throw new Error('Session file is too large.');
  let data; try { data=JSON.parse(text); } catch { throw new Error('Choose a valid Chordloom JSON session file.'); }
  if (data?.version!==1) throw new Error('Unsupported session file version.');
  const valid=validateProject(data.project);
  delete valid.id;
  return valid;
}

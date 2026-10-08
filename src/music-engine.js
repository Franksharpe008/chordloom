export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const STYLES = {
  neo_soul: { name: 'Neo-soul', mode: 'major', rhythm: 'pocket', patterns: [[2, 7, 0, 9], [5, 7, 4, 9]], qualities: ['m', 'dom', 'maj', 'm'], swing: 0.18 },
  lofi: { name: 'Lo-fi jazz', mode: 'major', rhythm: 'pocket', patterns: [[0, 9, 5, 7], [2, 7, 0, 5]], qualities: ['maj', 'm', 'maj', 'dom'], swing: 0.25 },
  trap: { name: 'Dark trap', mode: 'minor', rhythm: 'arp', patterns: [[0, 8, 5, 7], [0, 3, 8, 7]], qualities: ['m', 'maj', 'm', 'dom'], swing: 0.03 },
  cinematic: { name: 'Cinematic', mode: 'minor', rhythm: 'flow', patterns: [[0, 8, 3, 7], [0, 5, 8, 7]], qualities: ['m', 'maj', 'maj', 'dom'], swing: 0 },
  amapiano: { name: 'Amapiano keys', mode: 'major', rhythm: 'bounce', patterns: [[0, 5, 9, 7], [5, 0, 2, 7]], qualities: ['maj', 'maj', 'm', 'dom'], swing: 0.16 },
  uk_drill: { name: 'UK drill', mode: 'minor', rhythm: 'arp', patterns: [[0, 1, 8, 7], [0, 5, 1, 7]], qualities: ['m', 'maj', 'maj', 'dom'], swing: 0.05 },
  hawaiian: { name: 'Island piano', mode: 'major', rhythm: 'bounce', patterns: [[0, 9, 5, 7], [0, 5, 7, 0]], qualities: ['maj', 'm', 'maj', 'dom'], swing: 0.08 },
};
const QUALITIES = {
  maj: [0, 4, 7], m: [0, 3, 7], dom: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10],
  maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14], '9': [0, 4, 7, 10, 14],
  '13': [0, 4, 10, 14, 21], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
  sus2: [0, 2, 7], sus4: [0, 5, 7], m7b5: [0, 3, 6, 10],
};
export const DEFAULT_SETTINGS = { style: 'neo_soul', key: 0, bars: 8, bpm: 92, complexity: 2, rhythm: 'auto', humanize: 0.45, layers: { keys: true, bass: true, melody: true } };
export const clone = value => JSON.parse(JSON.stringify(value));
export const noteName = midi => NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
export function random(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = Math.imul(value ^ value >>> 15, 1 | value); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function quality(kind, complexity) {
  if (complexity === 1) return kind === 'dom' ? 'maj' : kind;
  if (complexity === 2) return kind === 'maj' ? 'maj7' : kind === 'm' ? 'm7' : '7';
  return kind === 'maj' ? 'maj9' : kind === 'm' ? 'm9' : '13';
}
function smoothVoicing(root, intervals, previous = []) {
  const basic = intervals.map(i => 48 + root + i);
  const candidates = [];
  for (let inversion = 0; inversion < basic.length; inversion++) {
    const rotated = [...basic.slice(inversion), ...basic.slice(0, inversion).map(n => n + 12)].sort((a,b) => a-b);
    for (const shift of [-12, 0, 12]) {
      const notes = rotated.map(n => n + shift);
      if (notes[0] >= 48 && notes.at(-1) <= 86) candidates.push(notes);
    }
  }
  const cost = notes => {
    const mean = notes.reduce((a,b) => a+b) / notes.length;
    return Math.abs(mean - 65) * 0.4 + (previous.length ? notes.reduce((sum, n, i) => sum + Math.abs(n - previous[Math.round(i * (previous.length-1) / Math.max(1, notes.length-1))]), 0) : 0);
  };
  return candidates.sort((a,b) => cost(a)-cost(b))[0] ?? basic;
}
function roman(offset, kind) {
  const major = { 0:'I', 1:'bII', 2:'II', 3:'bIII', 4:'III', 5:'IV', 7:'V', 8:'bVI', 9:'VI', 10:'bVII', 11:'VII' };
  const numeral = major[offset] ?? '?';
  return (kind.startsWith('m') && !kind.startsWith('maj')) ? numeral.toLowerCase() : numeral;
}
export function makeChord(offset, kind, settings, previous, extra = {}) {
  const root = (settings.key + offset) % 12;
  const suffix = kind === 'maj' ? '' : kind === 'madd9' ? 'm(add9)' : kind === 'add9' ? '(add9)' : kind;
  return { root, offset, quality: kind, label: NOTE_NAMES[root] + suffix, roman: roman(offset, kind), notes: smoothVoicing(root, QUALITIES[kind], previous), locked: false, ...extra };
}
export function generate(settings, seed, previous = []) {
  const rng = random(seed), style = STYLES[settings.style];
  const pattern = style.patterns[Math.floor(rng() * style.patterns.length)];
  const chords = [];
  // Quality follows harmonic function, including alternate patterns, rather than a fixed third on every root.
  const majorKinds = { 0:'maj', 2:'m', 4:'m', 5:'maj', 7:'dom', 9:'m', 1:'maj', 8:'maj' };
  const minorKinds = { 0:'m', 1:'maj', 3:'maj', 5:'m', 7:'dom', 8:'maj' };
  for (let bar = 0; bar < settings.bars; bar++) {
    if (previous[bar]?.locked) { chords.push(clone(previous[bar])); continue; }
    let offset = pattern[bar % 4];
    let kind = quality((style.mode === 'major' ? majorKinds : minorKinds)[offset] ?? 'maj', settings.complexity);
    let functionNote = '';
    if (settings.complexity === 3 && bar % 8 === 6 && style.mode === 'major') {
      offset = 5; kind = 'm9'; functionNote = 'Borrowed iv · a darker turn';
    }
    if (settings.complexity === 3 && bar % 8 === 4 && style.mode === 'major') {
      offset = 4; kind = '7'; functionNote = 'V/vi · leads into the relative minor';
    }
    if (settings.complexity === 3 && bar % 8 === 5 && style.mode === 'major') { offset = 9; kind = 'm9'; functionNote = 'Relative minor · resolves the secondary dominant'; }
    if (bar === settings.bars-1 && settings.bars > 4) { offset = 7; kind = quality('dom', settings.complexity); functionNote = 'Dominant turnaround · resolves on repeat'; }
    chords.push(makeChord(offset, kind, settings, chords.at(-1)?.notes, { functionNote, ...(functionNote.startsWith('V/vi') ? {roman:'V/vi'} : {}), section: bar < settings.bars / 2 ? 'A' : 'B' }));
  }
  return { seed: seed >>> 0, settings: clone(settings), chords, events: perform(chords, settings, seed) };
}
export function alternatives(chord, settings) {
  const style = STYLES[settings.style];
  const kind = (chord.quality.startsWith('m') && !chord.quality.startsWith('maj')) ? 'm' : chord.offset === 7 ? 'dom' : 'maj';
  const colors = kind === 'm' ? ['m', 'm7', 'm9', 'madd9'] : kind === 'dom' ? ['7', '9', '13', 'sus4'] : ['maj', 'maj7', 'maj9', 'add9'];
  const same = colors.map(q => makeChord(chord.offset, q, settings, chord.notes));
  const substitution = style.mode === 'major' ? makeChord(5, 'm9', settings, chord.notes, {functionNote:'Borrowed iv'}) : makeChord(7, '7', settings, chord.notes, {functionNote:'Dominant turnaround'});
  return [...same, substitution];
}
export function perform(chords, settings, seed) {
  const rng = random(seed ^ 0x5EED), events = [], style = STYLES[settings.style];
  const rhythm = settings.rhythm === 'auto' ? style.rhythm : settings.rhythm;
  const motif = [0, 2, 1, 3, 2, 1, 0, 2].slice(Math.floor(rng()*3));
  let lastMelody = 76;
  function add(bar, beat, duration, midi, velocity, layer) {
    const offbeat = Math.abs(beat % 1 - 0.5) < 0.01;
    const drift = (rng()-0.5) * 0.05 * settings.humanize;
    const local = Math.max(0, Math.min(3.95, beat + (offbeat ? style.swing * settings.humanize : 0) + drift));
    events.push({ bar, beat: Math.round((bar*4+local)*10000)/10000, duration: Math.floor(Math.min(duration,4-(Math.round(local*10000)/10000))*10000)/10000, midi, velocity: Math.max(0.12,Math.min(0.85,velocity+(rng()-0.5)*0.16*settings.humanize)), layer });
  }
  chords.forEach((chord, bar) => {
    const notes = chord.notes;
    const color = settings.complexity;
    if (rhythm === 'arp' || rhythm === 'flow') {
      const pulses = color === 1 ? 4 : 8;
      for (let p=0;p<pulses;p++) add(bar,p*4/pulses,rhythm==='flow'?1.7:0.75,notes[(p+(bar%2))%notes.length],0.65,'keys');
    } else {
      const positions = rhythm === 'sustain' ? [0] : rhythm === 'bounce' ? [0.5,1.5,2.5,3.5] : color === 1 ? [0] : color === 2 ? [0,2.5] : [0,1.5,2.75,3.5];
      positions.forEach((beat,i) => notes.forEach((midi,j) => add(bar,beat+j*0.012, rhythm==='sustain'?3.5:rhythm==='bounce'?0.38:i===0?1.5:0.6,midi,0.48,'keys')));
    }
    const bass = 36+chord.root;
    add(bar,0,1.5,bass,0.67,'bass');
    if (color>1) add(bar,2.5,0.7,bar%2 ? bass+7 : bass,0.56,'bass');
    if (color>2) add(bar,3.5,0.35,36+chords[(bar+1)%chords.length].root,0.43,'bass');
    const positions = color === 1 ? [1.5,3] : color === 2 ? [0.75,1.5,3] : [0.5,1.25,2,2.75,3.5];
    positions.forEach((beat,i) => {
      const pc = notes[motif[(bar+i)%motif.length]%notes.length] % 12;
      const choices = [60+pc,72+pc,84+pc].filter(n=>n>=70&&n<=91);
      const midi = choices.sort((a,b)=>Math.abs(a-lastMelody)-Math.abs(b-lastMelody))[0] ?? 72+pc;
      lastMelody = midi;
      add(bar,beat,i===positions.length-1?0.85:0.4,midi,0.44,'melody');
    });
  });
  return events.sort((a,b)=>a.beat-b.beat || a.midi-b.midi);
}
export const activeEvents = project => project.events.filter(e => project.settings.layers[e.layer]);

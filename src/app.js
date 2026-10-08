import { DEFAULT_SETTINGS, STYLES, NOTE_NAMES, clone, generate, perform, alternatives, noteName, activeEvents } from './music-engine.js';
import { readLibrary, saveProject, importProject } from './project-store.js';
const $ = id => document.getElementById(id);
let project = { ...generate(DEFAULT_SETTINGS, seed()), title: 'Midnight on the keys' };
let dirty = true, ready = false, loading = false, playing = false, paused = false, piano, part, selectedBar = null;
const undoStack = [], buffers = {}, keyNodes = new Map();
const SAMPLE_URLS = Object.fromEntries([2,3,4,5].flatMap(o=>['C','D#','F#','A'].map(n=>[n+o,`samples/piano/${n.replace('#','s')}${o}.mp3`])).concat([['C6','samples/piano/C6.mp3']]));
function seed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
function status(text, error=false) { $('status').textContent=text; $('status').classList.toggle('error',error); }
function pushUndo() { undoStack.push(clone(project)); if(undoStack.length>20) undoStack.shift(); $('undo').disabled=false; }
function changed() { dirty=true; $('save-state').textContent='Unsaved changes'; }
function loadControls() {
  for(const name of ['style','key','bars','complexity','bpm','rhythm']) $(name).value=project.settings[name];
  $('humanize').value=project.settings.humanize*100; $('humanize-value').textContent=Math.round(project.settings.humanize*100)+'%';
  document.querySelectorAll('[data-layer]').forEach(node=>node.checked=project.settings.layers[node.dataset.layer]);
  $('session-title').value=project.title;
}
function settingsFromControls() {
  const bpm=Number($('bpm').value);
  if(!Number.isFinite(bpm)||bpm<45||bpm>190) throw new Error('Choose a tempo from 45 to 190 BPM.');
  return {style:$('style').value,key:Number($('key').value),bars:Number($('bars').value),complexity:Number($('complexity').value),bpm,rhythm:$('rhythm').value,humanize:Number($('humanize').value)/100,layers:Object.fromEntries(Array.from(document.querySelectorAll('[data-layer]')).map(node=>[node.dataset.layer,node.checked]))};
}
function render() {
  const s=project.settings;
  $('key-description').textContent=`${NOTE_NAMES[s.key]} ${STYLES[s.style].mode} · ${s.bars} bars · ${activeEvents(project).length} notes`;
  $('position').textContent=`BAR 01 / ${String(s.bars).padStart(2,'0')}`;
  $('chords').replaceChildren();
  project.chords.forEach((chord,index)=>{
    const cell=document.createElement('div'); cell.className='chord-cell'; cell.dataset.bar=index;
    const button=document.createElement('button'); button.className='chord-audition'; button.setAttribute('aria-label',`Bar ${index+1}: ${chord.label}, hear and edit chord`);
    const number=document.createElement('span');number.className='bar-number';number.textContent=`${String(index+1).padStart(2,'0')} · ${chord.section ?? (index<s.bars/2?'A':'B')}`;
    const name=document.createElement('strong');name.textContent=chord.label;
    const numeral=document.createElement('span');numeral.className='roman';numeral.textContent=chord.roman;
    button.append(number,name,numeral); button.onclick=()=>editChord(index);
    const lock=document.createElement('button');lock.className='lock';lock.textContent=chord.locked?'◆':'◇';lock.setAttribute('aria-label',`${chord.locked?'Unlock':'Lock'} bar ${index+1}`);lock.setAttribute('aria-pressed',String(chord.locked));
    lock.onclick=()=>{pushUndo();project.chords[index].locked=!chord.locked;changed();render();status(chord.locked?`Bar ${index+1} stays in the next variation.`:`Bar ${index+1} can change again.`);};
    cell.append(button,lock);$('chords').append(cell);
  });
  selectedBar=null;$('chord-editor').hidden=true;
  renderRoll();updateLibrary();$('save-state').textContent=dirty?'Unsaved changes':'Saved on this device';
}
function renderRoll() {
  const svg=$('piano-roll'), ns='http://www.w3.org/2000/svg';svg.replaceChildren();
  const bars=project.settings.bars, colors={keys:'#e9b87a',bass:'#9dd3b0',melody:'#c2a4da'};
  const add=(tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([key,value])=>e.setAttribute(key,String(value)));svg.append(e);return e;};
  for(let bar=0;bar<=bars;bar++) {const x=bar/bars*1000;add('line',{x1:x,y1:0,x2:x,y2:180,stroke:'#30342d','stroke-width':1}); if(bar<bars){const t=add('text',{x:x+7,y:15,fill:'#777e6d','font-size':8});t.textContent=bar+1;}}
  for(const e of project.events){const visible=project.settings.layers[e.layer];add('rect',{x:e.beat/(bars*4)*1000,y:170-(e.midi-30)/64*140,width:Math.max(1.4,e.duration/(bars*4)*1000),height:3.5,rx:1.5,fill:colors[e.layer],opacity:visible?0.8:0.09});}
  svg.setAttribute('aria-label',`${bars}-bar piano roll: ${activeEvents(project).length} active notes across keys, bass and melody`);
}
function updateLibrary() {
  try {
    const library=readLibrary(localStorage);$('library-list').replaceChildren();
    if(!library.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Your first keeper starts here. Name it, then Save.';$('library-list').append(empty);}
    library.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).forEach(saved=>{
      const button=document.createElement('button');button.className='saved-project'+(saved.id===project.id?' current':'');
      const title=document.createElement('strong');title.textContent=saved.title;
      const meta=document.createElement('span');meta.textContent=`${NOTE_NAMES[saved.settings.key]} · ${saved.settings.bpm} BPM · ${saved.settings.bars} bars`;
      button.append(title,meta);button.setAttribute('aria-label',`Open session ${saved.title}`);
      button.onclick=()=>{pushUndo();stop();project=clone(saved);dirty=false;loadControls();render();status(`Opened ${project.title} with its exact saved notes. Undo restores the previous working session.`);};
      $('library-list').append(button);
    });
  } catch(error) { status(error.message,true); }
}
function editChord(index) {
  selectedBar=index;const chord=project.chords[index];
  document.querySelectorAll('.chord-cell').forEach((c,i)=>c.classList.toggle('selected',i===index));
  $('chord-editor').hidden=false;$('editor-heading').textContent=`Bar ${index+1} · ${chord.label}`;
  $('alternatives').replaceChildren();
  alternatives(chord,project.settings).forEach(alt=>{
    const button=document.createElement('button');button.textContent=alt.label;button.title=alt.functionNote||'Alternate chord color';
    button.onclick=()=>{pushUndo();stop();project.chords[index]={...alt,locked:chord.locked,section:chord.section};project.events=perform(project.chords,project.settings,project.seed);changed();render();editChord(index);status(alt.functionNote||`Bar ${index+1} changed to ${alt.label}. Bass and melody follow the new harmony.`);};
    $('alternatives').append(button);
  });
  if(ready){Tone.start().then(()=>{piano.triggerAttackRelease(chord.notes.map(noteName),0.85,Tone.now(),0.5);flash(chord.notes,850);});}
  else status('Load the grand piano to audition this chord. You can still edit and save now.');
}
function createPiano() {
  const limiter=new Tone.Limiter(-1).toDestination();
  return new Tone.Sampler({urls:buffers,attack:0,release:1.2,volume:-10}).connect(limiter);
}
async function activate() {
  if(loading||ready) return;
  loading=true;$('activate').disabled=true;$('activate').textContent='Loading piano…';
  try {
    if(!window.Tone) throw new Error('The audio library did not load. Check your connection and reload.');
    await Tone.start(); if(Tone.context.state!=='running') await Tone.context.resume();
    const loaded=[], samples=Object.entries(SAMPLE_URLS);
    for(let start=0;start<samples.length;start+=3){
      loaded.push(...await Promise.allSettled(samples.slice(start,start+3).map(async([name,url])=>{
        if(!buffers[name]) buffers[name]=(await Tone.ToneAudioBuffer.fromUrl(url)).get();
        $('sound-state').textContent=`Piano ${Object.keys(buffers).length}/17`;
      })));
    }
    const failed=loaded.find(r=>r.status==='rejected');if(failed) throw new Error('Some piano recordings could not load. Check your connection and retry; downloaded notes are kept.');
    piano=createPiano();ready=true;$('sound-state').textContent='Yamaha grand · ready';$('activate').textContent='Piano ready';$('activate').hidden=true;
    $('play').disabled=false;$('stop').disabled=false;$('export-wav').disabled=false;
    keyNodes.forEach(node=>node.disabled=false);status('Recorded grand piano is ready. Play your session or try the keys.');
  } catch(error) {$('activate').disabled=false;$('activate').textContent='Retry piano load';$('sound-state').textContent='Load interrupted';status(error.message||'The piano could not load. Check your connection and retry.',true);}
  finally{loading=false;}
}
function flash(notes,duration) {
  notes.forEach(n=>keyNodes.get(n)?.classList.add('active'));
  setTimeout(()=>notes.forEach(n=>keyNodes.get(n)?.classList.remove('active')),Math.min(1500,duration));
}
function schedule() {
  if(part) part.dispose();
  Tone.Transport.bpm.value=project.settings.bpm;
  const ppq=Tone.Transport.PPQ;
  part=new Tone.Part((time,e)=>{
    const duration=e.duration*60/Tone.Transport.bpm.value;
    piano.triggerAttackRelease(noteName(e.midi),duration,time,e.velocity);
    Tone.Draw.schedule(()=>flash([e.midi],duration*1000),time);
  },activeEvents(project).map(e=>[Tone.Ticks(Math.round(e.beat*ppq)),e]));
  part.loop=true;part.loopEnd=Tone.Ticks(project.settings.bars*4*ppq);part.start(0);
  Tone.Transport.loop=true;Tone.Transport.loopStart=0;Tone.Transport.loopEnd=Tone.Ticks(project.settings.bars*4*ppq);
}
async function togglePlay() {
  if(!ready) return;
  await Tone.start();
  if(playing){Tone.Transport.pause();piano.releaseAll();playing=false;paused=true;$('play').textContent='▶ Resume';$('play').setAttribute('aria-label','Resume session');document.body.classList.remove('playing');return;}
  if(!part||!paused) schedule();
  Tone.Transport.start();playing=true;paused=false;$('play').textContent='Ⅱ Pause';$('play').setAttribute('aria-label','Pause session');document.body.classList.add('playing');
}
function stop() {
  if(window.Tone&&ready){Tone.Transport.stop();Tone.Transport.ticks=0;piano.releaseAll();}
  if(part){part.dispose();part=null;}
  playing=false;paused=false;document.body.classList.remove('playing');$('play').textContent='▶ Play';$('play').setAttribute('aria-label','Play session');$('playhead').style.left='0%';
  document.querySelectorAll('.chord-cell.current,.piano-key.active').forEach(n=>n.classList.remove('current','active'));
  $('position').textContent=`BAR 01 / ${String(project.settings.bars).padStart(2,'0')}`;
}
function animate() {
  if(playing&&ready){const beat=Tone.Transport.ticks/Tone.Transport.PPQ;const bar=Math.min(project.settings.bars-1,Math.floor(beat/4));$('playhead').style.left=beat/(project.settings.bars*4)*100+'%';$('position').textContent=`BAR ${String(bar+1).padStart(2,'0')} / ${String(project.settings.bars).padStart(2,'0')}`;document.querySelectorAll('.chord-cell').forEach((c,i)=>c.classList.toggle('current',i===bar));}
  requestAnimationFrame(animate);
}
function buildKeyboard() {
  const whites=[0,2,4,5,7,9,11], all=[];
  for(let octave=3;octave<=5;octave++) whites.forEach(pc=>all.push(12*(octave+1)+pc));
  const make=(midi,black=false,left=0)=>{
    const button=document.createElement('button');button.className='piano-key'+(black?' black':'');button.disabled=true;button.setAttribute('aria-label',`Play ${noteName(midi)}`);
    if(black){button.style.left=left+'%';button.style.width=(100/21*.6)+'%';}else if(midi%12===0)button.textContent=noteName(midi);
    button.onpointerdown=()=>{if(ready){piano.triggerAttackRelease(noteName(midi),0.6,Tone.now(),0.7);flash([midi],450);}};
    button.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat&&ready){e.preventDefault();piano.triggerAttackRelease(noteName(midi),0.6,Tone.now(),0.7);flash([midi],450);}};
    $('keyboard').append(button);keyNodes.set(midi,button);
  };
  all.forEach(midi=>make(midi));
  all.forEach((midi,index)=>{if([0,2,5,7,9].includes(midi%12))make(midi+1,true,(index+1)/21*100-100/21*.3);});
}
let lastDownloadUrl;
function download(blob,extension) {
  if(lastDownloadUrl) URL.revokeObjectURL(lastDownloadUrl);
  lastDownloadUrl=URL.createObjectURL(blob);
  const a=$('download-ready');a.href=lastDownloadUrl;
  a.download=`${project.title.replace(/[^a-z0-9 _-]/gi,'').trim().replace(/ +/g,'-')||'chordloom-session'}.${extension}`;
  a.textContent=`Download ${a.download}`;a.hidden=false;
  a.click();
}

function exportMidi() {
  try {
    if(typeof Midi!=='function') throw new Error('The MIDI library did not load. Check your connection and reload.');
    const midi=new Midi();midi.header.setTempo(project.settings.bpm);midi.header.timeSignatures.push({ticks:0,timeSignature:[4,4]});
    for(const layer of ['keys','bass','melody']) {
      if(!project.settings.layers[layer]) continue;
      const track=midi.addTrack();track.name=`Chordloom ${layer}`;track.instrument.number=0;
      project.events.filter(e=>e.layer===layer).forEach(e=>track.addNote({midi:e.midi,ticks:Math.round(e.beat*midi.header.ppq),durationTicks:Math.round(e.duration*midi.header.ppq),velocity:e.velocity}));
    }
    download(new Blob([midi.toArray()],{type:'audio/midi'}),'mid');status('MIDI ready with the active layers, performed timing, velocities and chosen tempo. Use the download link if your browser does not save automatically.');
  } catch(error){status(error.message,true);}
}
function wave(buffer) {
  const count=buffer.numberOfChannels,length=buffer.length,data=new ArrayBuffer(44+length*count*2),view=new DataView(data);
  const text=(offset,s)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,data.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,count,true);view.setUint32(24,buffer.sampleRate,true);view.setUint32(28,buffer.sampleRate*count*2,true);view.setUint16(32,count*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length*count*2,true);
  const channels=Array.from({length:count},(_,i)=>buffer.getChannelData(i));let offset=44;
  for(let frame=0;frame<length;frame++)for(let c=0;c<count;c++){const v=Math.max(-1,Math.min(1,channels[c][frame]));view.setInt16(offset,Math.round(v*(v<0?32768:32767)),true);offset+=2;}
  return new Blob([data],{type:'audio/wav'});
}
async function exportWav() {
  if(!ready) return;
  const snapshot=clone(project),s=snapshot.settings,secondsPerBeat=60/s.bpm,events=activeEvents(snapshot);
  if(!events.length){status('Turn on at least one layer before exporting audio.',true);return;}
  $('export-wav').disabled=true;$('export-wav').textContent='Rendering…';
  try {
    const rendered=await Tone.Offline(()=>{
      const instrument=createPiano();events.forEach(e=>instrument.triggerAttackRelease(noteName(e.midi),e.duration*secondsPerBeat,e.beat*secondsPerBeat,e.velocity));
    },s.bars*4*secondsPerBeat+1.7);
    download(wave(rendered),'wav');status('Piano WAV ready with the same active notes, feel and tempo as playback. Keep the piano attribution with shared audio.');
  } catch(error){status('WAV render failed: '+error.message,true);}
  finally{$('export-wav').disabled=false;$('export-wav').textContent='↓ Piano WAV';}
}
$('activate').onclick=activate;$('play').onclick=togglePlay;$('stop').onclick=stop;
$('generate').onclick=()=>{try{const next=settingsFromControls();pushUndo();stop();const keep=next.key===project.settings.key&&next.style===project.settings.style?project.chords:[];project={...generate(next,seed(),keep),title:$('session-title').value.trim()||'Untitled session',...(project.id?{id:project.id}:{})};changed();render();status('New variation ready. Locked bars kept their exact voicings; Undo brings the previous idea back.');}catch(e){status(e.message,true);}};
// Harmonic setting changes make an audible arrangement immediately. A change of key/style intentionally releases old locks.
for(const name of ['style','key','bars','complexity']) $(name).onchange=()=>{
  try{const next=settingsFromControls();pushUndo();stop();const keep=next.key===project.settings.key&&next.style===project.settings.style?project.chords:[];project={...project,...generate(next,project.seed,keep)};changed();render();status('Arrangement updated. Key, style and harmonic color now match the notes.');}catch(e){status(e.message,true);}
};
for(const name of ['rhythm','humanize']) $(name).onchange=()=>{try{pushUndo();stop();project.settings=settingsFromControls();project.events=perform(project.chords,project.settings,project.seed);$('humanize-value').textContent=Math.round(project.settings.humanize*100)+'%';changed();render();status('Performance updated: harmony stays; rhythm and human feel change.');}catch(e){status(e.message,true);}};
$('humanize').oninput=()=>{$('humanize-value').textContent=$('humanize').value+'%';};
$('bpm').onchange=()=>{try{const next=settingsFromControls();pushUndo();project.settings.bpm=next.bpm;if(ready)Tone.Transport.bpm.value=next.bpm;changed();status('Tempo updated for playback and both exports.');}catch(e){$('bpm').value=project.settings.bpm;status(e.message,true);}};
for(const node of document.querySelectorAll('[data-layer]'))node.onchange=()=>{const resume=playing;pushUndo();stop();project.settings.layers[node.dataset.layer]=node.checked;changed();renderRoll();$('key-description').textContent=`${NOTE_NAMES[project.settings.key]} ${STYLES[project.settings.style].mode} · ${project.settings.bars} bars · ${activeEvents(project).length} notes`;if(resume)togglePlay();status('Only enabled layers play and export. Their original notes stay in the session.');};
$('session-title').oninput=()=>{project.title=$('session-title').value;changed();};
function save(copy=false){try{project.title=$('session-title').value.trim()||'Untitled session';const saved=saveProject(localStorage,project,copy);project=saved;dirty=false;loadControls();render();status(`Saved ${project.title} on this device. Use Session export for a portable backup.`);}catch(error){status(error.message+' Your current arrangement is still open; export a Session backup.',true);}}
$('save').onclick=()=>save();$('save-copy').onclick=()=>save(true);
$('new-session').onclick=()=>{pushUndo();stop();project={...generate(DEFAULT_SETTINGS,seed()),title:'New piano idea'};dirty=true;loadControls();render();status('A fresh session. Undo can return to the previous working idea.');};
$('undo').onclick=()=>{if(!undoStack.length)return;stop();project=undoStack.pop();dirty=true;loadControls();render();$('undo').disabled=!undoStack.length;status('Previous working version restored.');};
$('close-editor').onclick=()=>{$('chord-editor').hidden=true;selectedBar=null;document.querySelectorAll('.chord-cell.selected').forEach(n=>n.classList.remove('selected'));};
$('export-midi').onclick=exportMidi;$('export-wav').onclick=exportWav;$('export-json').onclick=()=>{download(new Blob([JSON.stringify({version:1,project},null,2)],{type:'application/json'}),'json');status('Portable session ready. Import it on another device to reopen the exact notes.');};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>2000000)throw new Error('Session file is too large.');const imported=importProject(await file.text());pushUndo();stop();project=imported;dirty=true;loadControls();render();status('Session imported with its exact arrangement. Save to keep it in this device’s library.');}catch(e){status(e.message,true);}finally{$('import-file').value='';}};
window.addEventListener('storage',e=>{if(e.key==='chordloom.projects.v1')updateLibrary();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){Tone.Transport.pause();piano.releaseAll();playing=false;paused=true;$('play').textContent='▶ Resume';$('play').setAttribute('aria-label','Resume session');document.body.classList.remove('playing');}});
loadControls();buildKeyboard();render();requestAnimationFrame(animate);

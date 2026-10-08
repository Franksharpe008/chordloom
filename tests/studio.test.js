import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, DEFAULT_SETTINGS, STYLES, activeEvents, perform } from '../src/music-engine.js';
import { readLibrary, saveProject, importProject, STORAGE_KEY } from '../src/project-store.js';
const storage = () => { const values=new Map(); return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}; };
test('each style and complexity produces bounded, reproducible performances with three linked lanes',()=>{
  for(const style of Object.keys(STYLES))for(const complexity of [1,2,3])for(const key of [0,6,11]){
    const s={...DEFAULT_SETTINGS,style,complexity,key,bars:16};const p=generate(s,9876);
    assert.deepEqual(p,generate(s,9876));assert.equal(p.chords.length,16);
    for(const c of p.chords){assert.ok(c.notes.every(n=>n>=48&&n<=86));assert.equal(c.notes.filter(n=>n%12===c.root).length,1);}
    for(const e of p.events){assert.ok(e.beat>=e.bar*4&&e.beat<(e.bar+1)*4);assert.ok(e.duration>0&&e.beat+e.duration<=64);assert.ok(e.midi>=36&&e.midi<=91);assert.ok(e.velocity>0&&e.velocity<=1);}
    assert.deepEqual([...new Set(p.events.map(e=>e.layer))].sort(),['bass','keys','melody']);
  }
});
test('advanced harmony has richer chords and rhythms, and secondary dominant resolves into relative minor',()=>{
 const basic=generate({...DEFAULT_SETTINGS,complexity:1},42);const advanced=generate({...DEFAULT_SETTINGS,complexity:3},42);
 assert.ok(advanced.events.length>basic.events.length);assert.ok(advanced.chords.some(c=>c.notes.length>3));assert.equal(advanced.chords[4].label,'E7');assert.equal(advanced.chords[5].root,9);
});
test('locked chords survive variation and muted lanes retain recoverable notes',()=>{
 const p=generate(DEFAULT_SETTINGS,123);p.chords[2].locked=true;const next=generate(DEFAULT_SETTINGS,456,p.chords);assert.deepEqual(next.chords[2],p.chords[2]);
 const muted={...next,settings:{...next.settings,layers:{keys:true,bass:false,melody:false}}};assert.ok(activeEvents(muted).every(e=>e.layer==='keys'));assert.ok(muted.events.some(e=>e.layer==='melody'));
 assert.deepEqual(next.events,perform(next.chords,next.settings,next.seed));
});
test('saved sessions reopen exact notes and portable backups preserve the arrangement',()=>{
 const store=storage();const p={...generate(DEFAULT_SETTINGS,42),title:'A keeper'};const saved=saveProject(store,p);assert.deepEqual(readLibrary(store)[0],saved);
 const copy=saveProject(store,saved,true);assert.notEqual(copy.id,saved.id);assert.equal(readLibrary(store).length,2);
 const imported=importProject(JSON.stringify({version:1,project:saved}));assert.equal(imported.id,undefined);assert.deepEqual(imported.events,saved.events);
});
test('invalid or failed writes preserve existing data; malformed imports cannot replace a session',()=>{
 const store=storage();store.setItem(STORAGE_KEY,'broken original data');assert.throws(()=>saveProject(store,{...generate(DEFAULT_SETTINGS,42),title:'Test'}));assert.equal(store.getItem(STORAGE_KEY),'broken original data');
 const denied={getItem:()=>null,setItem:()=>{throw Error('Quota exceeded');}};assert.throws(()=>saveProject(denied,{...generate(DEFAULT_SETTINGS,42),title:'Test'}),/Quota/);
 assert.throws(()=>importProject(JSON.stringify({version:1,project:{...generate(DEFAULT_SETTINGS,42),title:'Bad',events:[{beat:-1}]}})));
});

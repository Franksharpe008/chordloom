"""Reproduce the compact CC0 palette from the credited upstream recordings.
Requires numpy/scipy. Source recordings are kept outside the served app.
"""
from pathlib import Path
import urllib.request, urllib.parse, json, hashlib
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, periodogram
from scipy.interpolate import CubicSpline
root=Path(__file__).resolve().parents[1]
cache=Path('/tmp/chordloom-raw');cache.mkdir(exist_ok=True)
manifest=[]
def source(name,repo,path):
 url='https://raw.githubusercontent.com/'+repo+'/'+urllib.parse.quote(path)
 file=cache/name
 if not file.exists():file.write_bytes(urllib.request.urlopen(url).read())
 sr,x=wavfile.read(file);x=x.astype(np.float64)/np.iinfo(x.dtype).max
 if x.ndim>1:x=x.mean(axis=1)
 return sr,x,url
def save(path,sr,x,url,notes):
 x=np.nan_to_num(x);x-=x.mean();x=x/max(.00001,abs(x).max())*.85
 fade=min(len(x)//2,int(sr*.04));x[-fade:]*=np.linspace(1,0,fade)
 target=root/path;wavfile.write(target,sr,np.round(x*32767).astype('<i2'))
 manifest.append(dict(file=path,source=url,license='CC0-1.0',processing=notes,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
for note in ['b1','e2','a2','d3','g3']:
 for rr in [1,2]:
  sr,x,url=source(f'finger-{note}-{rr}.wav','sfzinstruments/karoryfer.black-and-blue-basses/main',f'Samples/darkblack/reg/darkblack_{note}_mf_rr{rr}.wav')
  save(f'samples/bass/{note}-{rr}.wav',sr,x[:int(sr*2.8)],url,'Mono 16-bit, 2.8 second crop, peak normalized, 40 ms end fade; two alternating takes.')
for note in ['G2','F3','C4','B4','F5','C6']:
 sr,x,url=source('marimba-'+note+'.wav','sgossner/VCSL/master','Idiophones/Struck Idiophones/Marimba/Marimba_hit_Outrigger_'+note+'_med_01.wav')
 # VCSL uses C3-as-middle-C file naming. The acoustic pitches are one octave higher.
 pitch={'G2':55,'F3':65,'C4':72,'B4':83,'F5':89,'C6':96}[note]
 expected=440*2**((pitch-69)/12)
 f,p=periodogram(x[:int(sr*.6)],sr,window='hann',nfft=sr*16)
 band=np.flatnonzero((f>expected*.97)&(f<expected*1.03));i=band[np.argmax(p[band])]
 a,b,c=np.log(p[i-1:i+2]);delta=.5*(a-c)/(a-2*b+c);measured=f[i]+delta*(f[1]-f[0])
 ratio=expected/measured;x=np.interp(np.arange(int(len(x)/ratio))*ratio,np.arange(len(x)),x)
 x=sosfilt(butter(2,70,btype='highpass',fs=sr,output='sos'),x)
 save('samples/mallets/'+note+'.wav',sr,x[:int(sr*3)],url,f'Mono 16-bit, normalized scientific pitch MIDI {pitch} ({expected:.6f} Hz), 70 Hz rumble cut, up to 3 seconds, 40 ms end fade. Source measured {measured:.6f} Hz.')
sr,x,url=source('808-original.wav','tidalcycles/sounds-tr808-fischer/main','bd8/BD0075.WAV')
# Preserve the hardware transient, then crossfade to its sampled steady waveform.
# Interpolate one measured cycle onto a periodic grid; fixed C2 reference is exact.
segment=x[int(.3*sr):int(.6*sr)]
zc=np.flatnonzero((segment[:-1]<=0)&(segment[1:]>0))
a,b=zc[2],zc[3];cycle=segment[a:b];periodic=CubicSpline(np.arange(len(cycle)+1),np.r_[cycle,cycle[0]],bc_type='periodic')
f0=sr/(b-a);target=65.40639132514966;t=np.arange(sr*4)/sr
body=periodic((t*target%1)*len(cycle));body/=abs(body).max()
attack=np.interp(np.arange(int(sr*.16))*target/f0,np.arange(len(x)),x);attack/=max(abs(attack).max(),1e-8)
base=body.copy();n=len(attack);cross=np.clip((np.arange(n)/sr-.025)/.09,0,1)
base[:n]=attack*(1-cross)+body[:n]*cross
# Punch emphasizes upper harmonics without shifting the fundamental; smooth saturation.
punch=np.tanh(base*2.8)/np.tanh(2.8);punch=sosfilt(butter(2,1800,fs=sr,output='sos'),punch)
long=np.tanh(base*1.5)/np.tanh(1.5)
punch*=.32+.68*np.exp(-t*3.2)
long*=.52+.48*np.exp(-t*1.7)
for kind,y in [('punch',punch),('long',long)]:save('samples/808/'+kind+'-C2.wav',sr,y,url,'Recorded TR-808 transient plus periodically extended sampled body tuned to C2 65.406391 Hz. Original Chordloom saturation/filter processing; not a proprietary producer sample.')
(root/'samples/PALETTE-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared',len(manifest),'samples,',sum((root/m['file']).stat().st_size for m in manifest),'bytes')

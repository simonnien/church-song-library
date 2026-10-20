import json,subprocess,tempfile
from pathlib import Path
script=Path('public/tools/match-videos.ps1').resolve()
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False),encoding='utf-8')
with tempfile.TemporaryDirectory(prefix='song-match-') as tmp:
 root=Path(tmp);lib=root/'Shows';lib.mkdir();videos=root/'videos';videos.mkdir();(videos/'test.mp4').write_bytes(b'x')
 def show(name,layout='default',media=None):return {'name':name,'settings':{'activeLayout':layout},'layouts':{layout:{'slides':[]}},'media':media or {}}
 local=show('001-Alpha','local-layout',{'keep':{'path':'C:/original.mp4'}})
 write(lib/'alpha.show',['old-random-id',local])
 def package(name,ids):
  p=root/name;p.mkdir();shows={};refs=[]
  for sid,title in ids:
   s=show(title,media={'bg':{'path':'__VIDEO__'}});shows[sid]=s;refs.append({'type':'show','id':sid,'name':title,'layout':'default'});write(p/(title+'.show'),[sid,s])
  write(p/'plan.project',{'project':{'name':'test','shows':refs},'shows':shows});write(p/'media-map.json',[{'placeholder':'__VIDEO__','filename':'test.mp4'}]);return p
 def run(p,ok=True):
  r=subprocess.run(['powershell','-NoProfile','-File',str(script),'-ShowsFolder',str(lib),'-PackageFolder',str(p),'-VideoFolder',str(videos),'-NonInteractive'],capture_output=True)
  assert (r.returncode==0)==ok,r.stderr.decode(errors='replace')
  outputs=list(p.glob('matched-*'));assert len(outputs)==(1 if ok else 0)
  return json.loads((outputs[0]/'plan.project').read_text(encoding='utf-8')) if ok else None
 before=(lib/'alpha.show').read_bytes()
 p=package('mixed',[('church_song_library_1','001-Alpha'),('church_song_library_2','002-Beta')]);data=run(p)
 assert data['project']['shows'][0]['id']=='old-random-id'
 assert data['project']['shows'][0]['layout']=='local-layout'
 assert list(data['shows'])==['church_song_library_2']
 assert Path(data['shows']['church_song_library_2']['media']['bg']['path']).is_file()
 assert (lib/'alpha.show').read_bytes()==before
 p=package('all-existing',[('church_song_library_1','001-Alpha')]);data=run(p);assert data['shows']=={}
 write(lib/'duplicate.show',['another-id',local]);run(package('ambiguous',[('church_song_library_1','001-Alpha')]),False)
 print('PASS: local song reuse, missing-song fallback, local layout preservation, video matching, no overwrite, all-existing and ambiguous-name rejection')

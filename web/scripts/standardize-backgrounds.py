"""Create non-destructive 1080p/ultrawide, silent 30 fps looping derivatives."""
import concurrent.futures,json,pathlib,re,subprocess,time,urllib.request,shutil
import imageio_ffmpeg
ROOT=pathlib.Path('D:/FreeShow/video/標準背景_20261107')
ROOT.mkdir(parents=True,exist_ok=True)
SOURCES=ROOT/'原片';SOURCES.mkdir(exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe()
catalog_backup=ROOT/'source-catalog.json'
if not catalog_backup.exists():shutil.copy2('lib/background-catalog.json',catalog_backup)
CAT=json.loads(catalog_backup.read_text('utf-8'))
groups={}
for b in CAT:
 key=re.sub(r'_(16|32)比9','',b['name']).replace('（高畫質）','')
 groups.setdefault(key,[]).append(b)
plan=[]
for group in groups.values():
 for b in group:
  b['familyId']=group[0]['id'];b['targets']=[]
 for ratio in ['16:9','32:9']:
  chosen=next((b for b in group if b['ratio']==ratio),group[0]);chosen['targets'].append(ratio)
 plan.extend(b for b in group if b['targets'])
CAT=plan

def source(b):
 p=SOURCES/(b['id']+'.mp4')
 if p.exists() and p.stat().st_size==b['bytes']:return p
 local=ROOT.parent/b['filename']
 if local.exists() and local.stat().st_size==b['bytes']:shutil.copy2(local,p);return p
 for attempt in range(4):
  try:
   temp=p.with_suffix('.part')
   with urllib.request.urlopen('https://drive.usercontent.google.com/download?id='+b['id']+'&export=download&confirm=t',timeout=300) as r,temp.open('wb') as f:shutil.copyfileobj(r,f)
   if temp.stat().st_size!=b['bytes']:raise ValueError('download size mismatch')
   temp.replace(p);return p
  except Exception:
   if attempt==3:raise
   time.sleep(2*(attempt+1))

def run(b):
 p=source(b)
 probe=subprocess.run([FF,'-hide_banner','-i',str(p)],capture_output=True).stderr.decode('utf-8',errors='replace')
 m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',probe)
 if not m:raise ValueError('missing duration '+b['id'])
 duration=int(m[1])*3600+int(m[2])*60+float(m[3]);fade=min(.8,duration/4)
 results=[]
 for ratio,width in [('16:9',1920),('32:9',3840)]:
  if ratio not in b['targets']:continue
  folder=ROOT/ratio.replace(':','比');folder.mkdir(exist_ok=True)
  name=re.sub(r'_(16|32)比9','',b['name']).replace('（高畫質）','')+'_'+ratio.replace(':','比')+'_循環.mp4'
  out=folder/name;meta=out.with_suffix('.json')
  if meta.exists() and out.exists() and out.stat().st_size<100_000_000:
   item=json.loads(meta.read_text('utf-8'));item['sourceId']=b['familyId'];item['originalId']=b['id'];meta.write_text(json.dumps(item,ensure_ascii=False,indent=2),encoding='utf-8');results.append(item);continue
  vf=f'fps=30,scale={width}:1080:force_original_aspect_ratio=increase,crop={width}:1080,setsar=1,format=yuv420p,split[a][b];[a]trim=start={fade},setpts=PTS-STARTPTS,fps=30,settb=1/30[a1];[b]trim=end={fade},setpts=PTS-STARTPTS,fps=30,settb=1/30[b1];[a1][b1]xfade=transition=fade:duration={fade}:offset={duration-2*fade},format=yuv420p[v]'
  bitrate=int(min(4_000_000 if width==1920 else 8_000_000,640_000_000/duration))
  cmd=[FF,'-y','-v','error','-i',str(p),'-filter_complex_threads','2','-filter_complex',vf,'-map','[v]','-an','-c:v','h264_nvenc','-preset','p4','-rc','vbr','-b:v',str(bitrate),'-maxrate',str(int(bitrate*1.15)),'-bufsize',str(bitrate*2),'-g','60','-movflags','+faststart',str(out)]
  result=subprocess.run(cmd,capture_output=True)
  if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace')[-1500:])
  result=subprocess.run([FF,'-v','error','-i',str(out),'-f','null','-'],capture_output=True)
  if result.returncode or result.stderr:raise RuntimeError('decode validation failed '+name)
  thumb=out.with_suffix('.jpg');subprocess.run([FF,'-y','-v','error','-ss','1','-i',str(out),'-frames:v','1','-vf','scale=480:-1',str(thumb)],check=True)
  item={'sourceId':b['familyId'],'originalId':b['id'],'name':name[:-4],'filename':name,'path':str(out),'thumbnail':str(thumb),'ratio':ratio,'width':width,'height':1080,'fps':30,'bytes':out.stat().st_size,'loop':True,'loopMethod':'tail-to-head-crossfade','fadeSeconds':fade}
  meta.write_text(json.dumps(item,ensure_ascii=False,indent=2),encoding='utf-8');results.append(item)
  print('READY '+name,flush=True)
 return results

if __name__=='__main__':
 all_results=[];errors=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  tasks={pool.submit(run,b):b for b in CAT}
  for task in concurrent.futures.as_completed(tasks):
   try:all_results.extend(task.result())
   except Exception as e:errors.append({'id':tasks[task]['id'],'error':str(e)});print('ERROR '+str(e),flush=True)
   (ROOT/'conversion-report.json').write_text(json.dumps({'videos':all_results,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
 print(f'DONE {len(all_results)} videos; {len(errors)} errors',flush=True)

"""Local background importer. No AI or Google credentials required."""
import hashlib,json,os,pathlib,re,shutil,subprocess,threading,urllib.request,urllib.parse,uuid,webbrowser
import tkinter as tk
from tkinter import ttk,filedialog,messagebox
WEB=pathlib.Path(__file__).resolve().parents[2]
ROOT=WEB/'.sites-runtime'/'background-importer'
ROOT.mkdir(parents=True,exist_ok=True)
CAT=WEB/'lib'/'background-catalog.json'
THUMBS=WEB/'public'/'background-thumbnails'
CREATE_NO_WINDOW=0x08000000 if os.name=='nt' else 0

def run(args,cwd=None):
 r=subprocess.run([str(a) for a in args],cwd=cwd,capture_output=True,creationflags=CREATE_NO_WINDOW)
 if r.returncode:raise RuntimeError(r.stderr.decode('utf-8',errors='replace')[-1800:] or r.stdout.decode('utf-8',errors='replace')[-1800:])
 return r

def ffmpeg():
 import imageio_ffmpeg
 return imageio_ffmpeg.get_ffmpeg_exe()

def digest(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()

def drive_id(link):
 u=urllib.parse.urlparse(link.strip())
 if u.scheme!='https' or u.hostname not in ('drive.google.com','drive.usercontent.google.com'):raise ValueError('請貼 Google Drive 的 HTTPS 分享連結')
 m=re.search(r'/d/([\w-]+)',u.path)
 value=m[1] if m else urllib.parse.parse_qs(u.query).get('id',[''])[0]
 if not re.fullmatch(r'[\w-]{10,100}',value):raise ValueError('找不到影片檔案 ID，請勿貼資料夾連結')
 return value

def convert(source,name,ratios,blend,log):
 name=re.sub(r'[<>:"/\\|?*\x00-\x1f]','_',name).strip(' .')[:70]
 if not name:raise ValueError('請填影片名稱')
 ff=ffmpeg();r=subprocess.run([ff,'-hide_banner','-i',str(source)],capture_output=True,creationflags=CREATE_NO_WINDOW)
 m=re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)',r.stderr.decode(errors='replace'))
 if not m:raise ValueError('無法讀取影片長度')
 duration=int(m[1])*3600+int(m[2])*60+float(m[3])
 if not 2<=duration<=600:raise ValueError('請使用 2 秒至 10 分鐘的背景影片')
 job=ROOT/uuid.uuid4().hex;job.mkdir();items=[]
 for ratio in ratios:
  width=1920 if ratio=='16:9' else 3840
  filename=name+'_'+ratio.replace(':','比')+'_循環'
  out=job/(filename+'.mp4');thumb=job/(filename+'.jpg');fade=min(.8,duration/4)
  base=f'fps=30,scale={width}:1080:force_original_aspect_ratio=increase,crop={width}:1080,setsar=1,format=yuv420p'
  if blend:
   vf=base+f',split[a][b];[a]trim=start={fade},setpts=PTS-STARTPTS,fps=30,settb=1/30[a1];[b]trim=end={fade},setpts=PTS-STARTPTS,fps=30,settb=1/30[b1];[a1][b1]xfade=transition=fade:duration={fade}:offset={duration-2*fade},format=yuv420p[v]'
  else:vf=base+'[v]'
  bitrate=int(min(4_000_000 if width==1920 else 8_000_000,600_000_000/duration))
  log('正在轉檔 '+ratio+'（可能需要數分鐘）')
  run([ff,'-y','-v','error','-i',source,'-filter_complex_threads','2','-filter_complex',vf,'-map','[v]','-an','-c:v','libx264','-preset','fast','-b:v',bitrate,'-maxrate',int(bitrate*1.15),'-bufsize',bitrate*2,'-g','60','-movflags','+faststart',out])
  log('完整解碼檢查 '+ratio)
  result=run([ff,'-v','error','-i',out,'-f','null','-'])
  if result.stderr.strip():raise ValueError('影片解碼檢查失敗')
  run([ff,'-y','-v','error','-ss','0.5','-i',out,'-frames:v','1','-vf','scale=480:-1',thumb])
  items.append(dict(name=filename,filename=out.name,path=str(out),thumbnail=str(thumb),sourceId='local_'+job.name,ratio=ratio,width=width,height=1080,fps=30,bytes=out.stat().st_size,loop=True,loopMethod='tail-to-head-crossfade' if blend else 'original',sha256=digest(out)))
 data={'videos':items};(job/'job.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 return job/'job.json',data

def verify(item,link,log):
 ident=drive_id(link);h=hashlib.sha256();size=0
 req=urllib.request.Request('https://drive.usercontent.google.com/download?'+urllib.parse.urlencode(dict(id=ident,export='download',confirm='t')))
 log('驗證 Drive 完整影片：'+item['ratio'])
 with urllib.request.urlopen(req,timeout=120) as response:
  if 'text/' in response.headers.get('Content-Type',''):raise ValueError('Drive 未提供影片。請設為「知道連結的任何人可檢視」，並確認上傳已完成')
  while True:
   b=response.read(1024*1024)
   if not b:break
   size+=len(b);h.update(b)
   if size>item['bytes']:raise ValueError('連結不是工具產生的影片：檔案大小不同')
 if size!=item['bytes'] or h.hexdigest()!=item['sha256']:raise ValueError('Drive 影片與轉檔結果不一致，請確認已完整上傳正確的 MP4')
 return ident

def merge_catalog(old,items,ids):
 if len(ids)!=len(set(ids)):raise ValueError('兩種比例不能使用同一個 Drive 檔案連結')
 result=list(old)
 for item,ident in zip(items,ids):
  existing=next((v for v in result if v['id']==ident),None)
  entry={k:v for k,v in item.items() if k not in ('path','thumbnail','sha256')};entry.update(id=ident,originalId=ident,localBytes=item['bytes'])
  if existing:
   if existing['bytes']!=entry['bytes'] or existing['ratio']!=entry['ratio']:raise ValueError('此 Drive ID 已存在且規格不同，請使用新上傳的檔案')
   continue
  if any(v['name']==entry['name'] for v in result):raise ValueError('網站已有同名影片，請換一個名稱後重新轉檔')
  result.append(entry)
 return result

class App:
 def __init__(self,root):
  self.root=root;self.job=None;self.data=None;self.links=[];self.busy=False
  root.title('背景影片匯入工具（不使用 AI）');root.geometry('800x760')
  frame=ttk.Frame(root,padding=18);frame.pack(fill='both',expand=True)
  ttk.Label(frame,text='① 選影片 → ② 轉檔預覽 → ③ 上傳 Drive → ④ 驗證與發布',font=('Microsoft JhengHei',13,'bold')).pack(anchor='w',pady=8)
  self.source=tk.StringVar();ttk.Button(frame,text='選擇 MP4／影片',command=self.choose).pack(anchor='w');ttk.Entry(frame,textvariable=self.source).pack(fill='x',pady=4)
  ttk.Label(frame,text='影片名稱（請避免與現有影片同名）').pack(anchor='w');self.name=tk.StringVar();ttk.Entry(frame,textvariable=self.name).pack(fill='x')
  self.ratio=tk.StringVar(value='兩種');ttk.Combobox(frame,textvariable=self.ratio,values=['兩種','16:9','32:9'],state='readonly').pack(anchor='w',pady=6)
  self.blend=tk.BooleanVar(value=True);ttk.Checkbutton(frame,text='尾接頭淡化 0.8 秒（不能保證自然無縫；請預覽，可能有疊影）',variable=self.blend).pack(anchor='w')
  ttk.Label(frame,text='規格：H.264／30fps／無聲；16:9=1920×1080，32:9=3840×1080。居中裁切，不拉伸。').pack(anchor='w')
  actions=ttk.Frame(frame);actions.pack(fill='x',pady=8)
  ttk.Button(actions,text='產生影片與縮圖',command=self.prepare).pack(side='left');ttk.Button(actions,text='開啟之前的工作',command=self.resume).pack(side='left',padx=8)
  ttk.Button(actions,text='開啟產出資料夾',command=self.folder).pack(side='left')
  ttk.Label(frame,text='只上傳產出的 MP4 到 Drive，分享設「知道連結的任何人可檢視」，貼上各自連結。').pack(anchor='w')
  self.rows=ttk.Frame(frame);self.rows.pack(fill='x',pady=8)
  self.approved=tk.BooleanVar();ttk.Checkbutton(frame,text='我已預覽裁切與循環效果，確認可以發布',variable=self.approved).pack(anchor='w')
  ttk.Button(frame,text='驗證 Drive 影片並發布正式網站',command=self.publish).pack(anchor='w',pady=8)
  ttk.Label(frame,text='發布會包含目前本機網站程式。請勿與其他開發／部署同時進行。發布失敗可用同一工作重試。').pack(anchor='w')
  self.status=tk.Text(frame,height=12,wrap='word');self.status.pack(fill='both',expand=True)
  root.protocol('WM_DELETE_WINDOW',lambda: messagebox.showinfo('工作中','請等待工作結束') if self.busy else root.destroy())
 def log(self,text):self.root.after(0,lambda:(self.status.insert('end',text+'\n'),self.status.see('end')))
 def task(self,fn):
  if self.busy:return
  self.busy=True
  def work():
   try:fn()
   except Exception as e:self.log('失敗：'+str(e))
   finally:self.busy=False
  threading.Thread(target=work,daemon=True).start()
 def choose(self):
  if self.busy:return
  value=filedialog.askopenfilename(filetypes=[('影片','*.mp4 *.mov *.mkv *.webm'),('所有檔案','*.*')])
  if value:self.source.set(value);self.name.set(pathlib.Path(value).stem)
 def prepare(self):
  source=self.source.get();name=self.name.get();ratio=self.ratio.get();blend=self.blend.get()
  if not pathlib.Path(source).is_file():messagebox.showerror('請選影片','找不到來源影片');return
  def work():
   self.job,self.data=convert(source,name,['16:9','32:9'] if ratio=='兩種' else [ratio],blend,self.log)
   self.root.after(0,self.show_job);self.log('轉檔完成。請預覽後上傳 MP4，勿上傳原片。')
  self.task(work)
 def show_job(self):
  for w in self.rows.winfo_children():w.destroy()
  self.links=[];self.approved.set(False)
  for item in self.data['videos']:
   row=ttk.Frame(self.rows);row.pack(fill='x',pady=4)
   ttk.Button(row,text='預覽 '+item['ratio'],command=lambda p=item['path']:os.startfile(p)).pack(side='left')
   value=tk.StringVar(value=item.get('link',''));self.links.append(value);ttk.Entry(row,textvariable=value).pack(side='left',fill='x',expand=True,padx=8)
  self.log('工作資料夾：'+str(self.job.parent))
 def resume(self):
  if self.busy:return
  value=filedialog.askopenfilename(initialdir=ROOT,filetypes=[('匯入工作','job.json')])
  if not value:return
  try:
   data=json.loads(pathlib.Path(value).read_text('utf-8'))
   for i in data['videos']:
    if not pathlib.Path(i['path']).is_file() or digest(i['path'])!=i['sha256']:raise ValueError('影片遺失或已變更')
   self.job=pathlib.Path(value);self.data=data;self.show_job()
  except Exception as e:messagebox.showerror('無法開啟',str(e))
 def folder(self):
  if self.job:os.startfile(self.job.parent)
  else:os.startfile(ROOT)
 def publish(self):
  if self.busy:return
  if not self.data or not self.approved.get():messagebox.showinfo('尚未準備完成','請先轉檔、預覽，並勾選確認');return
  links=[v.get() for v in self.links]
  if not messagebox.askyesno('發布正式網站','將驗證影片並重新建置／部署 songs.beersheba.cc。確定發布？'):return
  def work():
   for item,link in zip(self.data['videos'],links):item['link']=link
   self.job.write_text(json.dumps(self.data,ensure_ascii=False,indent=2),encoding='utf-8')
   ids=[verify(item,link,self.log) for item,link in zip(self.data['videos'],links)]
   before=CAT.read_text('utf-8');merged=merge_catalog(json.loads(before),self.data['videos'],ids)
   (self.job.parent/'catalog-before.json').write_text(before,encoding='utf-8')
   for item,ident in zip(self.data['videos'],ids):shutil.copy2(item['thumbnail'],THUMBS/(ident+'.jpg'))
   CAT.write_text(json.dumps(merged,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
   node=shutil.which('node')
   if not node:raise ValueError('找不到 Node.js，請先安裝 Node.js 並重新開工具')
   self.log('建置網站中…')
   try:result=run([node,'scripts/cloudflare.mjs','build'],WEB)
   except Exception:
    CAT.write_text(before,encoding='utf-8');raise
   (self.job.parent/'build.log').write_bytes(result.stdout+result.stderr)
   self.log('發布正式網站中…')
   try:result=run([node,'node_modules/wrangler/bin/wrangler.js','deploy','--config','dist/server/wrangler.json'],WEB)
   except Exception as e:raise RuntimeError(str(e)+'\n清單已保留，修正連線後可再按發布；若授權過期請執行 Cloudflare登入.cmd')
   (self.job.parent/'deploy.log').write_bytes(result.stdout+result.stderr)
   self.log('發布成功！請重新整理網站選擇影片，並匯出專案到 FreeShow 實測。\n本機原始碼已更新，Git 備份請依 README 操作。')
  self.task(work)

if __name__=='__main__':
 root=tk.Tk();App(root);root.mainloop()

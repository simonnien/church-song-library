import importer as m
import tempfile,pathlib,json
assert m.drive_id('https://drive.google.com/file/d/abcdefghijk/view')=='abcdefghijk'
for bad in ['https://evil.test/file/d/abcdefghijk/view','https://drive.google.com/drive/folders/abcdefghijk']:
 try:m.drive_id(bad);raise AssertionError('accepted invalid URL')
 except ValueError:pass
with tempfile.TemporaryDirectory() as temp:
 m.ROOT=pathlib.Path(temp);src=m.ROOT/'source.mp4'
 m.run([m.ffmpeg(),'-v','error','-f','lavfi','-i','testsrc2=size=640x360:rate=30','-t','3','-c:v','libx264',src])
 job,data=m.convert(src,'匯入測試',['16:9','32:9'],True,print)
 assert len(data['videos'])==2
 ids=['abcdefghijk','lmnopqrstuv'];merged=m.merge_catalog([],data['videos'],ids)
 assert len(merged)==2 and merged[1]['width']==3840
 assert len(m.merge_catalog(merged,data['videos'],ids))==2
 assert all('path' not in v and 'sha256' not in v for v in merged)
 assert all(pathlib.Path(v['thumbnail']).is_file() for v in data['videos'])
 # Verify the public download path against exact local bytes without uploading test data.
 import io
 raw=pathlib.Path(data['videos'][0]['path']).read_bytes()
 class Response(io.BytesIO):
  headers={'Content-Type':'video/mp4'}
 original=m.urllib.request.urlopen
 m.urllib.request.urlopen=lambda *a,**k:Response(raw)
 assert m.verify(data['videos'][0],'https://drive.google.com/file/d/abcdefghijk/view',print)==ids[0]
 m.urllib.request.urlopen=lambda *a,**k:Response(raw[:-1])
 try:m.verify(data['videos'][0],'https://drive.google.com/file/d/abcdefghijk/view',print);raise AssertionError('accepted truncation')
 except ValueError:pass
 m.urllib.request.urlopen=original
print('PASS: real dual-ratio transcode/decode, thumbnails, URL validation, idempotent catalog merge, exact hash check and truncated download rejection')

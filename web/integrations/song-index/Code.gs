const FILE_ID = '__TARGET_FILE_ID__';
const SITE = 'https://songs.beersheba.cc/api/library';
const TOKEN = '__PRIVATE_TOKEN__';
function doPost(e) {
 const reply = ok => ContentService.createTextOutput(JSON.stringify({ok})).setMimeType(ContentService.MimeType.JSON);
 const lock=LockService.getScriptLock();
 try {
  const body=JSON.parse(e.postData.contents);
  if(TOKEN.startsWith('__')||body.token!==TOKEN||!Array.isArray(body.changes))return reply(false);
  lock.waitLock(20000);
  // Always resolve names after taking the lock; a delayed request cannot restore an old name.
  const index=JSON.parse(UrlFetchApp.fetch(SITE).getContentText()).songs;
  if(!Array.isArray(index)||!index.length)throw Error('網站索引無效');
  const titles=new Map(index.map(s=>[Number(s.id),s.title]));
  const url='https://www.googleapis.com/drive/v3/files/'+FILE_ID;
  const headers={Authorization:'Bearer '+ScriptApp.getOAuthToken()};
  const metadata=JSON.parse(UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+FILE_ID+'?fields=etag',{headers}).getContentText());
  const tag=metadata.etag ? ['etag',metadata.etag] : null;
  const raw=UrlFetchApp.fetch(url+'?alt=media',{headers});
  if(!tag)throw Error('缺少 Drive 版本，未寫入');
  const parts=Utilities.unzip(raw.getBlob().setContentType('application/zip'));
  const part=n=>parts.find(b=>b.getName()===n);
  const wb=XmlService.parse(part('xl/workbook.xml').getDataAsString()).getRootElement(),ns=wb.getNamespace();
  const sh=wb.getChild('sheets',ns).getChildren('sheet',ns).find(s=>s.getAttribute('name').getValue()==='詩歌清單');
  const rid=sh.getAttributes().find(a=>a.getName()==='id').getValue();
  const rels=XmlService.parse(part('xl/_rels/workbook.xml.rels').getDataAsString()).getRootElement();
  const target=rels.getChildren().find(el=>el.getAttribute('Id').getValue()===rid).getAttribute('Target').getValue();
  const sheet=part(target.startsWith('/')?target.slice(1):'xl/'+target);
  const doc=XmlService.parse(sheet.getDataAsString()),root=doc.getRootElement(),rows=root.getChild('sheetData',ns).getChildren('row',ns);
  for(const {number:n} of body.changes){
   if(!Number.isInteger(n)||n<1||n>1300)throw Error('超出既有編號分冊，請先擴充');
   const row=(n-1)%100+3,col=2*Math.floor((n-1)/100);
   const cells=rows.find(r=>Number(r.getAttribute('r').getValue())===row).getChildren('c',ns);
   const get=i=>cells.find(c=>c.getAttribute('r').getValue()===String.fromCharCode(65+i)+row);
   if(Number(get(col).getChildText('v',ns))!==n)throw Error('原表版面已改變');
   const c=get(col+1);if(!c||c.getChild('f',ns))throw Error('目標格不存在或含公式');
   const title=titles.get(n);
   for(const name of ['v','is']){const old=c.getChild(name,ns);if(old)c.removeContent(old);}c.removeAttribute('t');
   if(title){c.setAttribute('t','inlineStr');c.addContent(XmlService.createElement('is',ns).addContent(XmlService.createElement('t',ns).setText(title)))}
  }
  sheet.setDataFromString(XmlService.getRawFormat().format(doc));
  const output=Utilities.zip(parts);
  UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v2/files/'+FILE_ID+'?uploadType=media',{method:'put',headers:{...headers,'If-Match':String(tag[1])},contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',payload:output.getBytes()});
  return reply(true);
 }catch(err){console.error(String(err));return reply(false)}finally{if(lock.hasLock())lock.releaseLock()}
}
// Run once from the editor to request Drive and external-request authorization.
function authorize(){DriveApp.getFileById(FILE_ID).getName();UrlFetchApp.fetch(SITE);}

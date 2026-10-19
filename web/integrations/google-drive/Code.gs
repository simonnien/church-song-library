/** Deploy as owner; requests require the shared server secret. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var input = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('BRIDGE_TOKEN');
    if (!secret || secret.length < 32 || input.token !== secret) return respond({ok:false,error:'Unauthorized'});
    if (input.action !== 'read' && input.action !== 'save') return respond({ok:false,error:'Unsupported action'});
    lock.waitLock(20000);
    var file = DriveApp.getFileById(props.getProperty('FILE_ID'));
    var raw = file.getBlob().getDataAsString('UTF-8');
    var data = JSON.parse(raw);
    if (data.format !== 'church-song-library/v1' || !Array.isArray(data.songs)) throw Error('Invalid database');
    if (input.action === 'read') return respond({ok:true,songs:data.songs});
    var song = input.song;
    if (!song || !/^\d{1,8}$/.test(song.id) || Number(song.id) !== song.number || typeof song.title !== 'string' || !song.title.trim() || song.title.length > 160 || !Number.isInteger(song.revision) || song.revision < 0 || !Array.isArray(song.blocks) || !song.blocks.length || song.blocks.length > 200 || JSON.stringify(song).length > 200000) throw Error('Invalid song');
    var index = data.songs.findIndex(function(s){return s.id === song.id});
    if ((index < 0 ? 0 : data.songs[index].revision || 0) !== song.revision) return respond({ok:false,conflict:true,error:'Revision conflict'});
    // Keep a recoverable snapshot before replacing the database.
    var backupId = props.getProperty('BACKUP_FOLDER_ID');
    if (!backupId) {
      backupId = DriveApp.createFolder('詩歌書房-修改備份').getId();
      props.setProperty('BACKUP_FOLDER_ID',backupId);
    }
    DriveApp.getFolderById(backupId).createFile('歌曲資料庫-'+new Date().toISOString().replace(/:/g,'-')+'.json',raw,MimeType.PLAIN_TEXT);
    song.revision += 1;
    song.status = '已確認';
    if (index < 0) data.songs.push(song); else data.songs[index] = song;
    data.songs.sort(function(a,b){return a.number-b.number});
    data.updatedAt = new Date().toISOString();
    file.setContent(JSON.stringify(data));
    return respond({ok:true,song:song});
  } catch (error) {
    return respond({ok:false,error:'Google Drive 讀寫失敗，請檢查設定或稍後重試'});
  } finally {if (lock.hasLock()) lock.releaseLock();}
}
function respond(value) {return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
// Run this once from the Apps Script editor, using your own Google account.
function initialize() {
  var props=PropertiesService.getScriptProperties();
  props.setProperty('FILE_ID','YOUR_DRIVE_FILE_ID');
  if (!props.getProperty('BRIDGE_TOKEN')) props.setProperty('BRIDGE_TOKEN',Utilities.getUuid()+Utilities.getUuid());
  var file=DriveApp.getFileById(props.getProperty('FILE_ID'));
  console.log('資料檔已連結：'+file.getName());
  console.log('接著部署為網頁應用程式。BRIDGE_TOKEN 可在專案設定的指令碼屬性取得。');
}

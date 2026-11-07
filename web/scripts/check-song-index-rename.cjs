const fs=require('fs'),assert=require('node:assert/strict'),{DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('drizzle/0000_youthful_exodus.sql','utf8'));db.exec(fs.readFileSync('drizzle/0008_song_index_pending.sql','utf8'));
if(fs.existsSync('drizzle/0011_song_index_upsert.sql'))db.exec(fs.readFileSync('drizzle/0011_song_index_upsert.sql','utf8'));
const save=db.prepare('INSERT INTO songs(id,data,revision,updated) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated=excluded.updated WHERE songs.revision=?');
save.run('761',JSON.stringify({title:'原歌名'}),1,'now',0);
for(let revision=1;revision<=3;revision++){
 const token=db.prepare('SELECT token FROM song_index_pending WHERE number=761').get().token;
 save.run('761',JSON.stringify({title:'新歌名'+revision}),revision+1,'now',revision);
 assert.equal(JSON.parse(db.prepare("SELECT data FROM songs WHERE id='761'").get().data).title,'新歌名'+revision);
 assert.notEqual(db.prepare('SELECT token FROM song_index_pending WHERE number=761').get().token,token);
 assert.equal(db.prepare('SELECT count(*) AS n FROM song_index_pending').get().n,1);
}
db.exec("UPDATE songs SET id='762' WHERE id='761'");assert.equal(db.prepare('SELECT count(*) AS n FROM song_index_pending').get().n,2);
db.exec("DELETE FROM songs WHERE id='762'");assert.equal(db.prepare('SELECT count(*) AS n FROM song_index_pending').get().n,2);
console.log('PASS: repeated rename, pending token refresh, number change and deletion');

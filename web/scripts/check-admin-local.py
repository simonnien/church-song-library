"""Local-only authorization integration test. Restores affected account rows."""
import hashlib, http.cookiejar, json, secrets, sqlite3, time, urllib.request, urllib.error
from pathlib import Path
origin = "http://127.0.0.1:5173"
users = ("beersheba01", "beersheba10")
db = next(sqlite3.connect(p) for p in Path(".wrangler/state/v3/d1").rglob("*.sqlite") if p.name != "metadata.sqlite")
tables = ("editor_accounts", "editor_passwords", "editor_sessions")
saved = {t: db.execute(f"SELECT * FROM {t} WHERE username IN (?,?)", users).fetchall() for t in tables}
started = int(time.time()*1000)
song_id = "99999998"
assert not db.execute("SELECT id FROM songs WHERE id=?", (song_id,)).fetchone(), "Test ID already in use"
secret = secrets.token_hex(20)
temporary = secrets.token_hex(20)
new = "新密碼-" + secrets.token_hex(20)
def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(browser,path,data=None,method=None):
    request=urllib.request.Request(origin+path,data=None if data is None else json.dumps(data).encode(),headers={"Origin":origin,"Content-Type":"application/json"},method=method)
    try: response=browser.open(request,timeout=60)
    except urllib.error.HTTPError as e: response=e
    body=response.read()
    return response.status,json.loads(body) if body else {}
try:
    for name in users:
        salt=secrets.token_hex(32)
        hashed=salt+":"+hashlib.pbkdf2_hmac("sha256",secret.encode(),salt.encode(),100000).hex()
        db.execute("INSERT OR REPLACE INTO editor_passwords VALUES(?,?,?)",(name,hashed,started))
        db.execute("INSERT OR REPLACE INTO editor_accounts VALUES(?,0,0,NULL)",(name,))
    db.commit()
    admin,other,guest=client(),client(),client()
    assert call(guest,"/api/admin")[0]==403
    for c,name in ((admin,users[0]),(other,users[1])):
        assert call(c,"/api/session",{"username":name,"password":secret})[0]==200
    assert call(other,"/api/admin")[0]==403
    status,data=call(admin,"/api/admin")
    assert status==200 and len(data["accounts"])==10 and "password_hash" not in json.dumps(data)
    def manage(action,password=temporary):
        return call(admin,"/api/admin",{"username":users[1],"action":action,"password":password,"adminPassword":secret})
    assert manage("disable")[0]==200
    assert call(other,"/api/session")[1]["username"] is None
    assert call(other,"/api/session",{"username":users[1],"password":secret})[0]==401
    assert manage("enable")[0]==200
    assert manage("reset")[0]==200
    assert call(other,"/api/session",{"username":users[1],"password":secret})[0]==401
    assert call(other,"/api/session",{"username":users[1],"password":temporary})[1]["mustChange"] is True
    assert call(other,"/api/library",{},method="PUT")[0]==403
    assert call(other,"/api/password",{"currentPassword":temporary,"newPassword":new})[0]==200
    assert call(other,"/api/session",{"username":users[1],"password":new})[1]["mustChange"] is False
    assert call(other,"/api/library")[1]["canEdit"] is True
    assert call(admin,"/api/admin",{"username":users[0],"action":"disable","adminPassword":secret})[0]==400
    song={"id":song_id,"number":int(song_id),"title":"Local history test","youtube":"","links":[],"blocks":[{"type":"主歌","number":"1","text":"Original"}],"status":"已確認","revision":0}
    code,created=call(other,"/api/library",song,method="PUT")
    assert code==200
    song=created["song"];song["blocks"][0]["text"]="Changed"
    code,changed=call(other,"/api/library",song,method="PUT")
    assert code==200
    assert call(other,"/api/library",song,method="PUT")[0]==409
    code,history=call(other,"/api/history?id="+song_id)
    assert code==200 and history["versions"][0]["actor"]==users[1]
    prior=history["versions"][0]["song"]
    assert prior["blocks"][0]["text"]=="Original"
    prior["revision"]=changed["song"]["revision"]
    assert call(other,"/api/library",prior,method="PUT")[0]==200
    assert call(guest,"/api/history?id="+song_id)[0]==403
    print("PASS: owner-only admin, disabled session/login denial, reset revocation, mandatory password change, no password disclosure, owner self-disable blocked")
    print("PASS: song revision conflict, attributed history, restore through normal save, anonymous history denied")
finally:
    db.execute("DELETE FROM song_history WHERE song_id=?", (song_id,))
    db.execute("DELETE FROM songs WHERE id=?", (song_id,))
    for table in tables:
        db.execute(f"DELETE FROM {table} WHERE username IN (?,?)",users)
        for row in saved[table]:
            db.execute(f"INSERT INTO {table} VALUES({','.join('?' for _ in row)})",row)
    db.execute("DELETE FROM editor_audit WHERE actor=? AND target=? AND created>=?",(*users,started))
    db.commit()
    db.close()

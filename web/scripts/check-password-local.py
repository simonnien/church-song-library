"""Exercise the local API; restore the test account's original credentials/sessions."""
import hashlib, http.cookiejar, json, secrets, sqlite3, urllib.request, urllib.error
from pathlib import Path

origin = "http://127.0.0.1:5173"
account = "beersheba10"
old = secrets.token_hex(16)
new = "中文密碼測試-" + secrets.token_hex(16)
db = None
for path in Path(".wrangler/state/v3/d1").rglob("*.sqlite"):
    connection = sqlite3.connect(path)
    if connection.execute("SELECT name FROM sqlite_master WHERE name='editor_passwords'").fetchone():
        db = connection
        break
    connection.close()
assert db is not None, "Apply local migrations first"
record = db.execute("SELECT * FROM editor_passwords WHERE username=?", (account,)).fetchall()
sessions = db.execute("SELECT * FROM editor_sessions WHERE username=?", (account,)).fetchall()
salt = secrets.token_hex(32)
stored = salt + ":" + hashlib.pbkdf2_hmac("sha256", old.encode(), salt.encode(), 100000).hex()

def client():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

def call(browser, path, data=None, origin_header=origin):
    headers = {"Origin": origin_header, "Content-Type": "application/json"}
    request = urllib.request.Request(origin + path, data=None if data is None else json.dumps(data).encode(), headers=headers)
    try:
        response = browser.open(request, timeout=60)
    except urllib.error.HTTPError as error:
        response = error
    body = response.read()
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        data = {}
    return response.status, data

try:
    db.execute("INSERT OR REPLACE INTO editor_passwords VALUES(?,?,?)", (account, stored, 0))
    db.commit()
    a, b, guest = client(), client(), client()
    assert call(guest, "/api/password", {"currentPassword": old, "newPassword": new})[0] == 401
    login = {"username": account, "password": old}
    assert call(a, "/api/session", login)[0] == 200
    assert call(b, "/api/session", login)[0] == 200
    assert call(a, "/api/password", {"currentPassword": old, "newPassword": new}, "https://invalid.example")[0] == 403
    assert call(a, "/api/password", {"currentPassword": "incorrect", "newPassword": new})[0] == 400
    assert call(a, "/api/password", {"currentPassword": old, "newPassword": "short"})[0] == 400
    assert call(a, "/api/password", {"currentPassword": old, "newPassword": new, "username": "beersheba09"})[0] == 200
    assert call(a, "/api/session")[1]["username"] is None
    assert call(b, "/api/session")[1]["username"] is None
    assert call(guest, "/api/session", login)[0] == 401
    assert call(guest, "/api/session", {"username": account, "password": new})[0] == 200
    saved = db.execute("SELECT password_hash FROM editor_passwords WHERE username=?", (account,)).fetchone()[0]
    assert new not in saved and saved != stored
    print("PASS: auth required, origin guard, current-password check, length, Unicode password, account isolation, old password rejection, all sessions revoked")
finally:
    db.execute("DELETE FROM editor_passwords WHERE username=?", (account,))
    db.executemany("INSERT INTO editor_passwords VALUES(?,?,?)", record)
    db.execute("DELETE FROM editor_sessions WHERE username=?", (account,))
    db.executemany("INSERT INTO editor_sessions VALUES(?,?,?)", sessions)
    db.commit()
    db.close()

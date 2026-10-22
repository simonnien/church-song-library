CREATE TABLE IF NOT EXISTS google_editors (email TEXT PRIMARY KEY, subject TEXT UNIQUE, disabled INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO google_editors(email) VALUES('simon930926@gmail.com');
CREATE TABLE IF NOT EXISTS google_oauth_states (state_hash TEXT PRIMARY KEY, verifier TEXT NOT NULL, expires INTEGER NOT NULL);

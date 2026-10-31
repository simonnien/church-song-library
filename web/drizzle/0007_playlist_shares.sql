CREATE TABLE IF NOT EXISTS playlist_shares (token_hash TEXT PRIMARY KEY, data TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS playlist_shares_expiry ON playlist_shares(expires);

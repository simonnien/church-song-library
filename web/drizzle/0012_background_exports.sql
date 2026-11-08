CREATE TABLE background_exports(event_id TEXT NOT NULL, background_id TEXT NOT NULL, exported_at INTEGER NOT NULL, PRIMARY KEY(event_id,background_id));
CREATE INDEX background_exports_time ON background_exports(exported_at);

CREATE TABLE song_index_pending (number INTEGER PRIMARY KEY, token TEXT NOT NULL);
CREATE TRIGGER song_index_add AFTER INSERT ON songs BEGIN
 INSERT OR REPLACE INTO song_index_pending VALUES(CAST(NEW.id AS INTEGER),lower(hex(randomblob(16))));
END;
CREATE TRIGGER song_index_remove AFTER DELETE ON songs BEGIN
 INSERT OR REPLACE INTO song_index_pending VALUES(CAST(OLD.id AS INTEGER),lower(hex(randomblob(16))));
END;
CREATE TRIGGER song_index_change AFTER UPDATE ON songs WHEN OLD.id<>NEW.id OR json_extract(OLD.data,'$.title') IS NOT json_extract(NEW.data,'$.title') BEGIN
 INSERT OR REPLACE INTO song_index_pending VALUES(CAST(OLD.id AS INTEGER),lower(hex(randomblob(16))));
 INSERT OR REPLACE INTO song_index_pending VALUES(CAST(NEW.id AS INTEGER),lower(hex(randomblob(16))));
END;

-- Explicit UPSERT remains valid when the outer song save also uses UPSERT.
DROP TRIGGER IF EXISTS song_index_add;
DROP TRIGGER IF EXISTS song_index_remove;
DROP TRIGGER IF EXISTS song_index_change;
CREATE TRIGGER song_index_add AFTER INSERT ON songs BEGIN
 INSERT INTO song_index_pending VALUES(CAST(NEW.id AS INTEGER),lower(hex(randomblob(16)))) ON CONFLICT(number) DO UPDATE SET token=excluded.token;
END;
CREATE TRIGGER song_index_remove AFTER DELETE ON songs BEGIN
 INSERT INTO song_index_pending VALUES(CAST(OLD.id AS INTEGER),lower(hex(randomblob(16)))) ON CONFLICT(number) DO UPDATE SET token=excluded.token;
END;
CREATE TRIGGER song_index_change AFTER UPDATE ON songs WHEN OLD.id<>NEW.id OR json_extract(OLD.data,'$.title') IS NOT json_extract(NEW.data,'$.title') BEGIN
 INSERT INTO song_index_pending VALUES(CAST(OLD.id AS INTEGER),lower(hex(randomblob(16)))) ON CONFLICT(number) DO UPDATE SET token=excluded.token;
 INSERT INTO song_index_pending VALUES(CAST(NEW.id AS INTEGER),lower(hex(randomblob(16)))) ON CONFLICT(number) DO UPDATE SET token=excluded.token;
END;

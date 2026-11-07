ALTER TABLE google_editors ADD COLUMN name TEXT NOT NULL DEFAULT '';
UPDATE google_editors SET name=label;
CREATE TABLE editor_groups (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL COLLATE NOCASE UNIQUE
);
CREATE TABLE editor_group_members (
 email TEXT NOT NULL REFERENCES google_editors(email) ON DELETE CASCADE,
 group_id INTEGER NOT NULL REFERENCES editor_groups(id) ON DELETE CASCADE,
 PRIMARY KEY(email,group_id)
);

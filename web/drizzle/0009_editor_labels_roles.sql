ALTER TABLE google_editors ADD COLUMN label TEXT NOT NULL DEFAULT '';
ALTER TABLE google_editors ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
UPDATE google_editors SET is_admin=1 WHERE email='simon930926@gmail.com';

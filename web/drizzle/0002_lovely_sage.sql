CREATE TABLE `editor_passwords` (
	`username` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`updated` integer NOT NULL
);

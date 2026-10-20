CREATE TABLE `editor_accounts` (
	`username` text PRIMARY KEY NOT NULL,
	`disabled` integer DEFAULT 0 NOT NULL,
	`must_change` integer DEFAULT 0 NOT NULL,
	`last_login` integer
);
--> statement-breakpoint
CREATE TABLE `editor_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `song_history` ADD `actor` text DEFAULT '' NOT NULL;
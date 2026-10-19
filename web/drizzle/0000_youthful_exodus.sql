CREATE TABLE `song_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`song_id` text NOT NULL,
	`data` text NOT NULL,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);

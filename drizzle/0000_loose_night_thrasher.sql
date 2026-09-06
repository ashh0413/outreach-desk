CREATE TABLE `deliveries` (
	`id` integer PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`message_id` text,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

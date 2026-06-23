CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_id` text NOT NULL,
	`share_code` text,
	`updated_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_share_code_unique` ON `groups` (`share_code`);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`group_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` text NOT NULL,
	PRIMARY KEY(`group_id`, `user_id`),
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `person_groups` (
	`person_id` integer NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`person_id`, `group_id`),
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `persons_name_unique` ON `persons` (`name`);
--> statement-breakpoint
ALTER TABLE `persons` ADD `created_by_user_id` text;
--> statement-breakpoint
ALTER TABLE `dips` ADD `group_id` text REFERENCES `groups`(`id`) ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE `dips` ADD `wind_speed` real;
--> statement-breakpoint
ALTER TABLE `dips` ADD `images` text;
--> statement-breakpoint
ALTER TABLE `dips` ADD `created_by_user_id` text;
--> statement-breakpoint
CREATE TABLE `saved_locations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` text,
	`name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`last_used_at` text NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);

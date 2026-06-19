CREATE TABLE `persons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location_name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`water_temp` real,
	`air_temp` real,
	`weather_description` text,
	`weather_icon` text,
	`dipped_at` text NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dip_participants` (
	`dip_id` integer NOT NULL,
	`person_id` integer NOT NULL,
	PRIMARY KEY(`dip_id`, `person_id`),
	FOREIGN KEY (`dip_id`) REFERENCES `dips`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `persons`(`id`) ON UPDATE no action ON DELETE cascade
);

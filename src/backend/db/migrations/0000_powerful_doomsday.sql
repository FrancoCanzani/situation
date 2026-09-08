CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`url_hash` text NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`raw_summary` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`sentiment` text DEFAULT 'neutral' NOT NULL,
	`keep` integer DEFAULT true NOT NULL,
	`published_at` integer NOT NULL,
	`ingested_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_unique` ON `articles` (`url`);--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_hash_unique` ON `articles` (`url_hash`);
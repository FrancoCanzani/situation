PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`raw_summary` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'world' NOT NULL,
	`sentiment` text DEFAULT 'neutral' NOT NULL,
	`importance` integer,
	`tickers` text DEFAULT '[]' NOT NULL,
	`keep` integer DEFAULT true NOT NULL,
	`event_id` text,
	`published_at` integer NOT NULL,
	`ingested_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_articles`("id", "url", "source", "title", "raw_summary", "summary", "category", "sentiment", "importance", "tickers", "keep", "event_id", "published_at", "ingested_at") SELECT "id", "url", "source", "title", "raw_summary", "summary", "category", "sentiment", "importance", "tickers", "keep", "event_id", "published_at", "ingested_at" FROM `articles`;--> statement-breakpoint
DROP TABLE `articles`;--> statement-breakpoint
ALTER TABLE `__new_articles` RENAME TO `articles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_unique` ON `articles` (`url`);
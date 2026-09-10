DROP INDEX `articles_url_hash_unique`;--> statement-breakpoint
ALTER TABLE `articles` ADD `tickers` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `url_hash`;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `companies`;
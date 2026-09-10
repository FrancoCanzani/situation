ALTER TABLE `articles` ADD `importance` integer;--> statement-breakpoint
ALTER TABLE `articles` ADD `tickers` text DEFAULT '[]' NOT NULL;

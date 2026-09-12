DROP INDEX IF EXISTS `articles_url_hash_unique`;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `url_hash`;

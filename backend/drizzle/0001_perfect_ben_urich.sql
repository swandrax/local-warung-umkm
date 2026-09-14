ALTER TABLE `mitra_profiles` ADD `short_description` text;--> statement-breakpoint
ALTER TABLE `mitra_profiles` ADD `cover_image` text;--> statement-breakpoint
ALTER TABLE `mitra_profiles` ADD `contact_label` text;--> statement-breakpoint
ALTER TABLE `mitra_profiles` ADD `contact_url` text;--> statement-breakpoint
ALTER TABLE `mitra_profiles` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `mitra_status_idx` ON `mitra_profiles` (`status`);--> statement-breakpoint
CREATE INDEX `mitra_public_idx` ON `mitra_profiles` (`is_public`);--> statement-breakpoint
ALTER TABLE `partnerships` ADD `short_description` text;--> statement-breakpoint
ALTER TABLE `partnerships` ADD `image` text;--> statement-breakpoint
ALTER TABLE `partnerships` ADD `contact_label` text;--> statement-breakpoint
ALTER TABLE `partnerships` ADD `contact_url` text;--> statement-breakpoint
ALTER TABLE `partnerships` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `partnership_status_idx` ON `partnerships` (`status`);--> statement-breakpoint
CREATE INDEX `partnership_public_idx` ON `partnerships` (`is_public`);--> statement-breakpoint
CREATE INDEX `product_mitra_idx` ON `products` (`mitra_id`);--> statement-breakpoint
CREATE INDEX `product_status_idx` ON `products` (`status`);--> statement-breakpoint
CREATE INDEX `product_category_idx` ON `products` (`category`);
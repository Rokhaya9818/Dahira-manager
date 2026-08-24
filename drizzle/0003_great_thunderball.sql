CREATE TABLE `webPushSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicKey` text NOT NULL,
	`privateKey` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webPushSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webPushSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webPushSubscriptions_id` PRIMARY KEY(`id`)
);

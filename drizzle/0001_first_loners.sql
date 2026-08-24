CREATE TABLE `memberAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`secretHash` varchar(255) NOT NULL,
	`role` enum('admin','treasurer','member') NOT NULL DEFAULT 'member',
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`approvedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberAccounts_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `memberSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountId` int NOT NULL,
	`tokenHash` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberSessions_tokenHash_unique` UNIQUE(`tokenHash`)
);

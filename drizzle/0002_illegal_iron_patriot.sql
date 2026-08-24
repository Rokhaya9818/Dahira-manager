CREATE TABLE `attendanceRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberAccountId` int NOT NULL,
	`eventDate` timestamp NOT NULL,
	`checkedInAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendanceRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberAccountId` int NOT NULL,
	`period` varchar(32) NOT NULL,
	`expectedAmount` int NOT NULL,
	`paidAmount` int NOT NULL DEFAULT 0,
	`status` enum('paid','pending','late') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goudiEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduledFor` timestamp NOT NULL,
	`organizerAccountId` int,
	`contributionExpected` int NOT NULL DEFAULT 10000,
	`status` enum('proposed','confirmed','completed') NOT NULL DEFAULT 'proposed',
	`createdByAccountId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goudiEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasuryTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` enum('income','expense') NOT NULL,
	`category` varchar(80) NOT NULL,
	`amount` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`createdByAccountId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasuryTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `memberAccounts` ADD `responsibility` varchar(120) DEFAULT 'Membre actif' NOT NULL;--> statement-breakpoint
ALTER TABLE `memberAccounts` ADD `active` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `memberAccounts` ADD `rotationIndex` int DEFAULT 0 NOT NULL;
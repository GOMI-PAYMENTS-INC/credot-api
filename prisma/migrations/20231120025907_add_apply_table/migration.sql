-- AlterTable
ALTER TABLE `Bond` ADD COLUMN `applyId` INTEGER NULL;

-- AlterTable
ALTER TABLE `BondDeposit` ADD COLUMN `applyId` INTEGER NULL;

-- AlterTable
ALTER TABLE `CardInfos` ADD COLUMN `applyId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Crawling` ADD COLUMN `applyId` INTEGER NULL;

-- AlterTable
ALTER TABLE `CrawlingInfo` ADD COLUMN `applyId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Prefund` ADD COLUMN `applyId` INTEGER NULL;

-- AlterTable
ALTER TABLE `PrefundByCard` ADD COLUMN `applyId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Apply` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `email` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `companyName` VARCHAR(191) NULL,
    `prefund` VARCHAR(191) NULL,
    `userId` INTEGER NULL,

    UNIQUE INDEX `Apply_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Apply` ADD CONSTRAINT `Apply_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

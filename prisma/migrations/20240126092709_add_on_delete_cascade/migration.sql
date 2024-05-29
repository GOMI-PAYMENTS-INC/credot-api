-- DropForeignKey
ALTER TABLE `Bond` DROP FOREIGN KEY `Bond_userId_fkey`;

-- DropForeignKey
ALTER TABLE `BondDeposit` DROP FOREIGN KEY `BondDeposit_userId_fkey`;

-- DropForeignKey
ALTER TABLE `CardInfos` DROP FOREIGN KEY `CardInfos_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Crawling` DROP FOREIGN KEY `Crawling_userId_fkey`;

-- DropForeignKey
ALTER TABLE `CrawlingInfo` DROP FOREIGN KEY `CrawlingInfo_userId_fkey`;

-- DropForeignKey
ALTER TABLE `FutureFund` DROP FOREIGN KEY `FutureFund_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Prefund` DROP FOREIGN KEY `Prefund_bondId_fkey`;

-- DropForeignKey
ALTER TABLE `Prefund` DROP FOREIGN KEY `Prefund_prefundByCardId_fkey`;

-- DropForeignKey
ALTER TABLE `Prefund` DROP FOREIGN KEY `Prefund_userId_fkey`;

-- DropForeignKey
ALTER TABLE `PrefundByCard` DROP FOREIGN KEY `PrefundByCard_userId_fkey`;

-- AddForeignKey
ALTER TABLE `Crawling` ADD CONSTRAINT `Crawling_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrawlingInfo` ADD CONSTRAINT `CrawlingInfo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PrefundByCard` ADD CONSTRAINT `PrefundByCard_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FutureFund` ADD CONSTRAINT `FutureFund_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prefund` ADD CONSTRAINT `Prefund_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prefund` ADD CONSTRAINT `Prefund_bondId_fkey` FOREIGN KEY (`bondId`) REFERENCES `Bond`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prefund` ADD CONSTRAINT `Prefund_prefundByCardId_fkey` FOREIGN KEY (`prefundByCardId`) REFERENCES `PrefundByCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BondDeposit` ADD CONSTRAINT `BondDeposit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bond` ADD CONSTRAINT `Bond_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CardInfos` ADD CONSTRAINT `CardInfos_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Crawling` ADD COLUMN `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `CrawlingInfo` ADD COLUMN `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Crawling` ADD CONSTRAINT `Crawling_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CrawlingInfo` ADD CONSTRAINT `CrawlingInfo_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

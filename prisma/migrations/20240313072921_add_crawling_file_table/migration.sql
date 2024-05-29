-- CreateTable
CREATE TABLE `CrawlingFiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `type` ENUM('RECORD', 'EXCEL') NULL,
    `url` VARCHAR(191) NULL,
    `crawlingId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CrawlingFiles` ADD CONSTRAINT `CrawlingFiles_crawlingId_fkey` FOREIGN KEY (`crawlingId`) REFERENCES `Crawling`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

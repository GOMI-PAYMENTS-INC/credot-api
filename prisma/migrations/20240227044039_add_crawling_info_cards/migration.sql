-- CreateTable
CREATE TABLE `CrawlingInfoCards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cardCompanyName` ENUM('BC_CARD', 'KB_CARD', 'HANA_CARD', 'HYUNDAE_CARD', 'SHINHAN_CARD', 'SAMSUNG_CARD', 'NH_CARD', 'LOTTE_CARD', 'HDO_CARD', 'CREDIT_CARD') NULL,
    `franchiseNumber` VARCHAR(191) NULL,
    `crawlingInfoId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CrawlingInfoCards` ADD CONSTRAINT `CrawlingInfoCards_crawlingInfoId_fkey` FOREIGN KEY (`crawlingInfoId`) REFERENCES `CrawlingInfo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

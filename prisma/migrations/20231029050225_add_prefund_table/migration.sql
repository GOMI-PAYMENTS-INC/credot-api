-- CreateTable
CREATE TABLE `Prefund` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bondId` INTEGER NOT NULL,
    `prefundGroupAt` VARCHAR(191) NOT NULL,
    `status` ENUM('READY', 'DONE') NOT NULL DEFAULT 'READY',
    `prefundAt` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NOT NULL,
    `cardCompanyName` VARCHAR(191) NULL,
    `salesPrice` INTEGER NOT NULL DEFAULT 0,
    `cardCommission` INTEGER NOT NULL DEFAULT 0,
    `serviceCommission` INTEGER NOT NULL DEFAULT 0,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Prefund` ADD CONSTRAINT `Prefund_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prefund` ADD CONSTRAINT `Prefund_bondId_fkey` FOREIGN KEY (`bondId`) REFERENCES `Bond`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

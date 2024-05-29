-- CreateTable
CREATE TABLE `FutureFundApply` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applyAt` VARCHAR(191) NOT NULL,
    `rejectReason` VARCHAR(191) NULL,
    `status` ENUM('READY', 'DONE', 'REJECT') NOT NULL,
    `limit` INTEGER NOT NULL DEFAULT 0,
    `futureFundPrice` INTEGER NOT NULL DEFAULT 0,
    `applyPrice` INTEGER NOT NULL DEFAULT 0,
    `avgSalesPrice` INTEGER NOT NULL DEFAULT 0,
    `count` INTEGER NOT NULL DEFAULT 0,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FutureFundApply` ADD CONSTRAINT `FutureFundApply_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
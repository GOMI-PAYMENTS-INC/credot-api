-- CreateTable
CREATE TABLE `CardClassification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cardNumber` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT', 'CHECK') NOT NULL DEFAULT 'CREDIT',

    UNIQUE INDEX `CardClassification_cardNumber_type_key`(`cardNumber`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

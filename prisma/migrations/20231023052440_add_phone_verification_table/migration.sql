-- CreateTable
CREATE TABLE `PhoneVerification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `phoneNumber` VARCHAR(255) NOT NULL,
    `code` VARCHAR(255) NOT NULL,
    `expiredAt` DATETIME(3) NOT NULL,
    `validatedAt` DATETIME(3) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BondDeposit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `transactionAt` DATETIME(3) NULL,
    `affiliateStoreNumber` VARCHAR(191) NULL,
    `cardNumber` VARCHAR(191) NULL,
    `cardCompanyName` VARCHAR(191) NULL,
    `cardType` ENUM('CREDIT', 'CHECK') NULL,
    `approvalType` ENUM('APPROVED', 'CANCEL') NULL,
    `approvalNumber` VARCHAR(191) NULL,
    `approvalAmount` INTEGER NOT NULL DEFAULT 0,
    `claimingResult` VARCHAR(191) NULL,
    `claimingAt` VARCHAR(191) NULL,
    `installmentPeriod` VARCHAR(191) NULL,
    `vat` INTEGER NOT NULL DEFAULT 0,
    `commission` INTEGER NOT NULL DEFAULT 0,
    `depositAt` VARCHAR(191) NULL,
    `depositAmount` INTEGER NOT NULL DEFAULT 0,
    `terminalNumber` VARCHAR(191) NULL,
    `terminalName` VARCHAR(191) NULL,
    `vanType` ENUM('KICC') NOT NULL DEFAULT 'KICC',
    `userId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BondDeposit` ADD CONSTRAINT `BondDeposit_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

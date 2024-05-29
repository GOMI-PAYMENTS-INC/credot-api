-- AlterTable
ALTER TABLE `Bond` MODIFY `cardType` ENUM('CREDIT', 'CHECK', 'GIFT') NULL;

-- AlterTable
ALTER TABLE `BondDeposit` MODIFY `cardType` ENUM('CREDIT', 'CHECK', 'GIFT') NULL;

-- AlterTable
ALTER TABLE `CardClassification` MODIFY `type` ENUM('CREDIT', 'CHECK', 'GIFT') NOT NULL DEFAULT 'CREDIT';

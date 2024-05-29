-- AlterTable
ALTER TABLE `Bond` MODIFY `transactionAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Prefund` ADD COLUMN `transactionAt` DATETIME(3) NULL;

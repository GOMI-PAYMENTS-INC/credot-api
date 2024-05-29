-- DropForeignKey
ALTER TABLE `FutureFund` DROP FOREIGN KEY `FutureFund_prefundByCardId_fkey`;

-- AddForeignKey
ALTER TABLE `FutureFund` ADD CONSTRAINT `FutureFund_prefundByCardId_fkey` FOREIGN KEY (`prefundByCardId`) REFERENCES `PrefundByCard`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

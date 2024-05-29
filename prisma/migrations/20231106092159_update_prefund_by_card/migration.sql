/*
  Warnings:

  - A unique constraint covering the columns `[userId,cardCompanyName,prefundGroupAt,salesGroupAt]` on the table `PrefundByCard` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `PrefundByCard` ADD COLUMN `cardSettlementGroupAt` VARCHAR(191) NULL,
    ADD COLUMN `depositAt` VARCHAR(191) NULL,
    ADD COLUMN `salesGroupAt` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `PrefundByCard_userId_cardCompanyName_prefundGroupAt_salesGro_key` ON `PrefundByCard`(`userId`, `cardCompanyName`, `prefundGroupAt`, `salesGroupAt`);

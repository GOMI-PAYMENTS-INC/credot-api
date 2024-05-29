/*
  Warnings:

  - A unique constraint covering the columns `[userId,type,cardCompanyName]` on the table `CardInfos` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `CardInfos_type_cardCompanyName_key` ON `CardInfos`;

-- CreateIndex
CREATE UNIQUE INDEX `CardInfos_userId_type_cardCompanyName_key` ON `CardInfos`(`userId`, `type`, `cardCompanyName`);

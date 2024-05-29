/*
  Warnings:

  - A unique constraint covering the columns `[type,cardCompanyName]` on the table `CardInfos` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `CardInfos_type_cardCompanyName_key` ON `CardInfos`(`type`, `cardCompanyName`);

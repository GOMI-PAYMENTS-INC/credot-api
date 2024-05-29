/*
  Warnings:

  - You are about to alter the column `cardCompanyName` on the `Bond` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(10))`.
  - You are about to alter the column `cardCompanyName` on the `BondDeposit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(10))`.
  - You are about to alter the column `cardCompanyName` on the `Prefund` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(10))`.

*/
-- AlterTable
ALTER TABLE `Bond` MODIFY `cardCompanyName` ENUM('BC_CARD', 'KB_CARD', 'HANA_CARD', 'HUNDAE_CARD', 'SHINHAN_CARD', 'SAMSUNG_CARD', 'NH_CARD', 'LOTTE_CARD', 'HDO_CARD') NULL;

-- AlterTable
ALTER TABLE `BondDeposit` MODIFY `cardCompanyName` ENUM('BC_CARD', 'KB_CARD', 'HANA_CARD', 'HUNDAE_CARD', 'SHINHAN_CARD', 'SAMSUNG_CARD', 'NH_CARD', 'LOTTE_CARD', 'HDO_CARD') NULL;

-- AlterTable
ALTER TABLE `Prefund` MODIFY `cardCompanyName` ENUM('BC_CARD', 'KB_CARD', 'HANA_CARD', 'HUNDAE_CARD', 'SHINHAN_CARD', 'SAMSUNG_CARD', 'NH_CARD', 'LOTTE_CARD', 'HDO_CARD') NULL;

/*
  Warnings:

  - The values [HUNDAE_CARD] on the enum `Bond_cardCompanyName` will be removed. If these variants are still used in the database, this will fail.
  - The values [HUNDAE_CARD] on the enum `Bond_cardCompanyName` will be removed. If these variants are still used in the database, this will fail.
  - The values [HUNDAE_CARD] on the enum `Bond_cardCompanyName` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Bond` MODIFY `cardCompanyName` ENUM('BC_CARD', 'KB_CARD', 'HANA_CARD', 'HYUNDAE_CARD', 'SHINHAN_CARD', 'SAMSUNG_CARD', 'NH_CARD', 'LOTTE_CARD', 'HDO_CARD') NULL;

-- AlterTable
ALTER TABLE `BondDeposit` MODIFY `cardCompanyName` ENUM('BC_CARD', 'KB_CARD', 'HANA_CARD', 'HYUNDAE_CARD', 'SHINHAN_CARD', 'SAMSUNG_CARD', 'NH_CARD', 'LOTTE_CARD', 'HDO_CARD') NULL;

-- AlterTable
ALTER TABLE `Prefund` MODIFY `cardCompanyName` ENUM('BC_CARD', 'KB_CARD', 'HANA_CARD', 'HYUNDAE_CARD', 'SHINHAN_CARD', 'SAMSUNG_CARD', 'NH_CARD', 'LOTTE_CARD', 'HDO_CARD') NULL;

/*
  Warnings:

  - You are about to drop the column `futureFundServiceFee` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `User` DROP COLUMN `futureFundServiceFee`,
    ADD COLUMN `futureFundServiceFeeRate` DECIMAL(5, 4) NOT NULL DEFAULT 0.0000;

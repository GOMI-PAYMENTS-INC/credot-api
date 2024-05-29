/*
  Warnings:

  - Made the column `transactionAt` on table `Bond` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Bond` MODIFY `transactionAt` DATETIME(3) NOT NULL;

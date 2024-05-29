/*
  Warnings:

  - A unique constraint covering the columns `[transactionId,userId]` on the table `Prefund` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Prefund_transactionId_userId_key` ON `Prefund`(`transactionId`, `userId`);

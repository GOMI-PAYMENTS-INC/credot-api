/*
  Warnings:

  - A unique constraint covering the columns `[transactionId,userId]` on the table `Bond` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Bond_transactionId_key` ON `Bond`;

-- CreateIndex
CREATE UNIQUE INDEX `Bond_transactionId_userId_key` ON `Bond`(`transactionId`, `userId`);

/*
  Warnings:

  - A unique constraint covering the columns `[approvalType,approvalAmount]` on the table `Bond` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Bond_approvalNumber_key` ON `Bond`;

-- CreateIndex
CREATE UNIQUE INDEX `Bond_approvalType_approvalAmount_key` ON `Bond`(`approvalType`, `approvalAmount`);

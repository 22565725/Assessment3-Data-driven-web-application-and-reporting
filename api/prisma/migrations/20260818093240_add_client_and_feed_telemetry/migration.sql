-- AlterTable
ALTER TABLE "request_logs" ADD COLUMN "clientId" TEXT;
ALTER TABLE "request_logs" ADD COLUMN "feedId" INTEGER;

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bucketStart" DATETIME NOT NULL,
    "requests" INTEGER NOT NULL,
    "errors" INTEGER NOT NULL,
    "uniqueClients" INTEGER NOT NULL,
    "avgDurationMs" INTEGER,
    "feedCount" INTEGER NOT NULL,
    "postCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_bucketStart_key" ON "metric_snapshots"("bucketStart");

-- CreateIndex
CREATE INDEX "metric_snapshots_bucketStart_idx" ON "metric_snapshots"("bucketStart");

-- CreateIndex
CREATE INDEX "request_logs_clientId_idx" ON "request_logs"("clientId");

-- CreateIndex
CREATE INDEX "request_logs_feedId_idx" ON "request_logs"("feedId");

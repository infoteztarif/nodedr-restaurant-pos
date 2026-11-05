ALTER TABLE "orders" ADD COLUMN "trackingToken" TEXT;
CREATE UNIQUE INDEX "orders_trackingToken_key" ON "orders"("trackingToken");


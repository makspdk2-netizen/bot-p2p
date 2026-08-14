-- Non-destructive: attribute partner earnings to a referred user and a payment request.
-- Unique payment_request_id prevents double referral credit for the same completed request.

ALTER TABLE "partner_earnings" ADD COLUMN "referred_id" BIGINT;
ALTER TABLE "partner_earnings" ADD COLUMN "payment_request_id" BIGINT;

CREATE UNIQUE INDEX "partner_earnings_payment_request_id_key" ON "partner_earnings"("payment_request_id");
CREATE INDEX "partner_earnings_user_id_referred_id_idx" ON "partner_earnings"("user_id", "referred_id");

ALTER TABLE "partner_earnings" ADD CONSTRAINT "partner_earnings_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partner_earnings" ADD CONSTRAINT "partner_earnings_payment_request_id_fkey" FOREIGN KEY ("payment_request_id") REFERENCES "payment_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

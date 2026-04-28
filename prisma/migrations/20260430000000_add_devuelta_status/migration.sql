-- =============================================================================
-- The dist's reject step now branches: the tire either goes to fin-de-vida
-- (existing `rechazada`) OR is returned to the fleet's Disponible bucket
-- because it's still usable just not retreadable for this job. New enum
-- value captures that second path.
-- =============================================================================

ALTER TYPE "PurchaseOrderItemStatus" ADD VALUE IF NOT EXISTS 'devuelta';

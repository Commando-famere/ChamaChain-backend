-- Add 'cancelled' to transaction_status enum
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'cancelled';

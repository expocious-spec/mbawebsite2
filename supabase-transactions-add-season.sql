-- Add season_id to transactions table and clear all existing data

-- Add season_id column to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS season_id BIGINT REFERENCES public.seasons(id) ON DELETE SET NULL;

-- Add index for season filtering
CREATE INDEX IF NOT EXISTS idx_transactions_season_id ON public.transactions(season_id);

-- Clear all existing transactions
DELETE FROM public.transactions;

-- Clear all existing contract offers
DELETE FROM public.contract_offers;

-- Add comment
COMMENT ON COLUMN public.transactions.season_id IS 'The season when this transaction occurred';

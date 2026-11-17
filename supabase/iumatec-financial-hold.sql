ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS financial_hold
BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_financial_hold_zero_stock_chk'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_financial_hold_zero_stock_chk
    CHECK (
      NOT financial_hold OR
      (COALESCE(stock_qty = 0, FALSE) AND in_stock IS FALSE)
    );
  END IF;
END $$;
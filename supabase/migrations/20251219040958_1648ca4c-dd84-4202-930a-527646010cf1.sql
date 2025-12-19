-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION public.generate_invoice_no(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  result := prefix || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN result;
END;
$$;
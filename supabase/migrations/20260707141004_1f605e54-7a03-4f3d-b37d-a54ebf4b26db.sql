
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'MAD',
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS invoice_prefix text NOT NULL DEFAULT 'FAC',
  ADD COLUMN IF NOT EXISTS invoice_number_format text NOT NULL DEFAULT '{PREFIX}-{YYYY}-{####}',
  ADD COLUMN IF NOT EXISTS invoice_next_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invoice_header text,
  ADD COLUMN IF NOT EXISTS invoice_footer text,
  ADD COLUMN IF NOT EXISTS bank_details text,
  ADD COLUMN IF NOT EXISTS stamp_url text;

CREATE OR REPLACE FUNCTION public.next_invoice_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_format text;
  n int;
  formatted text;
BEGIN
  UPDATE public.tenants
     SET invoice_next_number = invoice_next_number + 1
   WHERE id = _tenant_id
   RETURNING invoice_next_number - 1, invoice_prefix, invoice_number_format
     INTO n, v_prefix, v_format;

  IF n IS NULL THEN
    RAISE EXCEPTION 'Tenant not found: %', _tenant_id;
  END IF;

  formatted := coalesce(v_format, '{PREFIX}-{YYYY}-{####}');
  formatted := replace(formatted, '{PREFIX}',  coalesce(v_prefix, 'FAC'));
  formatted := replace(formatted, '{YYYY}',    to_char(now(), 'YYYY'));
  formatted := replace(formatted, '{YY}',      to_char(now(), 'YY'));
  formatted := replace(formatted, '{MM}',      to_char(now(), 'MM'));
  formatted := replace(formatted, '{#####}',   lpad(n::text, 5, '0'));
  formatted := replace(formatted, '{####}',    lpad(n::text, 4, '0'));
  formatted := replace(formatted, '{###}',     lpad(n::text, 3, '0'));
  RETURN formatted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO authenticated;

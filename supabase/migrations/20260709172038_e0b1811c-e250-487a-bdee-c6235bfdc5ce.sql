-- new enum for trip scope
DO $$ BEGIN
  CREATE TYPE public.trip_scope AS ENUM ('local','national','international');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.transport_orders
  ADD COLUMN IF NOT EXISTS scope public.trip_scope,
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS origin_city text,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS destination_city text;

ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS scope public.trip_scope,
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS origin_city text,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS destination_city text;

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS scope public.trip_scope,
  ADD COLUMN IF NOT EXISTS origin_country text,
  ADD COLUMN IF NOT EXISTS origin_city text,
  ADD COLUMN IF NOT EXISTS destination_country text,
  ADD COLUMN IF NOT EXISTS destination_city text;
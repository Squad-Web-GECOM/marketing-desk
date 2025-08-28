-- Fix function search path security issues
CREATE OR REPLACE FUNCTION is_weekday(check_date DATE) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
IMMUTABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXTRACT(DOW FROM check_date) BETWEEN 1 AND 5;
END;
$$;

CREATE OR REPLACE FUNCTION is_valid_booking_date(check_date DATE) 
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_brazil DATE;
  max_date DATE;
BEGIN
  -- Get current date in Brazil timezone
  today_brazil := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  max_date := today_brazil + INTERVAL '7 days';
  
  RETURN check_date >= today_brazil AND check_date <= max_date;
END;
$$;

CREATE OR REPLACE FUNCTION validate_booking_date()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_valid_booking_date(NEW.date) THEN
    RAISE EXCEPTION 'Data deve estar entre hoje e 7 dias à frente';
  END IF;
  RETURN NEW;
END;
$$;

-- Enable RLS on tables (as noted this is for future security, MVP will use anon key directly)
ALTER TABLE public.desks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for MVP (will be tightened in future)
CREATE POLICY "Allow all operations on desks for MVP" ON public.desks FOR ALL USING (true);
CREATE POLICY "Allow all operations on reservations for MVP" ON public.reservations FOR ALL USING (true);
-- Create desks table
CREATE TABLE public.desks (
  id SERIAL PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  specs JSONB DEFAULT NULL
);

-- Create reservations table
CREATE TABLE public.reservations (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  desk_number INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_at TIMESTAMPTZ DEFAULT NULL,
  canceled_by TEXT DEFAULT NULL,
  FOREIGN KEY (desk_number) REFERENCES public.desks(number)
);

-- Create function to check if date is weekday
CREATE OR REPLACE FUNCTION is_weekday(check_date DATE) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXTRACT(DOW FROM check_date) BETWEEN 1 AND 5;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check if date is within valid booking window
CREATE OR REPLACE FUNCTION is_valid_booking_date(check_date DATE) 
RETURNS BOOLEAN AS $$
DECLARE
  today_brazil DATE;
  max_date DATE;
BEGIN
  -- Get current date in Brazil timezone
  today_brazil := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  max_date := today_brazil + INTERVAL '7 days';
  
  RETURN check_date >= today_brazil AND check_date <= max_date;
END;
$$ LANGUAGE plpgsql;

-- Add constraints to reservations table
ALTER TABLE public.reservations 
ADD CONSTRAINT check_weekday 
CHECK (is_weekday(date));

-- Create unique constraint for one active reservation per desk per day
CREATE UNIQUE INDEX idx_active_desk_reservation 
ON public.reservations (date, desk_number) 
WHERE canceled_at IS NULL;

-- Create unique constraint for one active reservation per user per day
CREATE UNIQUE INDEX idx_active_user_reservation 
ON public.reservations (date, user_id) 
WHERE canceled_at IS NULL;

-- Create trigger function to validate booking date
CREATE OR REPLACE FUNCTION validate_booking_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_valid_booking_date(NEW.date) THEN
    RAISE EXCEPTION 'Data deve estar entre hoje e 7 dias à frente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_validate_booking_date
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_date();

-- Insert initial desks (1 to 22)
INSERT INTO public.desks (number, is_active) 
SELECT generate_series(1, 22), true;
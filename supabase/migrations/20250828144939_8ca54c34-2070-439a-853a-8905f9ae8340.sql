-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on reservations for MVP" ON public.reservations;

-- Create secure RLS policies for reservations
-- Policy 1: Users can insert their own reservations
CREATE POLICY "Users can insert their own reservations" 
ON public.reservations 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Policy 2: Users can view and update only their own reservations
CREATE POLICY "Users can view their own reservations" 
ON public.reservations 
FOR SELECT 
USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Policy 3: Users can update only their own reservations
CREATE POLICY "Users can update their own reservations" 
ON public.reservations 
FOR UPDATE 
USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Policy 4: Users can delete only their own reservations
CREATE POLICY "Users can delete their own reservations" 
ON public.reservations 
FOR DELETE 
USING (auth.uid()::text = user_id OR user_id = current_setting('request.jwt.claims', true)::json->>'email');

-- Create a function to get desk availability without exposing personal data
CREATE OR REPLACE FUNCTION public.get_desk_availability(check_date date)
RETURNS TABLE (
  desk_number integer,
  is_occupied boolean,
  is_my_reservation boolean,
  reservation_id bigint,
  user_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id text;
BEGIN
  -- Get current user ID (email)
  current_user_id := current_setting('request.jwt.claims', true)::json->>'email';
  
  -- If no authenticated user, return only desk numbers and occupancy
  IF current_user_id IS NULL THEN
    RETURN QUERY
    SELECT 
      d.number as desk_number,
      (r.id IS NOT NULL) as is_occupied,
      false as is_my_reservation,
      NULL::bigint as reservation_id,
      NULL::text as user_name
    FROM desks d
    LEFT JOIN reservations r ON r.desk_number = d.number 
      AND r.date = check_date 
      AND r.canceled_at IS NULL
    WHERE d.is_active = true
    ORDER BY d.number;
  ELSE
    -- For authenticated users, show personal info only for their own reservations
    RETURN QUERY
    SELECT 
      d.number as desk_number,
      (r.id IS NOT NULL) as is_occupied,
      (r.user_id = current_user_id) as is_my_reservation,
      CASE 
        WHEN r.user_id = current_user_id THEN r.id
        ELSE NULL
      END as reservation_id,
      CASE 
        WHEN r.user_id = current_user_id THEN r.user_name
        ELSE NULL
      END as user_name
    FROM desks d
    LEFT JOIN reservations r ON r.desk_number = d.number 
      AND r.date = check_date 
      AND r.canceled_at IS NULL
    WHERE d.is_active = true
    ORDER BY d.number;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_desk_availability(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_desk_availability(date) TO anon;
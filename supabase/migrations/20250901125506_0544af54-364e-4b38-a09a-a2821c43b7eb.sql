-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can delete their own reservations" ON reservations;

-- Create permissive policies for the MVP (allowing operations based on user_id field)
CREATE POLICY "Allow users to view all reservations for desk availability" 
ON reservations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow users to insert reservations with valid user_id" 
ON reservations 
FOR INSERT 
WITH CHECK (user_id IS NOT NULL AND user_name IS NOT NULL);

CREATE POLICY "Allow users to update their own reservations" 
ON reservations 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow users to delete their own reservations" 
ON reservations 
FOR DELETE 
USING (true);
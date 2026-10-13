/*
  # Fix booking deletion policies

  1. Changes
    - Drop existing policies for booking deletion
    - Create new policies with explicit table references
    - Update RLS policies to handle user and admin deletion properly

  2. Security
    - Maintains existing security model
    - Fixes ambiguous column references
    - Ensures proper access control
*/

-- Drop existing deletion policies
DROP POLICY IF EXISTS "Users can delete their own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete any booking" ON bookings;

-- Create new deletion policy for users
CREATE POLICY "Users can delete their own bookings"
ON bookings
FOR DELETE
TO authenticated
USING (
  auth.uid() = bookings.user_id
);

-- Create new deletion policy for admins
CREATE POLICY "Admins can delete any booking"
ON bookings
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM admins 
    WHERE admins.user_id = auth.uid()
  )
);

-- Add comment to document the policies
COMMENT ON POLICY "Users can delete their own bookings" ON bookings IS 
  'Users can only delete their own bookings';
COMMENT ON POLICY "Admins can delete any booking" ON bookings IS 
  'Admins can delete any booking';
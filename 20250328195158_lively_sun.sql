/*
  # Fix admin policies to avoid recursion

  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies for admins table
    - Update booking policies to use direct user check
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Admins can view admin list" ON admins;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;

-- Create new admin policies without recursion
CREATE POLICY "Enable read access for authenticated users"
  ON admins
  FOR SELECT
  TO authenticated
  USING (true);

-- Update booking policies to use direct user check
CREATE POLICY "Admins can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
  ));

CREATE POLICY "Admins can delete any booking"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
  ));

CREATE POLICY "Admins can update any booking"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admins
    WHERE admins.user_id = auth.uid()
  ));
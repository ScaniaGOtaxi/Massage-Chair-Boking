/*
  # Improve admin role security

  1. Changes
    - Add RLS policies for admins table
    - Add function to check admin status
    - Add policies for admin operations on bookings table

  2. Security
    - Enable RLS on admins table
    - Add policies to restrict admin table access
    - Add function to verify admin status
    - Update booking policies to use admin check function
*/

-- Enable RLS on admins table if not already enabled
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admins
    WHERE admins.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for admins table
CREATE POLICY "Admins can view all admin records"
  ON admins
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Only super admins can insert admin records"
  ON admins
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only super admins can delete admin records"
  ON admins
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Update booking policies to use admin check function
DROP POLICY IF EXISTS "Admins can delete any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

CREATE POLICY "Admins can delete any booking"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update any booking"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add comment to document admin function
COMMENT ON FUNCTION is_admin IS 'Checks if a user has admin privileges';
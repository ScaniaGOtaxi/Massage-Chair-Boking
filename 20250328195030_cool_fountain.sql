/*
  # Add admin role and policies

  1. New Tables
    - `admins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `admins` table
    - Add policies for admin access
    - Update booking policies to allow admin actions
*/

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Admin table policies
CREATE POLICY "Admins can view admin list"
  ON admins
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

-- Update booking policies to allow admin actions
CREATE POLICY "Admins can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

CREATE POLICY "Admins can delete any booking"
  ON bookings
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );

CREATE POLICY "Admins can update any booking"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT user_id FROM admins)
  );
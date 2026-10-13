/*
  # Add Super Admin functionality

  1. New Tables
    - `super_admins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on super_admins table
    - Add policies for super admin access
    - Add function to check super admin status
    - Update admin policies to allow super admin control

  3. Initial Data
    - Ensure user exists in users table with required fields
    - Add piotr.zdeb@scania.com as both admin and super admin
*/

-- First ensure the user exists in the users table
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'piotr.zdeb@scania.com';
BEGIN
  -- Get the user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  -- If user exists in auth.users but not in public.users, create the record
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, created_at, nickname)
    SELECT 
      v_user_id, 
      v_email, 
      COALESCE((SELECT created_at FROM auth.users WHERE id = v_user_id), now()),
      'Piotr'  -- Set a default nickname
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT super_admins_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Create function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM super_admins
    WHERE super_admins.user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create policies for super_admins table
CREATE POLICY "Super admins can view all super admin records"
  ON super_admins
  FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert super admin records"
  ON super_admins
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete super admin records"
  ON super_admins
  FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Update admin policies to allow super admin control
CREATE POLICY "Super admins can manage admins"
  ON admins
  FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Add initial super admin
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user ID for the email
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'piotr.zdeb@scania.com';

  -- If user exists, add them as admin and super admin
  IF v_user_id IS NOT NULL THEN
    -- Add as admin if not already
    INSERT INTO admins (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Add as super admin
    INSERT INTO super_admins (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
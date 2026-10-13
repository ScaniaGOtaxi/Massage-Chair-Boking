/*
  # Fix Users and Admins Table Relationship

  1. Changes
    - Create users table first
    - Create admins table with proper constraints
    - Set up RLS and policies
    - Add trigger for new user creation

  2. Security
    - Enable RLS on both tables
    - Add policies for data access control
    - Ensure proper foreign key constraints
*/

-- First, create the users table as it's referenced by admins
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create trigger function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (new.id, new.email, new.created_at);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Ensure all auth users are in the users table
INSERT INTO users (id, email, created_at)
SELECT id, email, created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Now create the admins table
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT admins_user_id_key UNIQUE (user_id)
);

-- Enable RLS on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for users table with safety checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Users can read own data'
  ) THEN
    CREATE POLICY "Users can read own data"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Admins can read all user data'
  ) THEN
    CREATE POLICY "Admins can read all user data"
      ON users
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admins 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create policies for admins table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admins' 
    AND policyname = 'Admins can view all admin records'
  ) THEN
    CREATE POLICY "Admins can view all admin records"
      ON admins
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM admins 
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'admins' 
    AND policyname = 'Users can view admin status'
  ) THEN
    CREATE POLICY "Users can view admin status"
      ON admins
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
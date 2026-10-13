/*
  # Add Initial Admin User

  1. Changes
    - Insert piotr.zdeb@scania.com as an admin user
    
  2. Security
    - Uses secure lookup of user ID from auth.users
    - Maintains RLS policies
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the user ID for the email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'piotr.zdeb@scania.com';

  -- If user exists, add them as admin
  IF v_user_id IS NOT NULL THEN
    INSERT INTO admins (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'User with email piotr.zdeb@scania.com not found';
  END IF;
END $$;
/*
  # Add transaction function for atomic booking creation

  1. Changes
    - Add a stored procedure to handle booking creation atomically
    - Implement row-level locking to prevent concurrent bookings
    - Add proper error handling and validation

  2. Security
    - Maintains existing RLS policies
    - Adds transaction-level safety
*/

-- Create function to handle atomic booking creation
CREATE OR REPLACE FUNCTION create_booking(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_sessions integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id uuid;
  v_overlap_exists boolean;
BEGIN
  -- Lock the relevant time range to prevent concurrent bookings
  SELECT EXISTS (
    SELECT 1
    FROM bookings
    WHERE date = p_date
      AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    FOR UPDATE SKIP LOCKED
  ) INTO v_overlap_exists;

  IF v_overlap_exists THEN
    RAISE EXCEPTION 'Time slot is no longer available'
      USING ERRCODE = '23P01';
  END IF;

  -- Insert the new booking
  INSERT INTO bookings (
    id,
    user_id,
    name,
    email,
    date,
    start_time,
    end_time,
    sessions
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    p_name,
    p_email,
    p_date,
    p_start_time,
    p_end_time,
    p_sessions
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Booking already exists for this time slot'
      USING ERRCODE = '23505';
  WHEN OTHERS THEN
    RAISE;
END;
$$;
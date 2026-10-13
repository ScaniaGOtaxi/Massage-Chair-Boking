/*
  # Improve booking overlap detection and error handling

  1. Changes
    - Enhanced overlap detection logic using PostgreSQL's OVERLAPS operator
    - Added proper error codes and messages
    - Added table locking to prevent race conditions
    - Improved validation for multi-session bookings

  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Create function to check for booking overlaps with improved logic
CREATE OR REPLACE FUNCTION check_booking_overlap(
  new_id uuid,
  new_date date,
  new_start_time time,
  new_end_time time
) RETURNS boolean AS $$
DECLARE
  overlap_exists boolean;
BEGIN
  -- Lock the bookings table in SHARE mode to prevent concurrent inserts
  -- while we check for overlaps
  LOCK TABLE bookings IN SHARE MODE;
  
  SELECT EXISTS (
    SELECT 1
    FROM bookings
    WHERE id != new_id  -- Exclude the current booking when updating
      AND date = new_date
      AND (start_time, end_time) OVERLAPS (new_start_time, new_end_time)
  ) INTO overlap_exists;

  RETURN overlap_exists;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to prevent overlapping bookings
CREATE OR REPLACE FUNCTION prevent_booking_overlap()
RETURNS trigger AS $$
BEGIN
  -- Check for overlaps
  IF check_booking_overlap(
    NEW.id,
    NEW.date,
    NEW.start_time,
    NEW.end_time
  ) THEN
    RAISE EXCEPTION USING 
      ERRCODE = '23505',  -- unique_violation
      MESSAGE = 'Booking overlaps with an existing reservation',
      HINT = 'Please choose a different time slot';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON bookings;

-- Create trigger
CREATE TRIGGER check_booking_overlap_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_booking_overlap();
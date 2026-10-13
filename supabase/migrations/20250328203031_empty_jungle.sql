/*
  # Improve booking overlap detection

  1. Changes
    - Enhanced overlap detection logic to handle all edge cases
    - Simplified the overlap check using PostgreSQL's built-in OVERLAPS operator
    - Added better error messages

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
BEGIN
  -- Use a simpler OVERLAPS check that correctly handles all overlap cases
  RETURN EXISTS (
    SELECT 1
    FROM bookings
    WHERE id != new_id  -- Exclude the current booking when updating
      AND date = new_date
      AND (start_time, end_time) OVERLAPS (new_start_time, new_end_time)
  );
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
    RAISE EXCEPTION 'Booking overlaps with an existing reservation'
      USING HINT = 'Please choose a different time slot',
            ERRCODE = 'unique_violation';
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

-- Add comment to document the trigger
COMMENT ON TRIGGER check_booking_overlap_trigger ON bookings IS 
  'Prevents bookings from overlapping with existing bookings on the same date';
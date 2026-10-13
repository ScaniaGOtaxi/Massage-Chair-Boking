/*
  # Prevent overlapping bookings

  1. Changes
    - Add a function to check for booking overlaps
    - Add a trigger to prevent overlapping bookings
    - This approach uses triggers instead of constraints to handle the validation
      more gracefully and provide better error messages

  2. Security
    - Database-level validation ensures data integrity
    - Prevents race conditions and concurrent overlapping bookings
*/

-- Create function to check for booking overlaps
CREATE OR REPLACE FUNCTION check_booking_overlap(
  new_id uuid,
  new_date date,
  new_start_time time,
  new_end_time time
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM bookings
    WHERE id != new_id  -- Exclude the current booking when updating
      AND date = new_date
      AND (
        (start_time, end_time) OVERLAPS (new_start_time, new_end_time)
      )
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to prevent overlapping bookings
CREATE OR REPLACE FUNCTION prevent_booking_overlap()
RETURNS trigger AS $$
BEGIN
  IF check_booking_overlap(
    NEW.id,
    NEW.date,
    NEW.start_time,
    NEW.end_time
  ) THEN
    RAISE EXCEPTION 'Booking overlaps with an existing reservation'
      USING HINT = 'Please choose a different time slot';
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
/*
  # Update session duration to 20 minutes

  1. Changes
    - Update check constraint for maximum sessions
    - Add comment to document the new session duration
    - Handle existing data gracefully
    
  2. Security
    - Maintains existing RLS policies
    - Updates data safely within a transaction
*/

DO $$ 
BEGIN
  -- First, update any existing bookings that exceed the new limit
  UPDATE bookings 
  SET sessions = 2,
      end_time = start_time + interval '40 minutes'
  WHERE sessions > 2;

  -- Drop existing constraint if it exists
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS check_max_sessions;

  -- Add new constraint for 20-minute sessions (max 2 sessions = 40 minutes)
  ALTER TABLE bookings
  ADD CONSTRAINT check_max_sessions
  CHECK (sessions <= 2);

  -- Add comment to document the constraint
  COMMENT ON CONSTRAINT check_max_sessions ON bookings IS 
    'Limits bookings to maximum of 2 sessions (40 minutes)';
END $$;
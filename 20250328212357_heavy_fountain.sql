/*
  # Add check constraint for maximum sessions

  1. Changes
    - Add check constraint to limit sessions to maximum of 3 (45 minutes)
    - Update existing bookings to comply with new limit
    
  2. Security
    - Maintains existing RLS policies
    - Adds database-level validation for session limits
*/

-- First, update any existing bookings that exceed the new limit
UPDATE bookings
SET sessions = 3
WHERE sessions > 3;

-- Add check constraint for maximum sessions
ALTER TABLE bookings
ADD CONSTRAINT check_max_sessions
CHECK (sessions <= 3);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT check_max_sessions ON bookings IS 
  'Limits bookings to maximum of 3 sessions (45 minutes)';
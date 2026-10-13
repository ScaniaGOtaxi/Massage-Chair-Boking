/*
  # Create bookings table

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `date` (date)
      - `start_time` (time)
      - `end_time` (time)
      - `sessions` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `bookings` table
    - Add policies for:
      - Users can read all bookings (to check availability)
      - Users can only create their own bookings
      - Users can only update/delete their own bookings
*/

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  sessions integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read bookings (for availability checking)
CREATE POLICY "Anyone can view bookings" 
  ON bookings 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Users can only create their own bookings
CREATE POLICY "Users can create their own bookings" 
  ON bookings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own bookings
CREATE POLICY "Users can update their own bookings" 
  ON bookings 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Users can only delete their own bookings
CREATE POLICY "Users can delete their own bookings" 
  ON bookings 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);
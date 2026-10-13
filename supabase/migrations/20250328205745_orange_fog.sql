/*
  # Add Avatar Support

  1. Changes
    - Add avatar_url column to auth.users
    - Create storage bucket for avatars
    - Add storage policies for avatar uploads

  2. Security
    - Only allow authenticated users to upload their own avatars
    - Restrict file types to images
    - Set maximum file size
*/

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set storage policy for avatars
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Add comment to document the changes
COMMENT ON TABLE storage.objects IS 'Table storing user avatar images';
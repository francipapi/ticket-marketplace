-- Create storage bucket for tickets
INSERT INTO storage.buckets (id, name, public)
VALUES ('tickets', 'tickets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for tickets bucket
CREATE POLICY "Users can upload to their own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tickets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tickets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'tickets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'tickets' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- Allow sellers to view tickets for their listings
CREATE POLICY "Sellers can view listing tickets" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'tickets' AND
    EXISTS (
      SELECT 1 FROM listings l
      JOIN users u ON l."userId" = u.id
      WHERE u."supabaseId" = auth.uid()
      AND (string_to_array(name, '/'))[2] = l.id::text
    )
  );
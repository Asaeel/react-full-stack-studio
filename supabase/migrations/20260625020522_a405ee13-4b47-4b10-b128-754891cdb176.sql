
-- Allow authenticated users to read/upload task files in the task-submissions bucket
CREATE POLICY "task-submissions read auth"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-submissions');

CREATE POLICY "task-submissions insert auth"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-submissions');

CREATE POLICY "task-submissions update auth"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'task-submissions');

CREATE POLICY "task-submissions delete auth"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-submissions');

-- Also allow anon (the app uses anon supabase client for some employee flows)
CREATE POLICY "task-submissions read anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'task-submissions');

CREATE POLICY "task-submissions insert anon"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'task-submissions');

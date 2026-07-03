
DROP POLICY IF EXISTS "sales-exports read own" ON storage.objects;
DROP POLICY IF EXISTS "sales-exports write own" ON storage.objects;
DROP POLICY IF EXISTS "sales-exports update own" ON storage.objects;
DROP POLICY IF EXISTS "sales-exports delete own" ON storage.objects;

CREATE POLICY "sales-exports read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sales-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sales-exports write own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sales-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sales-exports update own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'sales-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sales-exports delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sales-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

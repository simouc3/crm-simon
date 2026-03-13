CREATE POLICY "Authenticated users can delete companies" ON public.companies
  FOR DELETE
  TO authenticated
  USING (true);

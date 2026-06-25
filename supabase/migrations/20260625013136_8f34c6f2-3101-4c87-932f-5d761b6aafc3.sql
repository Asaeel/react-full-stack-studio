CREATE POLICY "Anon can insert tasks" ON public.tasks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can delete tasks" ON public.tasks FOR DELETE TO anon USING (true);
GRANT INSERT, DELETE ON public.tasks TO anon;
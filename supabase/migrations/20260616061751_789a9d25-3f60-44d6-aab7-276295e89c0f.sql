
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name text NOT NULL,
  project_name text,
  priority text NOT NULL DEFAULT 'LOW',
  deadline date,
  status text NOT NULL DEFAULT 'todo',
  submission_url text,
  submission_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, UPDATE ON public.tasks TO anon;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manager manages own tasks" ON public.tasks
  FOR ALL USING (auth.uid() = manager_id) WITH CHECK (auth.uid() = manager_id);

CREATE POLICY "Anon can read tasks" ON public.tasks
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can update tasks" ON public.tasks
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Employees table: allow anon to read for email login lookup
GRANT SELECT ON public.employees TO anon;

CREATE POLICY "Anon can read employees for login" ON public.employees
  FOR SELECT TO anon USING (true);

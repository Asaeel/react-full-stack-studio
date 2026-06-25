-- Extend tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_by uuid,
  ADD COLUMN IF NOT EXISTS assigned_by_role text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS owner_status text,
  ADD COLUMN IF NOT EXISTS revision_note text,
  ADD COLUMN IF NOT EXISTS revision_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forwarded_to_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_type text NOT NULL DEFAULT 'employee',
  kind text,
  title text,
  body text,
  task_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open notifications read" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Open notifications insert" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Open notifications update" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open notifications delete" ON public.notifications FOR DELETE USING (true);

-- TASK_FILES
CREATE TABLE IF NOT EXISTS public.task_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploaded_by uuid,
  uploader_role text,
  file_name text NOT NULL,
  file_url text NOT NULL,
  is_revision boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_files TO anon;
GRANT ALL ON public.task_files TO service_role;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open task_files read" ON public.task_files FOR SELECT USING (true);
CREATE POLICY "Open task_files insert" ON public.task_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Open task_files update" ON public.task_files FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open task_files delete" ON public.task_files FOR DELETE USING (true);

-- MEETINGS
CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_date date NOT NULL,
  meeting_time time,
  priority text NOT NULL DEFAULT 'LOW',
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT SELECT ON public.meetings TO anon;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manager manages own meetings" ON public.meetings FOR ALL
  USING (auth.uid() = manager_id) WITH CHECK (auth.uid() = manager_id);
CREATE POLICY "Anon read meetings" ON public.meetings FOR SELECT TO anon USING (true);

-- MEETING_ATTENDEES
CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attendees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_attendees TO anon;
GRANT ALL ON public.meeting_attendees TO service_role;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open meeting_attendees read" ON public.meeting_attendees FOR SELECT USING (true);
CREATE POLICY "Open meeting_attendees insert" ON public.meeting_attendees FOR INSERT WITH CHECK (true);
CREATE POLICY "Open meeting_attendees update" ON public.meeting_attendees FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Open meeting_attendees delete" ON public.meeting_attendees FOR DELETE USING (true);

-- FUNDING_REQUESTS
CREATE TABLE IF NOT EXISTS public.funding_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_name text,
  recipient_email text,
  company_name text NOT NULL,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  repayment_period text,
  attachment_name text,
  attachment_url text,
  mode text,
  status text NOT NULL DEFAULT 'draft',
  ai_message text,
  rejection_reason text,
  rejected_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_requests TO anon;
GRANT ALL ON public.funding_requests TO service_role;
ALTER TABLE public.funding_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manager manages own funding" ON public.funding_requests FOR ALL
  USING (auth.uid() = manager_id) WITH CHECK (auth.uid() = manager_id);
CREATE POLICY "Open funding read" ON public.funding_requests FOR SELECT TO anon USING (true);
CREATE POLICY "Open funding update" ON public.funding_requests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- FUNDING_VOTES
CREATE TABLE IF NOT EXISTS public.funding_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.funding_requests(id) ON DELETE CASCADE,
  voter_employee_id uuid,
  voter_name text,
  decision text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_votes TO anon;
GRANT ALL ON public.funding_votes TO service_role;
ALTER TABLE public.funding_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open funding_votes read" ON public.funding_votes FOR SELECT USING (true);
CREATE POLICY "Open funding_votes insert" ON public.funding_votes FOR INSERT WITH CHECK (true);

-- FUNDING_NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.funding_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.funding_requests(id) ON DELETE CASCADE,
  target_manager_id uuid,
  target_employee_id uuid,
  kind text,
  title text,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funding_notifications TO anon;
GRANT ALL ON public.funding_notifications TO service_role;
ALTER TABLE public.funding_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open fnotif read" ON public.funding_notifications FOR SELECT USING (true);
CREATE POLICY "Open fnotif insert" ON public.funding_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Open fnotif update" ON public.funding_notifications FOR UPDATE USING (true) WITH CHECK (true);
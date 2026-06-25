
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS position TEXT;

CREATE TABLE IF NOT EXISTS public.task_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  ratee_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rater_role TEXT NOT NULL DEFAULT 'manager',
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, rater_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_ratings TO anon;
GRANT ALL ON public.task_ratings TO service_role;

ALTER TABLE public.task_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_ratings read all"
ON public.task_ratings FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "task_ratings insert"
ON public.task_ratings FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "task_ratings update by rater"
ON public.task_ratings FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS task_ratings_ratee_idx ON public.task_ratings (ratee_id);
CREATE INDEX IF NOT EXISTS task_ratings_task_idx ON public.task_ratings (task_id);

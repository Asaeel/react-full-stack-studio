// Performance calculation helpers.
// Score = 50% quality (avg stars * 20) + 50% on-time delivery rate.
import { supabase as _s } from "@/integrations/supabase/client";
const supabase: any = _s;

export type PerfStats = {
  score: number;          // 0-100
  qualityPct: number;     // 0-100 (avg stars * 20)
  onTimePct: number;      // 0-100
  avgStars: number;       // 0-5
  ratingsCount: number;
  doneCount: number;
};

const EMPTY: PerfStats = { score: 0, qualityPct: 0, onTimePct: 0, avgStars: 0, ratingsCount: 0, doneCount: 0 };

export async function getEmployeePerformance(employeeId: string): Promise<PerfStats> {
  if (!employeeId) return EMPTY;
  const [{ data: tasks }, { data: ratings }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,status,deadline,completed_at")
      .eq("employee_id", employeeId)
      .eq("status", "done"),
    supabase
      .from("task_ratings")
      .select("stars")
      .eq("ratee_id", employeeId),
  ]);

  const doneList = (tasks as { deadline: string | null; completed_at: string | null }[]) ?? [];
  const doneCount = doneList.length;
  let onTime = 0;
  let onTimeBase = 0;
  for (const t of doneList) {
    if (!t.deadline || !t.completed_at) continue;
    onTimeBase++;
    if (new Date(t.completed_at).getTime() <= new Date(t.deadline).getTime() + 86400000) onTime++;
  }
  const onTimePct = onTimeBase === 0 ? 0 : Math.round((onTime / onTimeBase) * 100);

  const rList = (ratings as { stars: number }[]) ?? [];
  const avgStars = rList.length === 0 ? 0 : rList.reduce((a, r) => a + r.stars, 0) / rList.length;
  const qualityPct = Math.round(avgStars * 20);

  const score = Math.round((qualityPct + onTimePct) / 2);
  return { score, qualityPct, onTimePct, avgStars, ratingsCount: rList.length, doneCount };
}

export async function getManyPerformance(ids: string[]): Promise<Record<string, PerfStats>> {
  const out: Record<string, PerfStats> = {};
  const results = await Promise.all(ids.map((id) => getEmployeePerformance(id)));
  ids.forEach((id, i) => (out[id] = results[i]));
  return out;
}

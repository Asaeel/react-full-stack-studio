import { useEffect, useState } from "react";
import { Calendar, X, Check } from "lucide-react";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
};

const PRIORITY_BG: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-green-400",
};

export default function EmployeeMeetings({
  employeeId,
  pushNotif,
}: {
  employeeId: string;
  pushNotif: (n: { title: string; body: string }) => void;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [open, setOpen] = useState<Meeting | null>(null);
  const knownRef = useState(() => new Set<string>())[0];

  const load = async () => {
    const { data: rows } = await supabase
      .from("meeting_attendees")
      .select("meeting_id")
      .eq("employee_id", employeeId);
    const ids = (rows ?? []).map((r: any) => r.meeting_id);
    if (!ids.length) { setMeetings([]); return; }
    const { data: ms } = await supabase
      .from("meetings")
      .select("*")
      .in("id", ids)
      .order("meeting_date");
    const next = (ms ?? []) as Meeting[];
    if (knownRef.size > 0) {
      for (const m of next) if (!knownRef.has(m.id)) {
        pushNotif({ title: "New meeting", body: `${m.title} • ${m.meeting_date} ${m.meeting_time?.slice(0,5) ?? ""}` });
      }
    }
    next.forEach(m => knownRef.add(m.id));
    setMeetings(next);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("emp-meet-" + employeeId)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_attendees", filter: `employee_id=eq.${employeeId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [employeeId]);

  const upcoming = meetings.filter(m => !m.completed);
  const past = meetings.filter(m => m.completed);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <h3 className="text-lg font-bold text-[#333366] mb-4 flex items-center gap-2"><Calendar size={18}/> My Meetings</h3>
      {meetings.length === 0 && <p className="text-xs text-[#9197B3]">No meetings yet.</p>}

      <div className="space-y-2">
        {upcoming.map(m => (
          <button key={m.id} onClick={() => setOpen(m)} className="w-full text-left bg-[#F3F2F7] hover:bg-[#EAEAF5] rounded-xl px-4 py-3 flex items-center justify-between transition">
            <div>
              <p className="text-sm font-bold text-[#333366]">{m.title}</p>
              <p className="text-[11px] text-[#9197B3]">{m.meeting_date} {m.meeting_time?.slice(0,5) ?? ""}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${PRIORITY_BG[m.priority]}`}>{m.priority.toUpperCase()}</span>
          </button>
        ))}
        {past.map(m => (
          <button key={m.id} onClick={() => setOpen(m)} className="w-full text-left bg-[#F3F2F7]/50 opacity-60 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#333366] line-through">{m.title}</p>
              <p className="text-[11px] text-[#9197B3]">{m.meeting_date}</p>
            </div>
            <Check size={14} className="text-green-600"/>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-[#333366]">{open.title}</h3>
                <p className="text-[11px] text-[#9197B3]">{open.meeting_date} {open.meeting_time?.slice(0,5) ?? ""}</p>
              </div>
              <button onClick={() => setOpen(null)}><X size={18} className="text-[#9197B3]"/></button>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${PRIORITY_BG[open.priority]}`}>{open.priority.toUpperCase()}</span>
            <p className="mt-3 text-[13px] bg-[#F3F2F7] rounded p-3 whitespace-pre-wrap text-[#333366]">{open.description || "No details."}</p>
          </div>
        </div>
      )}
    </div>
  );
}

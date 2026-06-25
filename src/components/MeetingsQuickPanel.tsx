import { useEffect, useRef, useState } from "react";
import { X, Calendar as CalendarIcon, Check, Trash2, Users } from "lucide-react";
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
  manager_id: string;
};

type Attendee = { id: string; meeting_id: string; employee_id: string; attended: boolean | null };
type Employee = { id: string; name: string; email: string };

const PRIORITY_BG: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-green-400",
};

export default function MeetingsQuickPanel({
  open,
  onClose,
  anchorRight = true,
  mode,
  employeeId,
}: {
  open: boolean;
  onClose: () => void;
  anchorRight?: boolean;
  mode: "manager" | "employee";
  employeeId?: string;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [openMeeting, setOpenMeeting] = useState<Meeting | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (mode === "manager") {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("manager_id", user.id)
        .eq("completed", false)
        .order("meeting_date");
      setMeetings((data ?? []) as Meeting[]);
    } else if (employeeId) {
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
        .eq("completed", false)
        .order("meeting_date");
      setMeetings((ms ?? []) as Meeting[]);
    }
  };

  const loadDetails = async (m: Meeting) => {
    const { data: at } = await supabase.from("meeting_attendees").select("*").eq("meeting_id", m.id);
    setAttendees((at ?? []) as Attendee[]);
    const ids = (at ?? []).map((a: any) => a.employee_id);
    if (ids.length) {
      const { data: emps } = await supabase.from("employees").select("id,name,email").in("id", ids);
      setEmployees((emps ?? []) as Employee[]);
    } else setEmployees([]);
  };

  useEffect(() => {
    if (!open) return;
    load();
    const ch = supabase
      .channel("quick-meet-" + mode + "-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_attendees" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, mode, employeeId]);

  useEffect(() => {
    if (openMeeting) loadDetails(openMeeting);
  }, [openMeeting?.id]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (openMeeting) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose, openMeeting]);

  if (!open) return null;

  const completeMeeting = async (m: Meeting) => {
    await supabase.from("meetings").update({ completed: true }).eq("id", m.id);
    setMeetings((prev) => prev.filter((x) => x.id !== m.id));
    setOpenMeeting(null);
  };

  const deleteMeeting = async (m: Meeting) => {
    await supabase.from("meetings").delete().eq("id", m.id);
    setMeetings((prev) => prev.filter((x) => x.id !== m.id));
    setOpenMeeting(null);
  };

  const setAttended = async (a: Attendee, val: boolean) => {
    await supabase.from("meeting_attendees").update({ attended: val }).eq("id", a.id);
    setAttendees((prev) => prev.map((x) => x.id === a.id ? { ...x, attended: val } : x));
  };

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";

  return (
    <>
      <div
        ref={panelRef}
        className={`absolute ${anchorRight ? "right-0" : "left-0"} mt-2 w-80 max-h-[420px] overflow-y-auto bg-white rounded-xl shadow-2xl border border-[#DADCF5] z-[200]`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DADCF5] sticky top-0 bg-white">
          <span className="text-sm font-bold text-[#333366] flex items-center gap-2">
            <CalendarIcon size={14} className="text-[#727FE5]" /> Upcoming Meetings
          </span>
          <button onClick={onClose}><X size={16} className="text-[#9197B3]" /></button>
        </div>

        {meetings.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[#9197B3]">No incomplete meetings.</div>
        ) : (
          <ul className="divide-y divide-[#DADCF5]/60">
            {meetings.map((m) => (
              <li
                key={m.id}
                onClick={() => setOpenMeeting(m)}
                className="px-3 py-2.5 flex items-start gap-2 hover:bg-[#F3F2F7] cursor-pointer"
              >
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${PRIORITY_BG[m.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#333366] truncate">{m.title}</p>
                  <p className="text-[10px] text-[#9197B3]">
                    {m.meeting_date}{m.meeting_time ? ` · ${m.meeting_time.slice(0, 5)}` : ""}
                  </p>
                  {m.description && (
                    <p className="text-[10px] text-[#9197B3] line-clamp-2 mt-0.5">{m.description}</p>
                  )}
                </div>
                {mode === "manager" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); completeMeeting(m); }}
                    title="Mark complete & dismiss"
                    className="shrink-0 w-6 h-6 rounded-full bg-[#F3F2F7] hover:bg-green-500 hover:text-white text-[#9197B3] flex items-center justify-center transition"
                  >
                    <X size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {openMeeting && (
        <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center p-4" onClick={() => setOpenMeeting(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-[#333366]">{openMeeting.title}</h3>
                <p className="text-[11px] text-[#9197B3]">{openMeeting.meeting_date} {openMeeting.meeting_time?.slice(0, 5) ?? ""}</p>
              </div>
              <button onClick={() => setOpenMeeting(null)}><X size={18} className="text-[#9197B3]" /></button>
            </div>
            <div className="space-y-3 text-sm text-[#333366]">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${PRIORITY_BG[openMeeting.priority]}`}>{openMeeting.priority.toUpperCase()}</span>
                {openMeeting.completed && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">DONE</span>}
              </div>
              <p className="text-[13px] bg-[#F3F2F7] rounded p-3 whitespace-pre-wrap">{openMeeting.description || "No details."}</p>

              <div>
                <p className="font-bold text-xs mb-2 flex items-center gap-1"><Users size={12} /> Attendees</p>
                {attendees.length === 0 && <p className="text-[11px] text-[#9197B3]">No attendees invited.</p>}
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {attendees.map((a) => (
                    <div key={a.id} className="flex items-center justify-between bg-[#F3F2F7] rounded px-3 py-2">
                      <span className="text-xs font-medium">{empName(a.employee_id)}</span>
                      {mode === "manager" ? (
                        <div className="flex gap-1">
                          <button onClick={() => setAttended(a, true)} className={`px-2 py-1 rounded text-[10px] font-bold ${a.attended === true ? "bg-green-500 text-white" : "bg-white text-[#333366] border border-[#DADCF5]"}`}>Attended</button>
                          <button onClick={() => setAttended(a, false)} className={`px-2 py-1 rounded text-[10px] font-bold ${a.attended === false ? "bg-red-500 text-white" : "bg-white text-[#333366] border border-[#DADCF5]"}`}>Absent</button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-[#9197B3]">
                          {a.attended === true ? "Attended" : a.attended === false ? "Absent" : "Pending"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {mode === "manager" && (
                <div className="flex justify-between pt-2">
                  <button onClick={() => deleteMeeting(openMeeting)} className="px-3 h-9 rounded-[8px] text-xs text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 size={12} /> Delete</button>
                  <button onClick={() => completeMeeting(openMeeting)} className="px-4 h-9 rounded-[8px] text-xs font-bold flex items-center gap-1 bg-green-500 text-white">
                    <Check size={12} /> Mark complete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X, Check, Users, Trash2 } from "lucide-react";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;

type Member = { id?: string; name: string; email: string; role?: string };
type Meeting = {
  id: string;
  manager_id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string | null;
  priority: "low" | "medium" | "high";
  completed: boolean;
};
type Attendee = { id: string; meeting_id: string; employee_id: string; attended: boolean | null };

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-green-400",
};

const PRIORITY_RING: Record<string, string> = {
  high: "ring-red-400/70",
  medium: "ring-orange-300/70",
  low: "ring-green-300/70",
};

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isPast(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

export default function MeetingsCalendar({
  employees,
  notify,
}: {
  employees: Member[];
  notify: (t: string, b?: string) => void;
}) {
  const [cursor, setCursor] = useState(new Date());
  const [showMonths, setShowMonths] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [openMeeting, setOpenMeeting] = useState<Meeting | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);

  // Create form
  const [form, setForm] = useState({
    title: "",
    description: "",
    time: "10:00",
    priority: "low" as "low" | "medium" | "high",
    attendees: [] as string[],
  });

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setManagerId(user.id);
    const { data: ms } = await supabase.from("meetings").select("*").eq("manager_id", user.id).order("meeting_date");
    if (ms) setMeetings(ms as Meeting[]);
    const ids = (ms ?? []).map((m: any) => m.id);
    if (ids.length) {
      const { data: at } = await supabase.from("meeting_attendees").select("*").in("meeting_id", ids);
      if (at) setAttendees(at as Attendee[]);
    } else setAttendees([]);
  };

  useEffect(() => {
    load();
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      ch = supabase.channel("mgr-meetings-" + user.id + "-" + Math.random().toString(36).slice(2))
        .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `manager_id=eq.${user.id}` }, load)
        .on("postgres_changes", { event: "*", schema: "public", table: "meeting_attendees" }, load)
        .subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first

  const byDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      const arr = map.get(m.meeting_date) ?? [];
      arr.push(m);
      map.set(m.meeting_date, arr);
    }
    return map;
  }, [meetings]);

  const dayPriority = (list: Meeting[]) => {
    if (list.some((m) => m.priority === "high")) return "high";
    if (list.some((m) => m.priority === "medium")) return "medium";
    return "low";
  };

  const allDone = (list: Meeting[]) => list.every((m) => m.completed || isPast(m.meeting_date));

  const handleDayClick = (day: number) => {
    const dateStr = ymd(year, month, day);
    const list = byDay.get(dateStr);
    if (list && list.length === 1) setOpenMeeting(list[0]);
    else if (list && list.length > 1) {
      // Show first; user can browse others from a list modal — simple impl: open create + show existing
      setOpenMeeting(list[0]);
    } else {
      setCreateDate(dateStr);
      setForm({ title: "", description: "", time: "10:00", priority: "low", attendees: [] });
    }
  };

  const saveMeeting = async () => {
    if (!createDate || !form.title.trim() || !managerId) return;
    const { data, error } = await supabase.from("meetings").insert({
      manager_id: managerId,
      title: form.title.trim(),
      description: form.description,
      meeting_date: createDate,
      meeting_time: form.time || null,
      priority: form.priority,
    }).select().single();
    if (error || !data) { notify("Error", error?.message ?? "Failed"); return; }
    if (form.attendees.length) {
      await supabase.from("meeting_attendees").insert(form.attendees.map((eid) => ({ meeting_id: (data as Meeting).id, employee_id: eid })));
    }
    notify("Meeting scheduled", `${form.title} • ${createDate}`);
    setCreateDate(null);
    load();
  };

  const toggleComplete = async (m: Meeting) => {
    await supabase.from("meetings").update({ completed: !m.completed }).eq("id", m.id);
    setOpenMeeting({ ...m, completed: !m.completed });
    load();
  };

  const deleteMeeting = async (m: Meeting) => {
    await supabase.from("meetings").delete().eq("id", m.id);
    setOpenMeeting(null);
    load();
  };

  const setAttended = async (a: Attendee, val: boolean) => {
    await supabase.from("meeting_attendees").update({ attended: val }).eq("id", a.id);
    load();
  };

  const openAttendees = openMeeting ? attendees.filter((a) => a.meeting_id === openMeeting.id) : [];
  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";

  return (
    <>
      <div className="bg-gradient-to-br from-[#727FE5] to-[#3F467F] rounded-[32px] p-8 shadow-xl text-white min-h-[400px] flex flex-col relative">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center text-lg"
            title="Previous month"
          >‹</button>
          <h2 className="text-xl font-hind font-bold flex items-center gap-2 cursor-pointer select-none" onClick={() => setShowMonths(!showMonths)}>
            {MONTHS[month]} {year}
            <ChevronDown size={16} className={`transition-transform ${showMonths ? "rotate-180" : ""}`} />
          </h2>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center text-lg"
            title="Next month"
          >›</button>
        </div>


        {showMonths ? (
          <div className="grid grid-cols-3 gap-3">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => { setCursor(new Date(year, i, 1)); setShowMonths(false); }}
                className={`py-3 rounded-xl text-xs font-bold ${month === i ? "bg-white text-[#3F467F]" : "hover:bg-white/10"}`}
              >{m.substring(0, 3)}</button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-3 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
              <span key={d} className="text-[9px] font-semibold opacity-70 uppercase tracking-wider">{d}</span>
            ))}
            {Array.from({ length: firstDayOffset }).map((_, i) => <span key={"e" + i} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = ymd(year, month, day);
              const list = byDay.get(dateStr) ?? [];
              const has = list.length > 0;
              const past = isPast(dateStr);
              const done = has && allDone(list);
              const pr = has ? dayPriority(list) : null;
              const today = new Date();
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              return (
                <div key={day} className="relative flex justify-center">
                  <button
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => {
                      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
                      if (has) setHoverDate(dateStr);
                    }}
                    onMouseLeave={() => {
                      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
                      hoverTimer.current = window.setTimeout(() => setHoverDate(null), 80);
                    }}
                    className={`w-9 h-9 text-xs font-medium rounded-full transition-all flex items-center justify-center relative ${
                      has ? `ring-2 ${PRIORITY_RING[pr!]} ${done ? "opacity-40" : ""} bg-white/10 hover:bg-white/25`
                          : "hover:bg-white/10"
                    } ${isToday ? "outline outline-1 outline-white/60" : ""}`}
                  >
                    {day}
                    {has && (
                      <span className={`absolute -bottom-0.5 w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[pr!]} ${done ? "opacity-40" : ""}`} />
                    )}
                  </button>
                  {hoverDate === dateStr && has && (
                    <div className="absolute z-30 top-full mt-1 left-1/2 -translate-x-1/2 bg-white text-[#333366] text-[10px] font-semibold px-2 py-1.5 rounded-md shadow-lg whitespace-nowrap pointer-events-none">
                      {list.map(m => <div key={m.id}>{m.meeting_time?.slice(0,5) ?? ""} {m.title}</div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4 text-[10px] opacity-80">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> High</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> Medium</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> Low</span>
        </div>
      </div>

      {/* Create modal */}
      {createDate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCreateDate(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#333366]">New Meeting · {createDate}</h3>
              <button onClick={() => setCreateDate(null)}><X size={18} className="text-[#9197B3]" /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Meeting name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full h-10 px-3 bg-[#F3F2F7] rounded-[8px] text-sm outline-none" />
              <textarea placeholder="Details" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[#F3F2F7] rounded-[8px] text-sm outline-none resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#333366]">Time</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full mt-1 h-10 px-3 bg-[#F3F2F7] rounded-[8px] text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#333366]">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as any })} className="w-full mt-1 h-10 px-3 bg-[#F3F2F7] rounded-[8px] text-sm outline-none">
                    <option value="low">Low (green)</option>
                    <option value="medium">Medium (orange)</option>
                    <option value="high">High (red)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-[#333366] flex items-center gap-1"><Users size={12} /> Invite employees</label>
                <div className="mt-2 max-h-40 overflow-y-auto border border-[#DADCF5] rounded-[8px] p-2 space-y-1">
                  {employees.filter(e => e.id).length === 0 && <p className="text-[11px] text-[#9197B3]">No employees yet.</p>}
                  {employees.filter(e => e.id).map(e => {
                    const sel = form.attendees.includes(e.id!);
                    return (
                      <label key={e.id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs ${sel ? "bg-[#848FE1]/15" : "hover:bg-[#F3F2F7]"}`}>
                        <input type="checkbox" checked={sel} onChange={(ev) => {
                          setForm({ ...form, attendees: ev.target.checked ? [...form.attendees, e.id!] : form.attendees.filter(x => x !== e.id) });
                        }} />
                        <span className="text-[#333366] font-medium">{e.name}</span>
                        <span className="text-[#9197B3] text-[10px]">{e.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setCreateDate(null)} className="px-4 h-9 rounded-[8px] border border-[#DADCF5] text-xs text-[#333366]">Cancel</button>
                <button onClick={saveMeeting} className="px-4 h-9 rounded-[8px] bg-[#848FE1] text-white text-xs font-bold">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {openMeeting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpenMeeting(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-[#333366]">{openMeeting.title}</h3>
                <p className="text-[11px] text-[#9197B3]">{openMeeting.meeting_date} {openMeeting.meeting_time?.slice(0,5) ?? ""}</p>
              </div>
              <button onClick={() => setOpenMeeting(null)}><X size={18} className="text-[#9197B3]" /></button>
            </div>
            <div className="space-y-3 text-sm text-[#333366]">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${PRIORITY_DOT[openMeeting.priority]}`}>{openMeeting.priority.toUpperCase()}</span>
                {openMeeting.completed && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">DONE</span>}
              </div>
              <p className="text-[13px] bg-[#F3F2F7] rounded p-3 whitespace-pre-wrap">{openMeeting.description || "No details."}</p>

              <div>
                <p className="font-bold text-xs mb-2 flex items-center gap-1"><Users size={12} /> Attendees</p>
                {openAttendees.length === 0 && <p className="text-[11px] text-[#9197B3]">No attendees invited.</p>}
                <div className="space-y-1 max-h-44 overflow-y-auto">
                  {openAttendees.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-[#F3F2F7] rounded px-3 py-2">
                      <span className="text-xs font-medium">{empName(a.employee_id)}</span>
                      <div className="flex gap-1">
                        <button onClick={() => setAttended(a, true)} className={`px-2 py-1 rounded text-[10px] font-bold ${a.attended === true ? "bg-green-500 text-white" : "bg-white text-[#333366] border border-[#DADCF5]"}`}>Attended</button>
                        <button onClick={() => setAttended(a, false)} className={`px-2 py-1 rounded text-[10px] font-bold ${a.attended === false ? "bg-red-500 text-white" : "bg-white text-[#333366] border border-[#DADCF5]"}`}>Absent</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => deleteMeeting(openMeeting)} className="px-3 h-9 rounded-[8px] text-xs text-red-600 hover:bg-red-50 flex items-center gap-1"><Trash2 size={12}/> Delete</button>
                <button onClick={() => toggleComplete(openMeeting)} className={`px-4 h-9 rounded-[8px] text-xs font-bold flex items-center gap-1 ${openMeeting.completed ? "bg-[#F3F2F7] text-[#333366]" : "bg-green-500 text-white"}`}>
                  <Check size={12} /> {openMeeting.completed ? "Mark not done" : "Mark complete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

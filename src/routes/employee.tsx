import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;
import { Bell, Check, Paperclip, LogOut, Calendar, Search, X, FileText, Users, AlertTriangle } from "lucide-react";
import { decodeProjectName } from "@/lib/taskMeta";
import { uploadToBucket } from "@/lib/storageUpload";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type RawTask = {
  id: string;
  name: string;
  project_name: string | null;
  priority: string;
  deadline: string | null;
  status: string;
  submission_name: string | null;
  submission_url: string | null;
  completed_at: string | null;
  created_at: string;
  revision_note?: string | null;
  revision_count?: number | null;
  assigned_by?: string | null;
  assigned_by_role?: string | null;
  parent_task_id?: string | null;
};

type EmpNotif = {
  id: string;
  title: string;
  body: string;
  time: string;
  taskId?: string;
  fundingRequestId?: string;
};

import FundingVoteInbox from "@/components/FundingVoteInbox";
import EmployeeMeetings from "@/components/EmployeeMeetings";
import MeetingsQuickPanel from "@/components/MeetingsQuickPanel";
import AdminTaskInbox from "@/components/AdminTaskInbox";

function EmployeePage() {
  const navigate = useNavigate();
  const [showTeam, setShowTeam] = useState(false);
  const [team, setTeam] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [emp, setEmp] = useState<{ id: string; name: string; email: string; role?: string; permissions?: string } | null>(null);
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifs, setNotifs] = useState<EmpNotif[]>([]);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<RawTask | null>(null);
  const [chartRange, setChartRange] = useState<"week" | "month" | "year">("week");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMeetingsPanel, setShowMeetingsPanel] = useState(false);
  const [upcomingMeetingsCount, setUpcomingMeetingsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"tasks" | "performance" | "meetings" | "funding">("tasks");
  const knownIds = useRef<Set<string>>(new Set());
  const fundingInboxRef = useRef<HTMLDivElement | null>(null);
  const todoSectionRef = useRef<HTMLDivElement | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const isAdmin = (emp?.permissions ?? "").toLowerCase() === "admin";
  const isFinancial = (emp?.role ?? "").toLowerCase().includes("financ");
  const showFundingTab = isAdmin && isFinancial;

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem("lovable_employee") : null;
    if (!raw) { navigate({ to: "/" }); return; }
    setEmp(JSON.parse(raw));
  }, []);

  const pushNotif = (n: Omit<EmpNotif, "id" | "time">) => {
    setNotifs((prev) => [{
      ...n,
      id: String(Date.now() + Math.random()),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }, ...prev].slice(0, 50));
  };

  // Load + subscribe to persisted notifications
  useEffect(() => {
    if (!emp) return;
    let cancelled = false;
    const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const loadNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", emp.id)
        .eq("recipient_type", "employee")
        .order("created_at", { ascending: false })
        .limit(50);
      if (cancelled || !data) return;
      setNotifs(data.map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? "",
        time: fmtTime(n.created_at),
        taskId: n.task_id ?? undefined,
        fundingRequestId: n.kind === "funding_vote" ? n.id : undefined,
      })));
    };
    loadNotifs();
    const ch = supabase
      .channel("emp-notif-" + emp.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${emp.id}` },
        (payload: any) => {
          const n = payload.new;
          setNotifs((prev) => [{
            id: n.id,
            title: n.title,
            body: n.body ?? "",
            time: fmtTime(n.created_at),
            taskId: n.task_id ?? undefined,
          }, ...prev].slice(0, 50));
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [emp]);

  const load = async (eid: string) => {
    const { data } = await supabase.from("tasks").select("*").eq("employee_id", eid).order("created_at", { ascending: false });
    if (!data) return;
    const next = data as RawTask[];
    if (knownIds.current.size > 0) {
      for (const t of next) {
        if (!knownIds.current.has(t.id) && t.status !== "done") {
          pushNotif({
            title: "New task assigned",
            body: `${t.name} • Priority: ${t.priority}`,
            taskId: t.id,
          });
        }
      }
    }
    knownIds.current = new Set(next.map((t) => t.id));
    setTasks(next);
  };

  useEffect(() => {
    if (!emp) return;
    let cancelled = false;
    load(emp.id);
    const ch = supabase.channel("emp-tasks-" + emp.id + "-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `employee_id=eq.${emp.id}` }, () => { if (!cancelled) load(emp.id); })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [emp]);

  useEffect(() => {
    if (!emp) return;
    let cancelled = false;
    const fetchCount = async () => {
      const { data: rows } = await supabase
        .from("meeting_attendees")
        .select("meeting_id")
        .eq("employee_id", emp.id);
      const ids = (rows ?? []).map((r: any) => r.meeting_id);
      if (!ids.length) { if (!cancelled) setUpcomingMeetingsCount(0); return; }
      const { count } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .in("id", ids)
        .eq("completed", false);
      if (!cancelled) setUpcomingMeetingsCount(count ?? 0);
    };
    fetchCount();
    const ch = supabase
      .channel("emp-meet-count-" + emp.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, fetchCount)
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_attendees", filter: `employee_id=eq.${emp.id}` }, fetchCount)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [emp]);

  const notifyUpstream = async (t: RawTask, kind: string, title: string, body: string) => {
    // If admin assigned the task, notify them; otherwise notify the owner (manager)
    if (t.assigned_by) {
      await supabase.from("notifications").insert({
        user_id: t.assigned_by,
        recipient_type: t.assigned_by_role === "admin" ? "employee" : "manager",
        kind,
        title,
        body,
        task_id: t.id,
      });
    }
  };

  const markDone = async (t: RawTask) => {
    const { error } = await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", t.id);
    if (!error) {
      setTasks(tasks.map((x) => x.id === t.id ? { ...x, status: "done", completed_at: new Date().toISOString() } : x));
      notifyUpstream(t, "task_submitted", "Task completed", `${emp?.name ?? "Editor"} completed "${t.name}"`);
    }
  };

  const submitFile = async (t: RawTask, file: File) => {
    try {
      const res = await uploadToBucket(t.id, file);
      await supabase
        .from("tasks")
        .update({ submission_name: res.name, submission_url: res.url })
        .eq("id", t.id);
      await supabase.from("task_files").insert({
        task_id: t.id,
        uploaded_by: emp?.id,
        uploader_role: "editor",
        file_name: res.name,
        file_url: res.url,
      });
      setTasks((cur) =>
        cur.map((x) =>
          x.id === t.id
            ? { ...x, submission_name: res.name, submission_url: res.url }
            : x,
        ),
      );
      notifyUpstream(t, "task_submitted", "Submission received", `${emp?.name ?? "Editor"} uploaded a file for "${t.name}"`);
    } catch (e) {
      console.error(e);
      alert("Upload failed: " + (e instanceof Error ? e.message : "unknown"));
    }
  };

  // Load department team for admin
  useEffect(() => {
    if (!emp || !isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("id,name,email,role,permissions")
        .eq("manager_id", (await supabase.from("employees").select("manager_id").eq("id", emp.id).single()).data?.manager_id ?? "");
      const same = (data ?? []).filter(
        (e: any) => (e.role ?? "").toLowerCase() === (emp.role ?? "").toLowerCase(),
      );
      setTeam(same);
    })();
  }, [emp, isAdmin]);

  const daysLate = (t: RawTask) => {
    if (!t.deadline || t.status === "done") return 0;
    const diff = Math.floor((Date.now() - new Date(t.deadline).getTime()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  const daysSinceAssigned = (t: RawTask) =>
    Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000);

  const logout = () => {
    localStorage.removeItem("lovable_employee");
    navigate({ to: "/" });
  };

  const q = search.trim().toLowerCase();
  const matches = (t: RawTask) => {
    if (!q) return true;
    const { project, description } = decodeProjectName(t.project_name);
    return [t.name, project, description, t.priority].some((s) => (s ?? "").toLowerCase().includes(q));
  };

  const todo = tasks.filter((t) => t.status !== "done").filter(matches);
  const done = tasks.filter((t) => t.status === "done").filter(matches);
  const total = tasks.length;
  const completionRate = total ? Math.round((tasks.filter((t) => t.status === "done").length / total) * 100) : 0;


  // ---------- Charts ----------
  const chartData = useMemo(() => {
    const completed = tasks.filter((t) => t.status === "done" && t.completed_at);
    if (chartRange === "week") {
      return [...Array(7)].map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        const v = completed.filter((t) => {
          const ct = new Date(t.completed_at!).getTime();
          return ct >= d.getTime() && ct <= end.getTime();
        }).length;
        return { label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }), value: v };
      });
    }
    if (chartRange === "month") {
      const now = new Date();
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return [...Array(days)].map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), i + 1); d.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        const v = completed.filter((t) => {
          const ct = new Date(t.completed_at!).getTime();
          return ct >= d.getTime() && ct <= end.getTime();
        }).length;
        return { label: `${i + 1}`, value: v };
      });
    }
    // year
    return [...Array(12)].map((_, m) => {
      const year = new Date().getFullYear();
      const start = new Date(year, m, 1).getTime();
      const end = new Date(year, m + 1, 1).getTime();
      const v = completed.filter((t) => {
        const ct = new Date(t.completed_at!).getTime();
        return ct >= start && ct < end;
      }).length;
      return { label: new Date(year, m, 1).toLocaleDateString(undefined, { month: "short" }), value: v };
    });
  }, [tasks, chartRange]);

  if (!emp) return null;

  return (

    <div className="min-h-screen bg-[#F3F2F7] pb-20">
      {/* Top Header Bar (manager-style) */}
      <header className="sticky top-0 z-40 px-4 md:px-8 py-4">
        <div className="bg-gradient-to-r from-[#727FE5] to-[#3F467F] rounded-[24px] shadow-lg px-4 lg:px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-white font-hind font-bold text-2xl tracking-wide select-none">AFeer</div>

          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#848FE1]" strokeWidth={3} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim()) {
                    e.preventDefault();
                    import("@/lib/searchHighlight").then(({ searchAndHighlight }) => searchAndHighlight(search));
                  }
                }}
                placeholder="Search tasks, project, priority..."
                className="w-full bg-white rounded-full py-2 pl-12 pr-10 text-sm text-[#333366] focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9197B3] hover:text-[#333366]">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMeetingsPanel((v) => !v)}
                className="relative w-9 h-9 rounded-full bg-white flex items-center justify-center"
                title="Upcoming meetings"
              >
                <Calendar className="w-4 h-4 text-[#727FE5]" />
                {upcomingMeetingsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#848FE1] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                    {upcomingMeetingsCount > 9 ? "9+" : upcomingMeetingsCount}
                  </span>
                )}
              </button>
              <MeetingsQuickPanel
                open={showMeetingsPanel}
                onClose={() => setShowMeetingsPanel(false)}
                mode="employee"
                employeeId={emp.id}
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNotif((v) => !v)}
                className="relative w-9 h-9 rounded-full bg-white flex items-center justify-center"
              >
                <Bell className="w-4 h-4 text-[#727FE5]" />
                {notifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#848FE1] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                    {notifs.length > 9 ? "9+" : notifs.length}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-[#DADCF5] z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#DADCF5]">
                    <span className="text-sm font-bold text-[#333366]">Notifications</span>
                    <div className="flex items-center gap-2">
                      {notifs.length > 0 && (
                        <button onClick={() => setNotifs([])} className="text-xs text-[#727FE5] hover:underline">Clear all</button>
                      )}
                      <button onClick={() => setShowNotif(false)}><X size={16} className="text-[#9197B3]" /></button>
                    </div>
                  </div>
                  {notifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-[#9197B3]">No notifications</div>
                  ) : (
                    <ul className="divide-y divide-[#DADCF5]/60">
                      {notifs.map((n) => (
                        <li key={n.id} className="px-3 py-2 flex items-start gap-2 hover:bg-[#F3F2F7]">
                          <Bell className="w-4 h-4 text-[#727FE5] mt-1 shrink-0" />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              if (n.fundingRequestId !== undefined) {
                                setShowNotif(false);
                                requestAnimationFrame(() => {
                                  fundingInboxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                });
                                return;
                              }
                              if (n.taskId) {
                                setHighlightedTaskId(n.taskId);
                                setShowNotif(false);
                                requestAnimationFrame(() => {
                                  todoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                });
                              }
                            }}
                          >
                            <p className="text-xs font-bold text-[#333366]">{n.title}</p>
                            {n.body && <p className="text-[11px] text-[#9197B3]">{n.body}</p>}
                            <p className="text-[10px] text-[#9197B3]">{n.time}</p>
                          </div>
                          <button
                            onClick={() => setNotifs((prev) => prev.filter((x) => x.id !== n.id))}
                            className="text-[#9197B3] hover:text-red-500 shrink-0"
                            aria-label="Dismiss"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 px-3 h-9 rounded-full bg-white text-xs font-bold text-[#333366] hover:bg-[#F3F2F7]">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#333366]">Welcome, {emp.name}</h1>
          <p className="text-xs text-[#9197B3]">
            {emp.email}
            {emp.role && <span className="ml-2 inline-flex items-center gap-1"><span className="px-2 py-0.5 rounded-full bg-[#DADCF5] text-[#3F467F] text-[10px] font-bold">{emp.role}</span>{isAdmin && <span className="px-2 py-0.5 rounded-full bg-[#727FE5] text-white text-[10px] font-bold">Admin</span>}</span>}
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-2xl p-2 shadow-sm items-center">
          {[
            { id: "tasks", label: "Tasks" },
            { id: "performance", label: "Performance" },
            { id: "meetings", label: "Meetings" },
            ...(showFundingTab ? [{ id: "funding", label: "Funding Requests" }] : []),
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === t.id
                  ? "bg-gradient-to-r from-[#727FE5] to-[#3F467F] text-white shadow"
                  : "text-[#333366] hover:bg-[#F3F2F7]"
              }`}
            >
              {t.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setShowTeam(true)}
              className="ml-auto px-4 py-2 rounded-xl text-sm font-bold text-[#333366] hover:bg-[#F3F2F7] flex items-center gap-2"
            >
              <Users size={16} /> Team
            </button>
          )}
        </div>

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-[#9197B3]">Total Tasks</p>
                <p className="text-3xl font-bold text-[#333366]">{total}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-[#9197B3]">Completed</p>
                <p className="text-3xl font-bold text-green-600">{tasks.filter((t) => t.status === "done").length}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-[#9197B3]">Completion Rate</p>
                <p className="text-3xl font-bold text-[#848FE1]">{completionRate}%</p>
              </div>
            </div>

            {isAdmin && (
              <AdminTaskInbox admin={{ id: emp.id, name: emp.name, role: emp.role }} />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div ref={todoSectionRef} className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-[#333366] mb-4">To Do ({todo.length})</h3>
                <div className="space-y-3">
                  {todo.length === 0 && <p className="text-xs text-[#9197B3]">No pending tasks.</p>}
                  {todo.map((t) => {
                    const { project, description } = decodeProjectName(t.project_name);
                    const isHighlighted = highlightedTaskId === t.id;
                    const isRevision = t.status === "revision" || ((t.revision_count ?? 0) > 0 && t.status !== "done");
                    const late = daysLate(t);
                    const sinceAssigned = daysSinceAssigned(t);
                    return (
                      <div
                        key={t.id}
                        onClick={() => isHighlighted && setHighlightedTaskId(null)}
                        className={`rounded-xl p-4 transition-all ${
                          late > 0 ? "bg-red-50 border-2 border-red-400" :
                          isRevision ? "bg-amber-50 border-2 border-amber-300" : "bg-[#F3F2F7]"
                        } ${isHighlighted ? "ring-2 ring-red-500 border-2 border-red-500 shadow-md" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setDetail(t); }}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-[#333366]">{t.name}</p>
                              {isRevision && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                                  REVISION REQUESTED
                                </span>
                              )}
                              {late > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-bold inline-flex items-center gap-1">
                                  <AlertTriangle size={10} /> LATE {late}d
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[#9197B3]">{project || "—"} • Assigned {sinceAssigned}d ago • Due {t.deadline ?? "—"} • {t.priority}</p>
                            {description && <p className="text-[11px] text-[#333366] mt-1 line-clamp-2">{description}</p>}
                            {isRevision && t.revision_note && (
                              <p className="text-[11px] mt-1 text-amber-800 bg-amber-100 rounded p-2">
                                <strong>Note:</strong> {t.revision_note}
                              </p>
                            )}
                            {t.submission_name && <p className="text-[10px] mt-1 flex items-center gap-1 text-[#333366]"><Paperclip size={10} /> {t.submission_name}</p>}
                          </div>
                          <button onClick={() => markDone(t)} title="Mark done" className="w-8 h-8 rounded-full bg-white border border-[#848FE1] flex items-center justify-center hover:bg-[#848FE1] hover:text-white shrink-0">
                            <Check size={14} />
                          </button>
                        </div>
                        <label className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#848FE1] cursor-pointer">
                          <Paperclip size={10} /> Upload file
                          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && submitFile(t, e.target.files[0])} />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-[#333366] mb-4">Done ({done.length})</h3>
                <div className="space-y-3">
                  {done.length === 0 && <p className="text-xs text-[#9197B3]">Nothing yet.</p>}
                  {done.map((t) => {
                    const { project } = decodeProjectName(t.project_name);
                    return (
                      <div key={t.id} onClick={() => setDetail(t)} className="bg-[#EAF7EE] rounded-xl p-4 cursor-pointer">
                        <p className="font-bold text-[#333366] line-through opacity-70">{t.name}</p>
                        <p className="text-[10px] text-[#9197B3]">{project || "—"}</p>
                        {t.submission_name && <p className="text-[10px] mt-1 flex items-center gap-1 text-[#333366]"><Paperclip size={10} /> {t.submission_name}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Performance Tab */}
        {activeTab === "performance" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-[#333366]">Performance</h3>
              <div className="flex bg-[#F3F2F7] rounded-full p-1 text-[11px] font-bold">
                {(["week", "month", "year"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setChartRange(r)}
                    className={`px-4 py-1.5 rounded-full transition-all capitalize ${
                      chartRange === r ? "bg-[#727FE5] text-white shadow" : "text-[#333366] hover:bg-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-[#9197B3] mb-2">
              {chartRange === "week" && `Last 7 days · ${new Date().toLocaleDateString()}`}
              {chartRange === "month" && `${new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}`}
              {chartRange === "year" && `${new Date().getFullYear()}`}
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F2F7" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9197B3" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: "#9197B3" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white rounded-lg shadow px-3 py-2 border border-[#DADCF5]">
                          <p className="text-[10px] text-[#9197B3]">{label}</p>
                          <p className="text-sm font-bold text-[#333366]">{payload[0].value} done</p>
                        </div>
                      );
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#3F467F" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#727FE5" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Meetings Tab */}
        {activeTab === "meetings" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <EmployeeMeetings employeeId={emp.id} pushNotif={(n) => pushNotif({ title: n.title, body: n.body })} />
          </div>
        )}

        {/* Funding Tab (Admin + Financial only) */}
        {activeTab === "funding" && showFundingTab && (
          <div ref={fundingInboxRef}>
            <FundingVoteInbox
              employee={emp}
              onNotify={(n) =>
                pushNotif({
                  title: n.title,
                  body: n.body,
                  fundingRequestId: n.requestId,
                })
              }
            />
          </div>
        )}
      </div>


      {/* Task Detail Modal */}
      {detail && (() => {
        const { project, description } = decodeProjectName(detail.project_name);
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-lg p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-[#333366]">{detail.name}</h3>
                <button onClick={() => setDetail(null)}><X size={18} className="text-[#9197B3]" /></button>
              </div>
              <div className="space-y-2 text-sm text-[#333366]">
                <p><span className="font-bold">Project: </span>{project || "—"}</p>
                <p><span className="font-bold">Priority: </span>{detail.priority}</p>
                <p><span className="font-bold">Deadline: </span>{detail.deadline ?? "—"}</p>
                <p><span className="font-bold">Status: </span>{detail.status}</p>
                <div>
                  <p className="font-bold mb-1">Description:</p>
                  <p className="text-[13px] bg-[#F3F2F7] rounded p-3 whitespace-pre-wrap">{description || "No description."}</p>
                </div>
                {detail.submission_name && (
                  <p className="text-xs flex items-center gap-1"><FileText size={12} /> {detail.submission_name}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F3F2F7] flex items-center justify-center mx-auto mb-4">
              <LogOut size={26} className="text-[#727FE5]" />
            </div>
            <h3 className="text-lg font-bold text-[#333366] mb-2">Log out?</h3>
            <p className="text-xs text-[#9197B3] mb-6">Do you want to log out of your account?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 h-10 rounded-[8px] border border-[#DADCF5] text-sm font-bold text-[#333366] hover:bg-[#F3F2F7]">No</button>
              <button onClick={() => { setShowLogoutConfirm(false); logout(); }} className="flex-1 h-10 rounded-[8px] bg-[#727FE5] hover:bg-[#5d6bd9] text-sm font-bold text-white">Yes</button>
            </div>
          </div>
        </div>
      )}
      {showTeam && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowTeam(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#333366] flex items-center gap-2"><Users size={18}/> {emp.role} Team</h3>
              <button onClick={() => setShowTeam(false)}><X size={18} className="text-[#9197B3]"/></button>
            </div>
            {team.length === 0 ? (
              <p className="text-xs text-[#9197B3]">No teammates in your department.</p>
            ) : (
              <ul className="space-y-2">
                {team.map((m) => (
                  <li key={m.id} className="flex items-center justify-between bg-[#F3F2F7] rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-bold text-[#333366]">{m.name}{m.id === emp.id && <span className="ml-2 text-[10px] text-[#727FE5]">(you)</span>}</p>
                      <p className="text-[10px] text-[#9197B3]">{m.email}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#DADCF5] text-[#3F467F] font-bold">{m.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/employee")({
  component: EmployeePage,
});

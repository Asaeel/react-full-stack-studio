import { useEffect, useState, useRef } from "react";
import { Edit2, X, Check, Paperclip, FileText, AlertTriangle, Download, Send } from "lucide-react";
import { supabase as _s } from "@/integrations/supabase/client";
const supabase: any = _s;
import { encodeProjectName, decodeProjectName } from "@/lib/taskMeta";
import { uploadToBucket } from "@/lib/storageUpload";

type Employee = { id?: string; name: string; email: string };
type ProjectOpt = { name: string };
type RawTask = {
  id: string;
  name: string;
  project_name: string | null;
  employee_id: string;
  priority: string;
  deadline: string | null;
  status: string;
  submission_name: string | null;
  submission_url: string | null;
  completed_at: string | null;
  created_at: string;
  forwarded_to_owner?: boolean | null;
  owner_status?: string | null;
  revision_note?: string | null;
  parent_task_id?: string | null;
  assigned_by?: string | null;
  manager_id?: string | null;
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

export default function ManagerTasks({
  employees,
  projects = [],
  notify,
  search = "",
  highlightId,
}: {
  employees: Employee[];
  projects?: ProjectOpt[];
  notify: (t: string, b?: string) => void;
  search?: string;
  highlightId?: string | null;
}) {
  const [tasks, setTasks] = useState<RawTask[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState<RawTask | null>(null);
  const [detailFiles, setDetailFiles] = useState<{ id: string; file_name: string; file_url: string; uploader_role: string }[]>([]);
  const [reviewMode, setReviewMode] = useState<"none" | "revise">("none");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    project_choice: "",
    project_custom: "",
    description: "",
    employee_id: "",
    priority: "LOW",
    deadline: new Date().toISOString().slice(0, 10),
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const prevDoneIds = useRef<Set<string>>(new Set());
  const highlightRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("manager_id", user.id).order("created_at", { ascending: false });
    if (data) {
      const next = data as RawTask[];
      // Detect newly-completed tasks (since previous load) and notify
      const knownIds = prevDoneIds.current;
      if (knownIds.size > 0) {
        for (const t of next) {
          if (t.status === "done" && !knownIds.has(t.id)) {
            const emp = employees.find((e) => e.id === t.employee_id);
            notify("Task completed", `${emp?.name ?? "Employee"} finished "${t.name}"`);
          }
        }
      }
      prevDoneIds.current = new Set(next.filter((t) => t.status === "done").map((t) => t.id));
      setTasks(next);
    }
  };

  useEffect(() => {
    load();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const ch = supabase.channel("mgr-tasks-" + user.id + "-" + Math.random().toString(36).slice(2));
      ch.on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `manager_id=eq.${user.id}` }, () => load());
      ch.subscribe();
      channel = ch;
      if (cancelled) supabase.removeChannel(ch);
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, []);

  // Load files for detail view
  useEffect(() => {
    if (!detail) { setDetailFiles([]); setReviewMode("none"); setReviewNote(""); setReviewFile(null); return; }
    (async () => {
      const { data } = await supabase.from("task_files").select("id,file_name,file_url,uploader_role").eq("task_id", detail.id);
      setDetailFiles((data ?? []) as any);
    })();
  }, [detail]);

  const approveTask = async (t: RawTask) => {
    await supabase.from("tasks").update({ owner_status: "approved", status: "done", completed_at: new Date().toISOString() }).eq("id", t.id);
    if (t.assigned_by) {
      await supabase.from("notifications").insert({
        user_id: t.assigned_by, recipient_type: "employee", kind: "task_approved",
        title: "Owner approved task", body: t.name, task_id: t.id,
      });
    }
    setDetail(null);
    load();
  };

  const reviseTask = async (t: RawTask) => {
    let fileMeta: { name: string; url: string } | null = null;
    if (reviewFile) {
      const res = await uploadToBucket(t.id, reviewFile);
      fileMeta = res;
      await supabase.from("task_files").insert({
        task_id: t.id, uploaded_by: t.manager_id ?? null, uploader_role: "owner",
        file_name: res.name, file_url: res.url, is_revision: true,
      } as any);
    }
    await supabase.from("tasks").update({
      owner_status: "revision", status: "revision", revision_note: reviewNote,
    }).eq("id", t.id);
    if (t.assigned_by) {
      await supabase.from("notifications").insert({
        user_id: t.assigned_by, recipient_type: "employee", kind: "task_revision",
        title: "Owner requested revision", body: reviewNote.slice(0, 80) + (fileMeta ? " (with file)" : ""),
        task_id: t.id,
      });
    }
    setDetail(null);
    load();
  };



  // Scroll/highlight when search picks a specific task
  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId]);

  const open = () => {
    setForm({
      name: "",
      project_choice: projects[0]?.name ?? "Other",
      project_custom: "",
      description: "",
      employee_id: employees[0]?.id ?? "",
      priority: "LOW",
      deadline: new Date().toISOString().slice(0, 10),
    });
    setErr("");
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.employee_id) { setErr("Please fill required fields"); return; }
    const project = form.project_choice === "Other" ? form.project_custom.trim() : form.project_choice;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase.from("tasks").insert({
      manager_id: user.id,
      employee_id: form.employee_id,
      name: form.name.trim(),
      project_name: encodeProjectName(project, form.description),
      priority: form.priority,
      deadline: form.deadline || null,
    }).select().single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setTasks([data as RawTask, ...tasks]);
    const emp = employees.find((e) => e.id === form.employee_id);
    notify("Task assigned", `${(data as RawTask).name} → ${emp?.name ?? ""}`);
    setShowModal(false);
  };

  const empName = (id: string) => employees.find((e) => e.id === id)?.name ?? "—";

  const q = search.trim().toLowerCase();
  const matches = (t: RawTask) => {
    if (!q) return true;
    const { project, description } = decodeProjectName(t.project_name);
    return [t.name, project, description, empName(t.employee_id), t.priority].some((s) => (s ?? "").toLowerCase().includes(q));
  };

  const todo = tasks.filter((t) => t.status !== "done").filter(matches);
  const done = tasks.filter((t) => t.status === "done").filter(matches);

  const highlightCls = (id: string) =>
    highlightId === id ? "ring-4 ring-[#FFD36E] ring-offset-2" : "";

  return (
    <div id="manager-tasks-section" className="bg-white rounded-[32px] p-8 shadow-sm border border-[#DADCF5]/50">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-hind font-bold text-[#333366]">Tasks</h2>
        <button onClick={open} className="flex items-center gap-2 px-4 py-2 border border-[#333366] rounded-[10px] text-xs font-bold text-[#333366] hover:bg-[#F3F2F7] transition-all">
          <Edit2 size={14} /> Add Task
        </button>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-hind font-bold text-[#333366]">To Do</h3>
        <div className="space-y-4">
          {todo.length === 0 && <p className="text-xs text-[#9197B3]">No tasks.</p>}
          {todo.map((t) => {
            const { project, description } = decodeProjectName(t.project_name);
            return (
              <div
                key={t.id}
                ref={highlightId === t.id ? highlightRef : null}
                onClick={() => setDetail(t)}
                className={`bg-[#F3F2F7] rounded-[15px] p-5 border border-white shadow-sm hover:border-[#848FE1] transition-all cursor-pointer ${highlightCls(t.id)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-[#333366] mb-1">{t.name}</h4>
                    <p className="text-[10px] text-[#9197B3]">
                      {empName(t.employee_id)} • {project || "—"} • Due {t.deadline ?? "—"} • {t.priority}
                    </p>
                    {description && <p className="text-[11px] text-[#333366] mt-1 line-clamp-2">{description}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {done.length > 0 && (
          <>
            <h3 className="text-xl font-hind font-bold text-[#333366] pt-4">Done</h3>
            <div className="space-y-4">
              {done.map((t) => {
                const { project } = decodeProjectName(t.project_name);
                return (
                  <div
                    key={t.id}
                    ref={highlightId === t.id ? highlightRef : null}
                    onClick={() => setDetail(t)}
                    className={`bg-[#EAF7EE] rounded-[15px] p-5 border border-white shadow-sm cursor-pointer ${highlightCls(t.id)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-[#333366] mb-1 line-through opacity-70">{t.name}</h4>
                        <p className="text-[10px] text-[#9197B3]">{empName(t.employee_id)} • {project || "—"} • Completed</p>
                        {t.submission_name && (
                          <a
                            href={t.submission_url ?? "#"}
                            target={t.submission_url ? "_blank" : undefined}
                            download={t.submission_url ? t.submission_name : undefined}
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-[#727FE5] mt-1 flex items-center gap-1 hover:underline"
                          >
                            <Paperclip size={11} /> {t.submission_name} {t.submission_url ? "↓" : ""}
                          </a>
                        )}
                      </div>
                      <Check size={18} className="text-green-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl">
            <div className="bg-[#F3F2F7] -mx-6 -mt-6 px-6 py-4 rounded-t-[20px] flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#333366]">Add New Task</h3>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-[#9197B3]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#333366]">Task Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 h-10 px-3 bg-[#F3F2F7] rounded-[8px] outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#333366]">Name Project</label>
                <select
                  value={form.project_choice}
                  onChange={(e) => setForm({ ...form, project_choice: e.target.value })}
                  className="w-full mt-1 h-10 px-3 bg-[#F3F2F7] rounded-[8px] outline-none text-sm"
                >
                  {projects.length === 0 && <option value="">— No projects —</option>}
                  {projects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                  <option value="Other">Other</option>
                </select>
                {form.project_choice === "Other" && (
                  <input
                    placeholder="Type project name"
                    value={form.project_custom}
                    onChange={(e) => setForm({ ...form, project_custom: e.target.value })}
                    className="w-full mt-2 h-10 px-3 bg-white border border-[#DADCF5] rounded-[8px] outline-none text-sm"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-[#333366]">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 bg-[#F3F2F7] rounded-[8px] outline-none text-sm resize-none"
                  placeholder="Task details for the employee..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#333366]">Assign To</label>
                <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="w-full mt-1 h-10 px-3 bg-[#F3F2F7] rounded-[8px] outline-none text-sm">
                  <option value="">— Select —</option>
                  {employees.filter((e) => e.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#333366]">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full mt-1 h-10 px-3 bg-[#F3F2F7] rounded-[8px] outline-none text-sm">
                    {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#333366]">Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full mt-1 h-10 px-3 bg-[#F3F2F7] rounded-[8px] outline-none text-sm" />
                </div>
              </div>
              {err && <p className="text-xs text-red-500">{err}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="px-4 h-9 rounded-[8px] border border-[#DADCF5] text-xs text-[#333366]">Cancel</button>
                <button disabled={saving} onClick={save} className="px-4 h-9 rounded-[8px] bg-[#848FE1] text-white text-xs font-bold disabled:opacity-50">Add Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <p><span className="font-bold">Assigned to: </span>{empName(detail.employee_id)}</p>
                <p><span className="font-bold">Priority: </span>{detail.priority}</p>
                <p><span className="font-bold">Deadline: </span>{detail.deadline ?? "—"}</p>
                <p><span className="font-bold">Status: </span>{detail.status}</p>
                <div>
                  <p className="font-bold mb-1">Description:</p>
                  <p className="text-[13px] bg-[#F3F2F7] rounded p-3 whitespace-pre-wrap">{description || "No description."}</p>
                </div>
                {detail.submission_name && (
                  <div>
                    <p className="font-bold mb-1">Submission:</p>
                    <a
                      href={detail.submission_url ?? "#"}
                      target={detail.submission_url ? "_blank" : undefined}
                      download={detail.submission_url ? detail.submission_name ?? undefined : undefined}
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#848FE1] text-white rounded-[8px] text-xs font-bold hover:bg-[#727FE5]"
                    >
                      <FileText size={14} /> Download {detail.submission_name}
                    </a>
                  </div>
                )}
                {detailFiles.length > 0 && (
                  <div>
                    <p className="font-bold mb-1">All files:</p>
                    <ul className="space-y-1">
                      {detailFiles.map((f) => (
                        <li key={f.id}><a href={f.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#727FE5] inline-flex items-center gap-1 hover:underline"><Download size={12}/>{f.file_name} <span className="text-[#9197B3]">({f.uploader_role})</span></a></li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.forwarded_to_owner && detail.owner_status !== "approved" && (
                  <div className="mt-3 pt-3 border-t border-[#DADCF5]">
                    {reviewMode === "none" ? (
                      <div className="flex gap-2">
                        <button onClick={() => approveTask(detail)} className="px-4 h-10 rounded-lg bg-green-600 text-white text-xs font-bold flex items-center gap-1"><Check size={14}/> Approve</button>
                        <button onClick={() => setReviewMode("revise")} className="px-4 h-10 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center gap-1"><AlertTriangle size={14}/> Request revision</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea autoFocus value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="What needs to change?" rows={3} className="w-full px-3 py-2 bg-[#F3F2F7] rounded-[8px] text-sm outline-none resize-none" />
                        <label className="block text-xs text-[#333366] font-bold">Attach file (optional)
                          <input type="file" onChange={(e) => setReviewFile(e.target.files?.[0] ?? null)} className="block mt-1 text-xs font-normal"/>
                        </label>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setReviewMode("none")} className="px-4 h-9 rounded-[8px] border border-[#DADCF5] text-xs">Cancel</button>
                          <button disabled={!reviewNote.trim()} onClick={() => reviseTask(detail)} className="px-4 h-9 rounded-[8px] bg-amber-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"><Send size={12}/> Send</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {detail.owner_status === "approved" && (
                  <p className="text-xs text-green-700 font-bold pt-2">✓ Approved</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

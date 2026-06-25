import { useEffect, useState } from "react";
import { Send, AlertTriangle, Paperclip, GitBranch, ArrowUp, X, FileText, Download, Clock } from "lucide-react";
import { supabase as _s } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storageUpload";
import TaskDistributeWizard from "./TaskDistributeWizard";
import StarRating from "./StarRating";
const supabase: any = _s;

type Task = {
  id: string;
  manager_id: string;
  employee_id: string;
  name: string;
  project_name: string | null;
  description: string | null;
  priority: string;
  deadline: string | null;
  status: string;
  submission_name: string | null;
  submission_url: string | null;
  parent_task_id: string | null;
  assigned_by: string | null;
  assigned_by_role: string | null;
  revision_note: string | null;
  revision_count: number | null;
  forwarded_to_owner: boolean | null;
  owner_status: string | null;
  completed_at: string | null;
  submitted_at: string | null;
  created_at: string;
};

type FileRow = { id: string; task_id: string; file_name: string; file_url: string; uploader_role: string; created_at: string };

export default function AdminTaskInbox({
  admin,
}: {
  admin: { id: string; name: string; role?: string };
}) {
  const [parentTasks, setParentTasks] = useState<Task[]>([]);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [editors, setEditors] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [distribute, setDistribute] = useState<Task | null>(null);
  const [detail, setDetail] = useState<Task | null>(null);
  const [reviewKid, setReviewKid] = useState<Task | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [sendOwnerNote, setSendOwnerNote] = useState("");
  const [sendOwnerFile, setSendOwnerFile] = useState<File | null>(null);
  const [showSendOwner, setShowSendOwner] = useState<Task | null>(null);

  const load = async () => {
    const { data: own } = await supabase
      .from("tasks").select("*").eq("employee_id", admin.id).is("parent_task_id", null)
      .order("created_at", { ascending: false });
    setParentTasks((own ?? []) as Task[]);

    const { data: subs } = await supabase
      .from("tasks").select("*").eq("assigned_by", admin.id)
      .order("created_at", { ascending: false });
    setSubtasks((subs ?? []) as Task[]);

    const { data: fl } = await supabase.from("task_files").select("*").order("created_at", { ascending: false });
    setFiles((fl ?? []) as FileRow[]);

    if (own && own[0]) {
      const mgrId = own[0].manager_id;
      const { data: emps } = await supabase.from("employees").select("id,name,email,role,permissions").eq("manager_id", mgrId);
      const sameDept = (emps ?? []).filter(
        (e: any) => e.id !== admin.id && (e.role ?? "").toLowerCase() === (admin.role ?? "").toLowerCase(),
      );
      setEditors(sameDept);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-inbox-" + admin.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_files" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [admin.id]);

  const childrenOf = (pid: string) => subtasks.filter((s) => s.parent_task_id === pid);
  const filesOf = (tid: string) => files.filter((f) => f.task_id === tid);
  const empName = (id: string) => editors.find((e) => e.id === id)?.name ?? "—";

  // Column buckets
  const newOnes = parentTasks.filter((p) => !p.forwarded_to_owner && childrenOf(p.id).every((k) => k.status !== "done"));
  const inReview = parentTasks.filter((p) => !p.forwarded_to_owner && childrenOf(p.id).some((k) => k.status === "done"));
  const sent = parentTasks.filter((p) => p.forwarded_to_owner);

  const forwardToOwner = async (parent: Task, note?: string, file?: File | null) => {
    let fileMeta: { name: string; url: string } | null = null;
    if (file) {
      const res = await uploadToBucket(parent.id, file);
      fileMeta = { name: res.name, url: res.url };
      await supabase.from("task_files").insert({
        task_id: parent.id, uploaded_by: admin.id, uploader_role: "admin",
        file_name: res.name, file_url: res.url,
      });
    }
    await supabase.from("tasks").update({
      forwarded_to_owner: true,
      owner_status: "pending",
      status: "in_review",
      submitted_at: new Date().toISOString(),
      ...(fileMeta ? { submission_name: fileMeta.name, submission_url: fileMeta.url } : {}),
    }).eq("id", parent.id);
    await supabase.from("notifications").insert({
      user_id: parent.manager_id, recipient_type: "manager",
      kind: "task_forwarded", title: "Task ready for review",
      body: `${admin.name} forwarded "${parent.name}"${note ? ": " + note.slice(0, 60) : ""}`,
      task_id: parent.id,
    });
    setShowSendOwner(null); setSendOwnerNote(""); setSendOwnerFile(null);
    load();
  };

  const requestRevision = async () => {
    if (!reviewKid) return;
    let fileMeta: { name: string; url: string } | null = null;
    if (revisionFile) {
      const res = await uploadToBucket(reviewKid.id, revisionFile);
      fileMeta = { name: res.name, url: res.url };
      await supabase.from("task_files").insert({
        task_id: reviewKid.id, uploaded_by: admin.id, uploader_role: "admin",
        file_name: res.name, file_url: res.url, is_revision: true,
      });
    }
    await supabase.from("tasks").update({
      status: "revision", revision_note: revisionNote,
      revision_count: (reviewKid.revision_count ?? 0) + 1,
    }).eq("id", reviewKid.id);
    await supabase.from("notifications").insert({
      user_id: reviewKid.employee_id, recipient_type: "employee",
      kind: "task_revision", title: "Revision requested",
      body: `${admin.name}: ${revisionNote.slice(0, 80)}${fileMeta ? " (with file)" : ""}`,
      task_id: reviewKid.id,
    });
    setReviewKid(null); setRevisionNote(""); setRevisionFile(null); load();
  };

  const [ratingKid, setRatingKid] = useState<Task | null>(null);
  const [ratingStars, setRatingStars] = useState(5);

  const approveKid = async (k: Task, stars: number) => {
    await supabase.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", k.id);
    await supabase.from("task_ratings").upsert({
      task_id: k.id, ratee_id: k.employee_id, rater_id: admin.id,
      rater_role: "manager", stars,
    }, { onConflict: "task_id,rater_id" });
    await supabase.from("notifications").insert({
      user_id: k.employee_id, recipient_type: "employee",
      kind: "task_approved", title: "Subtask approved", body: `${k.name} — Rated ${stars}/5`, task_id: k.id,
    });
    setRatingKid(null); setRatingStars(5);
    load();
  };

  if (parentTasks.length === 0) return null;

  const Column = ({ title, items, tone }: { title: string; items: Task[]; tone: string }) => (
    <div className="bg-[#F3F2F7] rounded-xl p-3">
      <p className={`text-xs font-bold mb-2 ${tone}`}>{title} ({items.length})</p>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-[11px] text-[#9197B3]">Empty.</p>}
        {items.map((p) => {
          const kids = childrenOf(p.id);
          const doneKids = kids.filter((k) => k.status === "done").length;
          return (
            <button key={p.id} onClick={() => setDetail(p)} className="w-full text-left bg-white rounded-lg p-3 hover:shadow">
              <p className="text-sm font-bold text-[#333366] truncate">{p.name}</p>
              <p className="text-[10px] text-[#9197B3]">Due {p.deadline ?? "—"} • {p.priority}</p>
              {kids.length > 0 && (
                <p className="text-[10px] text-[#727FE5] mt-1">{doneKids}/{kids.length} subtasks done</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 border-2 border-[#DADCF5]">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch size={18} className="text-[#727FE5]" />
        <h3 className="font-bold text-[#333366]">Department Inbox · {admin.role}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Column title="New / In Progress" items={newOnes} tone="text-[#333366]" />
        <Column title="Submitted — Pending Review" items={inReview} tone="text-amber-700" />
        <Column title="Sent to Owner" items={sent} tone="text-green-700" />
      </div>

      {/* Detail modal */}
      {detail && (() => {
        const kids = childrenOf(detail.id);
        const parentFiles = filesOf(detail.id);
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-[#333366]">{detail.name}</h3>
                <button onClick={() => setDetail(null)}><X size={18} className="text-[#9197B3]" /></button>
              </div>
              <div className="text-sm text-[#333366] space-y-1">
                <p className="text-[11px] text-[#9197B3] flex items-center gap-2"><Clock size={11}/> Assigned {new Date(detail.created_at).toLocaleDateString()} • Due {detail.deadline ?? "—"} • {detail.priority}</p>
                {detail.description && <p className="text-[13px] bg-[#F3F2F7] rounded p-3 whitespace-pre-wrap">{detail.description}</p>}
                {detail.owner_status === "revision" && detail.revision_note && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded">
                    <strong>Owner asked for revision:</strong> {detail.revision_note}
                  </div>
                )}
              </div>

              {parentFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-[#333366] mb-2">Files</p>
                  <ul className="space-y-1">
                    {parentFiles.map((f) => (
                      <li key={f.id}><a href={f.file_url} target="_blank" rel="noreferrer" className="text-xs text-[#727FE5] inline-flex items-center gap-1 hover:underline"><Download size={12}/> {f.file_name} <span className="text-[#9197B3]">({f.uploader_role})</span></a></li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subtasks list */}
              {kids.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-bold text-[#333366] mb-2">Subtasks ({kids.length})</p>
                  <div className="space-y-2">
                    {kids.map((k) => {
                      const kfiles = filesOf(k.id);
                      const late = k.deadline && k.status !== "done" && new Date(k.deadline) < new Date();
                      return (
                        <div key={k.id} className={`rounded-lg p-3 ${late ? "bg-red-50 border border-red-300" : "bg-[#F3F2F7]"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#333366]">{k.name} <span className="text-[10px] text-[#9197B3] font-normal">→ {empName(k.employee_id)}</span></p>
                              <p className="text-[10px] text-[#9197B3]">{k.status}{(k.revision_count ?? 0) > 0 && <span className="ml-1 text-amber-600">• revisions: {k.revision_count}</span>}</p>
                              {kfiles.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {kfiles.map((f) => (
                                    <li key={f.id}><a href={f.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-[#727FE5] inline-flex items-center gap-1 hover:underline"><Paperclip size={10}/>{f.file_name} <span className="text-[#9197B3]">({f.uploader_role})</span></a></li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {(k.status === "done" || k.submission_name || kfiles.some(f => f.uploader_role === "editor")) && (
                              <div className="flex flex-col gap-1">
                                <button onClick={() => { setRatingKid(k); setRatingStars(5); }} className="px-2 h-7 rounded bg-green-600 text-white text-[10px] font-bold">Approve</button>
                                <button onClick={() => { setReviewKid(k); setRevisionNote(""); setRevisionFile(null); }} className="px-2 h-7 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1"><AlertTriangle size={10}/>Revise</button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!detail.forwarded_to_owner && (
                <div className="mt-5 flex gap-2 flex-wrap">
                  <button onClick={() => { setDistribute(detail); setDetail(null); }} className="px-4 h-10 rounded-lg bg-[#727FE5] text-white text-xs font-bold flex items-center gap-1"><GitBranch size={14}/> Distribute to team</button>
                  <button onClick={() => { setShowSendOwner(detail); setDetail(null); setSendOwnerNote(""); setSendOwnerFile(null); }} className="px-4 h-10 rounded-lg bg-green-600 text-white text-xs font-bold flex items-center gap-1"><ArrowUp size={14}/> Send to Owner</button>
                </div>
              )}
              {detail.forwarded_to_owner && (
                <p className="mt-4 text-xs text-green-700 font-bold">✓ Sent to Owner ({detail.owner_status ?? "pending"})</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Send-to-owner modal w/ optional file */}
      {showSendOwner && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSendOwner(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#333366] mb-3">Send to Owner</h3>
            <p className="text-xs text-[#9197B3] mb-3">{showSendOwner.name}</p>
            <textarea value={sendOwnerNote} onChange={(e) => setSendOwnerNote(e.target.value)} placeholder="Note (optional)" rows={3} className="w-full px-3 py-2 bg-[#F3F2F7] rounded-[8px] text-sm outline-none resize-none mb-3" />
            <label className="block">
              <span className="text-xs text-[#333366] font-bold">Attach file (optional)</span>
              <input type="file" onChange={(e) => setSendOwnerFile(e.target.files?.[0] ?? null)} className="mt-1 text-xs" />
              {sendOwnerFile && <span className="text-[10px] text-[#727FE5] block mt-1">{sendOwnerFile.name}</span>}
            </label>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowSendOwner(null)} className="px-4 h-9 rounded-[8px] border border-[#DADCF5] text-xs">Cancel</button>
              <button onClick={() => forwardToOwner(showSendOwner, sendOwnerNote, sendOwnerFile)} className="px-4 h-9 rounded-[8px] bg-green-600 text-white text-xs font-bold flex items-center gap-1"><Send size={12}/> Send</button>
            </div>
          </div>
        </div>
      )}

      {distribute && (
        <TaskDistributeWizard
          parentTask={distribute} admin={{ id: admin.id, name: admin.name }}
          editors={editors} onClose={() => setDistribute(null)} onDone={load}
        />
      )}

      {/* Revision modal w/ optional file */}
      {reviewKid && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setReviewKid(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#333366] mb-2">Request Revision</h3>
            <p className="text-xs text-[#9197B3] mb-3">{reviewKid.name} → {empName(reviewKid.employee_id)}</p>
            <textarea autoFocus value={revisionNote} onChange={(e) => setRevisionNote(e.target.value)} placeholder="What needs to change?" rows={4} className="w-full px-3 py-2 bg-[#F3F2F7] rounded-[8px] text-sm outline-none resize-none" />
            <label className="block mt-3">
              <span className="text-xs text-[#333366] font-bold">Attach file (optional)</span>
              <input type="file" onChange={(e) => setRevisionFile(e.target.files?.[0] ?? null)} className="mt-1 text-xs" />
              {revisionFile && <span className="text-[10px] text-[#727FE5] block mt-1">{revisionFile.name}</span>}
            </label>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setReviewKid(null)} className="px-4 h-9 rounded-[8px] border border-[#DADCF5] text-xs">Cancel</button>
              <button disabled={!revisionNote.trim()} onClick={requestRevision} className="px-4 h-9 rounded-[8px] bg-amber-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"><Send size={12}/> Send</button>
            </div>
          </div>
        </div>
      )}

      {ratingKid && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setRatingKid(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-sm p-6 shadow-2xl text-center">
            <h3 className="text-lg font-bold text-[#333366] mb-2">Rate this work</h3>
            <p className="text-xs text-[#9197B3] mb-4">How would you rate "{ratingKid.name}"?</p>
            <div className="flex justify-center mb-5"><StarRating value={ratingStars} onChange={setRatingStars} size={28} /></div>
            <div className="flex gap-2">
              <button onClick={() => setRatingKid(null)} className="flex-1 h-10 rounded-[8px] border border-[#DADCF5] text-xs font-bold text-[#333366]">Cancel</button>
              <button onClick={() => approveKid(ratingKid, ratingStars)} className="flex-1 h-10 rounded-[8px] bg-green-600 text-white text-xs font-bold">Approve</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

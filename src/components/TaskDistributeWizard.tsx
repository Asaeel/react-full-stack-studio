import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase as _s } from "@/integrations/supabase/client";
const supabase: any = _s;

type Editor = { id: string; name: string; email: string; role?: string };

type SubDraft = {
  name: string;
  description: string;
  priority: "low" | "medium" | "high";
  deadline: string;
  employeeId: string;
};

const blank = (): SubDraft => ({
  name: "",
  description: "",
  priority: "medium",
  deadline: "",
  employeeId: "",
});

export default function TaskDistributeWizard({
  parentTask,
  admin,
  editors,
  onClose,
  onDone,
}: {
  parentTask: any;
  admin: { id: string; name: string };
  editors: Editor[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [count, setCount] = useState(2);
  const [step, setStep] = useState(0); // 0 = count, 1..count = subtask forms
  const [subs, setSubs] = useState<SubDraft[]>([blank(), blank()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const setCountSafe = (n: number) => {
    const v = Math.max(1, Math.min(20, n));
    setCount(v);
    setSubs((arr) => {
      const next = arr.slice(0, v);
      while (next.length < v) next.push(blank());
      return next;
    });
  };

  const updateSub = (i: number, patch: Partial<SubDraft>) =>
    setSubs((arr) => arr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const removeSub = (i: number) => {
    if (subs.length <= 1) return;
    setSubs((arr) => arr.filter((_, idx) => idx !== i));
    setCount((c) => c - 1);
    setStep((s) => Math.max(1, Math.min(s, subs.length - 1)));
  };

  const addSub = () => {
    setSubs((arr) => [...arr, blank()]);
    setCount((c) => c + 1);
    setStep(subs.length + 1);
  };

  const save = async () => {
    setErr("");
    for (const s of subs) {
      if (!s.name.trim()) return setErr("Each subtask needs a name");
      if (!s.employeeId) return setErr("Each subtask needs an assignee");
    }
    setSaving(true);
    try {
      const rows = subs.map((s) => ({
        manager_id: parentTask.manager_id,
        employee_id: s.employeeId,
        name: s.name.trim(),
        project_name: parentTask.project_name,
        priority: s.priority,
        deadline: s.deadline || null,
        status: "pending",
        parent_task_id: parentTask.id,
        assigned_by: admin.id,
        assigned_by_role: "admin",
        description: s.description || null,
      }));
      const { data: inserted, error } = await supabase.from("tasks").insert(rows).select("id,employee_id,name");
      if (error) throw error;
      // notifications for editors
      const notes = (inserted ?? []).map((t: any) => ({
        user_id: t.employee_id,
        recipient_type: "employee",
        kind: "task_new",
        title: "New task from " + admin.name,
        body: t.name,
        task_id: t.id,
      }));
      if (notes.length) await supabase.from("notifications").insert(notes);
      onDone();
      onClose();
    } catch (e: any) {
      setErr(e.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#333366]">Distribute Task</h3>
            <p className="text-[11px] text-[#9197B3]">{parentTask.name}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-[#9197B3]" /></button>
        </div>

        {step === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-[#333366]">How many subtasks?</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setCountSafe(count - 1)} className="w-9 h-9 rounded-full bg-[#F3F2F7] font-bold">-</button>
              <input
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(e) => setCountSafe(parseInt(e.target.value) || 1)}
                className="w-20 h-10 text-center bg-[#F3F2F7] rounded-lg font-bold text-[#333366]"
              />
              <button onClick={() => setCountSafe(count + 1)} className="w-9 h-9 rounded-full bg-[#F3F2F7] font-bold">+</button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 h-9 rounded-[8px] border border-[#DADCF5] text-xs">Cancel</button>
              <button onClick={() => setStep(1)} className="px-4 h-9 rounded-[8px] bg-[#727FE5] text-white text-xs font-bold flex items-center gap-1">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9197B3]">
              <span>Subtask {step} of {subs.length}</span>
              <div className="flex gap-1">
                <button onClick={addSub} className="px-2 py-1 rounded bg-[#F3F2F7] text-[#333366] flex items-center gap-1"><Plus size={12} /> Add</button>
                {subs.length > 1 && (
                  <button onClick={() => removeSub(step - 1)} className="px-2 py-1 rounded bg-red-50 text-red-600 flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                )}
              </div>
            </div>

            {(() => {
              const i = step - 1;
              const s = subs[i];
              return (
                <div className="space-y-2">
                  <input placeholder="Subtask name" value={s.name} onChange={(e) => updateSub(i, { name: e.target.value })} className="w-full h-10 px-3 bg-[#F3F2F7] rounded-[8px] text-sm outline-none" />
                  <textarea placeholder="Description" value={s.description} onChange={(e) => updateSub(i, { description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[#F3F2F7] rounded-[8px] text-sm outline-none resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={s.employeeId} onChange={(e) => updateSub(i, { employeeId: e.target.value })} className="h-10 px-3 bg-[#F3F2F7] rounded-[8px] text-sm outline-none">
                      <option value="">Assign to…</option>
                      {editors.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    <select value={s.priority} onChange={(e) => updateSub(i, { priority: e.target.value as any })} className="h-10 px-3 bg-[#F3F2F7] rounded-[8px] text-sm outline-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <input type="date" value={s.deadline} onChange={(e) => updateSub(i, { deadline: e.target.value })} className="w-full h-10 px-3 bg-[#F3F2F7] rounded-[8px] text-sm outline-none" />
                </div>
              );
            })()}

            {err && <p className="text-xs text-red-500">{err}</p>}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep((s) => s - 1)} className="px-4 h-9 rounded-[8px] border border-[#DADCF5] text-xs flex items-center gap-1">
                <ChevronLeft size={14} /> {step === 1 ? "Count" : "Back"}
              </button>
              {step < subs.length ? (
                <button onClick={() => setStep((s) => s + 1)} className="px-4 h-9 rounded-[8px] bg-[#727FE5] text-white text-xs font-bold flex items-center gap-1">
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button disabled={saving} onClick={save} className="px-4 h-9 rounded-[8px] bg-green-600 text-white text-xs font-bold disabled:opacity-50">
                  {saving ? "Saving…" : "Distribute"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

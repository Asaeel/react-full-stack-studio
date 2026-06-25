import { useEffect, useRef, useState } from "react";
import { Bell, Check, X, FileText, SlidersHorizontal, EyeOff, Eye } from "lucide-react";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;

type Notif = {
  id: string;
  request_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};
type Req = {
  id: string;
  manager_name: string | null;
  company_name: string;
  recipient_email: string;
  amount: number;
  reason: string | null;
  repayment_period: string | null;
  request_date: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  status: string;
};

export default function FundingVoteInbox({
  employee,
  onNotify,
}: {
  employee: { id: string; name: string; email: string; role?: string };
  onNotify?: (n: { title: string; body: string; requestId?: string }) => void;
}) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [requests, setRequests] = useState<Record<string, Req>>({});
  const [voting, setVoting] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Notif | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const knownNotifIds = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterDate, setFilterDate] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const storageKey = `emp_hidden_funding_ids_${employee.id}`;
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });
  const toggleHide = (id: string) => {
    const s = new Set(hiddenIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setHiddenIds(s);
    try { localStorage.setItem(storageKey, JSON.stringify(Array.from(s))); } catch {}
  };

  const isFinancial = (employee.role || "").toLowerCase().includes("financ");

  const load = async () => {
    const { data } = await supabase
      .from("funding_notifications")
      .select("*")
      .eq("target_employee_id", employee.id)
      .order("created_at", { ascending: false });
    if (!data) return;
    const list = data as Notif[];
    // Emit local UI notifications for newly arrived vote requests
    if (seededRef.current && onNotify) {
      for (const n of list) {
        if (!knownNotifIds.current.has(n.id) && n.kind === "vote_request") {
          onNotify({ title: n.title, body: n.body || "", requestId: n.request_id || undefined });
        }
      }
    }
    knownNotifIds.current = new Set(list.map((n) => n.id));
    seededRef.current = true;
    setNotifs(list);
    const ids = Array.from(new Set(data.map((n: any) => n.request_id).filter(Boolean)));
    if (ids.length > 0) {
      const { data: reqs } = await supabase.from("funding_requests").select("*").in("id", ids);
      if (reqs) {
        const map: Record<string, Req> = {};
        (reqs as any[]).forEach((r) => { map[r.id] = r; });
        setRequests(map);
      }
    }
  };

  useEffect(() => {
    if (!isFinancial) return;
    load();
    const ch = supabase
      .channel("emp-fn-" + employee.id + "-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "funding_notifications", filter: `target_employee_id=eq.${employee.id}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "funding_requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [employee.id, isFinancial]);

  const approve = async (notif: Notif) => {
    if (!notif.request_id) return;
    setVoting(notif.id);
    await supabase.from("funding_votes").insert({
      request_id: notif.request_id,
      voter_employee_id: employee.id,
      voter_name: employee.name,
      decision: "approve",
    });
    await supabase.from("funding_requests").update({ status: "pending_send" }).eq("id", notif.request_id);

    const { data: reqRow } = await supabase.from("funding_requests").select("manager_id, company_name, amount").eq("id", notif.request_id).maybeSingle();
    if (reqRow) {
      await supabase.from("funding_notifications").insert({
        request_id: notif.request_id,
        target_manager_id: (reqRow as any).manager_id,
        kind: "vote_approved",
        title: "Funding vote approved ✅",
        body: `${employee.name} approved the funding request of ${Number((reqRow as any).amount).toLocaleString()} SAR for ${(reqRow as any).company_name}.`,
      });
    }
    await supabase.from("funding_notifications").update({ read: true }).eq("id", notif.id);
    setVoting(null);
    await load();
  };

  const submitReject = async () => {
    if (!rejectFor || !rejectFor.request_id) return;
    const notif = rejectFor;
    const requestId = notif.request_id as string;
    const reason = rejectReason.trim() || "No reason provided";
    setVoting(notif.id);
    await supabase.from("funding_votes").insert({
      request_id: requestId,
      voter_employee_id: employee.id,
      voter_name: employee.name,
      decision: "reject",
    });
    await supabase.from("funding_requests").update({
      status: "rejected",
      rejection_reason: reason,
      rejected_by_name: employee.name,
    }).eq("id", requestId);

    const { data: reqRow } = await supabase.from("funding_requests").select("manager_id, company_name, amount").eq("id", requestId).maybeSingle();

    if (reqRow) {
      await supabase.from("funding_notifications").insert({
        request_id: notif.request_id,
        target_manager_id: (reqRow as any).manager_id,
        kind: "vote_rejected",
        title: "Funding vote rejected ❌",
        body: `${employee.name} rejected the funding request for ${(reqRow as any).company_name} (${Number((reqRow as any).amount).toLocaleString()} SAR).\nReason: ${reason}`,
      });
    }
    await supabase.from("funding_notifications").update({ read: true }).eq("id", notif.id);
    setRejectFor(null);
    setRejectReason("");
    setVoting(null);
    await load();
  };

  if (!isFinancial) return null;

  const pending = notifs.filter((n) => !n.read && n.kind === "vote_request");

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center gap-2">
          <Bell className="text-[#727FE5]" size={18} />
          <h3 className="font-bold text-[#333366]">Funding Requests {pending.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 h-5 rounded-full bg-[#848FE1] text-white text-[10px]">{pending.length}</span>
          )}</h3>
        </div>
        <button
          onClick={() => setFilterOpen((v) => !v)}
          className="flex items-center justify-center w-9 h-9 bg-white border border-[#DADCF5] text-[#333366] rounded-[8px] hover:bg-[#F3F2F7]"
          title="Filter requests"
        >
          <SlidersHorizontal size={14} />
        </button>
        {filterOpen && (
          <div className="absolute right-0 top-11 z-40 bg-white border border-[#DADCF5] rounded-[12px] shadow-xl p-4 w-72 space-y-3">
            <div>
              <p className="text-[11px] uppercase font-bold text-[#9197B3] mb-2">Sort</p>
              <div className="flex gap-2">
                <button onClick={() => setSortOrder("newest")} className={`flex-1 h-9 rounded-[8px] text-xs font-bold ${sortOrder === "newest" ? "bg-[#848FE1] text-white" : "bg-[#F3F2F7] text-[#333366]"}`}>Newest</button>
                <button onClick={() => setSortOrder("oldest")} className={`flex-1 h-9 rounded-[8px] text-xs font-bold ${sortOrder === "oldest" ? "bg-[#848FE1] text-white" : "bg-[#F3F2F7] text-[#333366]"}`}>Oldest</button>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase font-bold text-[#9197B3] mb-2">Filter by date</p>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full h-9 px-3 border border-[#DADCF5] rounded-[8px] text-sm text-[#333366] focus:outline-none"
              />
              {filterDate && (
                <button onClick={() => setFilterDate("")} className="mt-1 text-[11px] text-[#727FE5] hover:underline">Clear date</button>
              )}
            </div>
            <div className="pt-2 border-t border-[#DADCF5]">
              <label className="flex items-center gap-2 text-xs text-[#333366] cursor-pointer">
                <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
                Show hidden ({hiddenIds.size})
              </label>
            </div>
          </div>
        )}
      </div>
      {notifs.length === 0 ? (
        <p className="text-xs text-[#9197B3]">No funding requests yet.</p>
      ) : (
        <div className="space-y-4">
          {notifs
            .filter((n) => {
              const isHidden = hiddenIds.has(n.id);
              if (showHidden) return isHidden;
              if (isHidden) return false;
              if (filterDate) {
                const req = n.request_id ? requests[n.request_id] : null;
                const d = req?.request_date || n.created_at.slice(0, 10);
                if (d !== filterDate) return false;
              }
              return true;
            })
            .sort((a, b) => {
              const ta = new Date(a.created_at).getTime();
              const tb = new Date(b.created_at).getTime();
              return sortOrder === "newest" ? tb - ta : ta - tb;
            })
            .map((n) => {
            const req = n.request_id ? requests[n.request_id] : null;
            const isVoteReq = n.kind === "vote_request";
            const decided = req && req.status !== "pending_vote";
            const hidden = hiddenIds.has(n.id);
            return (
              <div key={n.id} className={`rounded-xl border p-4 ${n.read || decided ? "bg-[#F3F2F7] border-[#DADCF5]" : "bg-white border-[#848FE1]"}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#333366]">{n.title}</p>
                    {req && (
                      <p className="text-xs text-[#9197B3] mt-0.5">
                        {req.manager_name || "Manager"} • {Number(req.amount).toLocaleString()} SAR → {req.company_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {req && req.attachment_name && (
                    req.attachment_url ? (
                      <button
                        onClick={async () => {
                          const { data } = await supabase.storage.from("funding-attachments").createSignedUrl(req.attachment_url!, 60 * 10);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                        }}
                        className="text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DADCF5] text-[#333366] hover:bg-[#F3F2F7]"
                      >
                        <FileText size={10} /> {req.attachment_name} ↓
                      </button>
                    ) : (
                      <span className="text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-[#DADCF5] text-[#333366]">
                        <FileText size={10} /> {req.attachment_name}
                      </span>
                    )
                    )}
                    <button
                      onClick={() => toggleHide(n.id)}
                      className="text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded text-[#9197B3] hover:text-[#333366] hover:bg-[#F3F2F7]"
                      title={hidden ? "Unhide" : "Hide"}
                    >
                      {hidden ? <><Eye size={10} /> Unhide</> : <><EyeOff size={10} /> Hide</>}
                    </button>
                  </div>
                </div>
                {n.body && (
                  <div className="mt-3 text-[12px] text-[#333366] bg-white rounded p-3 border border-[#DADCF5]/60 space-y-2">
                    <p className="text-[11px] text-[#9197B3]">
                      <span className="font-bold text-[#333366]">To:</span> {employee.email}
                    </p>
                    <p className="whitespace-pre-wrap">{n.body}</p>
                  </div>
                )}
                {isVoteReq && (decided ? (
                  <p className="mt-3 text-[11px] font-bold uppercase text-[#9197B3]">Status: {req!.status.replace("_"," ")}</p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={voting === n.id}
                      onClick={() => approve(n)}
                      className="flex items-center gap-1 px-4 h-9 rounded-[8px] bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      <Check size={14} /> Approve
                    </button>
                    <button
                      disabled={voting === n.id}
                      onClick={() => { setRejectFor(n); setRejectReason(""); }}
                      className="flex items-center gap-1 px-4 h-9 rounded-[8px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      <X size={14} /> Reject
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {rejectFor && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => !voting && setRejectFor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[16px] p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#333366] mb-2">Reject funding request</h3>
            <p className="text-xs text-[#9197B3] mb-3">Please explain why this request is being rejected. The manager will see this reason.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="Reason for rejection..."
              className="w-full p-3 border border-[#DADCF5] rounded-[8px] text-sm text-[#333366] focus:outline-none focus:border-[#848FE1] resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectFor(null)} disabled={!!voting} className="px-4 h-10 rounded-[8px] border border-[#DADCF5] text-sm">Cancel</button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || !!voting}
                className="px-4 h-10 rounded-[8px] bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

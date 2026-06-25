import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, X, Loader2, SlidersHorizontal, EyeOff, Eye } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;
import { generateFundingMessage } from "@/lib/funding.functions";

type Employee = { id?: string; name: string; email: string; role: string };
type FundingRequest = {
  id: string;
  manager_id: string;
  manager_name: string | null;
  recipient_email: string;
  company_name: string;
  request_date: string | null;
  amount: number;
  reason: string | null;
  repayment_period: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  mode: "vote" | "immediate";
  status: "pending_vote" | "pending_send" | "sent" | "rejected" | "cancelled" | "pending";
  ai_message: string | null;
  rejection_reason: string | null;
  rejected_by_name: string | null;
  created_at: string;
};


const VOTE_THRESHOLD = 250000;

export default function FundingRequestsPanel({
  managerName,
  members,
  notify,
}: {
  managerName: string;
  members: Employee[];
  notify: (title: string, body?: string) => void;
}) {
  const genAi = useServerFn(generateFundingMessage);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmSend, setConfirmSend] = useState<FundingRequest | null>(null);
  const [rejectedInfo, setRejectedInfo] = useState<FundingRequest | null>(null);
  const handledPendingRef = useRef<Set<string>>(new Set());

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterDate, setFilterDate] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem("mgr_hidden_funding_ids");
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });
  const persistHidden = (s: Set<string>) => {
    setHiddenIds(new Set(s));
    try { localStorage.setItem("mgr_hidden_funding_ids", JSON.stringify(Array.from(s))); } catch {}
  };
  const toggleHide = (id: string) => {
    const s = new Set(hiddenIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    persistHidden(s);
  };
  const [immediateConfirm, setImmediateConfirm] = useState<null | {
    submit: () => Promise<void>;
    recipient: string;
  }>(null);


  const [form, setForm] = useState({
    recipient_email: "",
    company_name: "",
    request_date: new Date().toISOString().slice(0, 10),
    amount: "",
    reason: "",
    repayment_period: "",
    attachment_name: "",
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const amountNum = Number(form.amount.replace(/[^\d.]/g, "")) || 0;
  const willVote = amountNum >= VOTE_THRESHOLD;

  // Load requests
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("funding_requests")
      .select("*")
      .eq("manager_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setRequests(data as FundingRequest[]);
    // Auto-surface any request that finished voting while manager wasn't here
    const list = (data || []) as FundingRequest[];
    const pendingSend = list.find(
      (r) => r.status === "pending_send" && !handledPendingRef.current.has(r.id),
    );
    if (pendingSend) {
      handledPendingRef.current.add(pendingSend.id);
      setConfirmSend((cur) => cur || pendingSend);
    }
  };

  useEffect(() => {
    load();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const ch = supabase
        .channel("mgr-funding-" + user.id + "-" + Math.random().toString(36).slice(2))
        .on("postgres_changes", { event: "*", schema: "public", table: "funding_requests", filter: `manager_id=eq.${user.id}` }, () => load())
        .on("postgres_changes", { event: "*", schema: "public", table: "funding_votes" }, () => load())
        .subscribe();
      channel = ch;
      if (cancelled) supabase.removeChannel(ch);
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, []);

  // Listen for manager-targeted notifications (vote results)
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const ch = supabase
        .channel("mgr-fn-" + user.id + "-" + Math.random().toString(36).slice(2))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "funding_notifications", filter: `target_manager_id=eq.${user.id}` }, (payload: any) => {
          const n: any = payload.new;
          notify(n.title, n.body || "");
          if (n.kind === "vote_approved" && n.request_id) {
            const req = requests.find((r) => r.id === n.request_id);
            if (req) setConfirmSend(req);
            else {
              supabase.from("funding_requests").select("*").eq("id", n.request_id).maybeSingle()
                .then(({ data }: any) => { if (data) setConfirmSend(data as FundingRequest); });
            }
          }
          if (n.kind === "vote_rejected" && n.request_id) {
            supabase.from("funding_requests").select("*").eq("id", n.request_id).maybeSingle()
              .then(({ data }: any) => { if (data) setRejectedInfo(data as FundingRequest); });
          }
        })

        .subscribe();
      channel = ch;
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [requests, notify]);

  const openForm = () => {
    setForm({
      recipient_email: "",
      company_name: "",
      request_date: new Date().toISOString().slice(0, 10),
      amount: "",
      reason: "",
      repayment_period: "",
      attachment_name: "",
    });
    setAttachmentFile(null);
    setShowErrors(false);
    setShowForm(true);
  };

  const uploadAttachment = async (userId: string): Promise<{ name: string; url: string } | null> => {
    if (!attachmentFile) return null;
    const safe = attachmentFile.name.replace(/[^\w.\-]+/g, "_");
    const path = `${userId}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("funding-attachments").upload(path, attachmentFile, { upsert: false });
    if (error) { notify("Upload failed", error.message); return null; }
    return { name: attachmentFile.name, url: path };
  };

  const validate = () => {
    setShowErrors(true);
    return (
      form.recipient_email.trim() &&
      form.company_name.trim() &&
      form.request_date &&
      amountNum > 0 &&
      form.reason.trim() &&
      form.repayment_period
    );
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    // Upload attachment first (if any)
    const uploaded = await uploadAttachment(user.id);

    const mode: "vote" | "immediate" = willVote ? "vote" : "immediate";

    if (mode === "immediate") {
      // Ask for confirmation first
      setImmediateConfirm({
        recipient: form.recipient_email,
        submit: async () => {
          const inserted = await actuallyInsert(user.id, "immediate", "sent", uploaded);
          setImmediateConfirm(null);
          setShowForm(false);
          setSubmitting(false);
          if (inserted) {
            openMailtoFor(inserted);
            notify("Funding request sent", `Sent to ${form.recipient_email}`);
          }
        },
      });
      setSubmitting(false);
      return;
    }

    // Vote flow: insert request then notify financial employees
    const inserted = await actuallyInsert(user.id, "vote", "pending_vote", uploaded);
    if (!inserted) { setSubmitting(false); return; }

    // Generate AI message
    let aiMessage = "";
    try {
      const r = await genAi({
        data: {
          managerName,
          companyName: form.company_name,
          recipientEmail: form.recipient_email,
          amount: amountNum,
          reason: form.reason,
          repaymentPeriod: form.repayment_period,
          attachmentName: form.attachment_name,
        },
      });
      aiMessage = r.message;
    } catch (e) {
      console.error(e);
      aiMessage = `طلب تمويل من ${managerName} بمبلغ ${amountNum.toLocaleString()} ر.س للشركة ${form.company_name}. الرجاء التصويت.`;
    }
    await supabase.from("funding_requests").update({ ai_message: aiMessage }).eq("id", inserted.id);

    // Notify each financial employee
    const financial = members.filter((m) => (m.role || "").toLowerCase().includes("financ"));
    if (financial.length === 0) {
      notify("No financial team", "Add an employee with role 'Financial' to receive vote requests.");
    } else {
      const rows = financial
        .filter((e) => e.id)
        .map((e) => ({
          request_id: inserted.id,
          target_employee_id: e.id!,
          kind: "vote_request",
          title: "New funding vote request",
          body: aiMessage,
        }));
      if (rows.length > 0) {
        await supabase.from("funding_notifications").insert(rows);
      }
    }

    notify("Funding request submitted", "Waiting for the financial team's vote.");
    setShowForm(false);
    setSubmitting(false);
  };

  const actuallyInsert = async (
    managerId: string,
    mode: "vote" | "immediate",
    status: FundingRequest["status"],
    uploaded: { name: string; url: string } | null,
  ) => {
    const { data, error } = await supabase
      .from("funding_requests")
      .insert({
        manager_id: managerId,
        manager_name: managerName,
        recipient_email: form.recipient_email.trim(),
        company_name: form.company_name.trim(),
        request_date: form.request_date,
        amount: amountNum,
        reason: form.reason.trim(),
        repayment_period: form.repayment_period,
        attachment_name: uploaded?.name || form.attachment_name || null,
        attachment_url: uploaded?.url || null,
        mode,
        status,
      })
      .select()
      .single();
    if (error) { notify("Error", error.message); return null; }
    return data as FundingRequest;
  };

  const buildEmailBody = (r: FundingRequest) => {
    const amount = Number(r.amount).toLocaleString();
    const lines = [
      `Dear ${r.company_name} Management,`,
      ``,
      `I hope this message finds you well.`,
      ``,
      `On behalf of our company, I am writing to formally request your approval for a funding amount of ${amount} SAR.`,
      ``,
      `Purpose of the request: ${r.reason || "—"}`,
      `Proposed repayment period: ${r.repayment_period || "—"}`,
      `Request date: ${r.request_date || new Date().toISOString().slice(0,10)}`,
      ``,
      `This request has been reviewed and approved internally by our financial team. We kindly ask for your consideration and look forward to your response.`,
      ``,
      `Thank you for your time and partnership.`,
      ``,
      `Best regards,`,
      `${r.manager_name || managerName}`,
    ];
    return lines.join("\n");
  };

  const openMailtoFor = (r: FundingRequest) => {
    const subject = `Funding Request — ${Number(r.amount).toLocaleString()} SAR — ${r.company_name}`;
    const body = buildEmailBody(r);
    const url = `mailto:${encodeURIComponent(r.recipient_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== "undefined") window.location.href = url;
  };

  const notifyFinancial = async (requestId: string, kind: string, title: string, body: string) => {
    const financial = members.filter((m) => m.id && (m.role || "").toLowerCase().includes("financ"));
    if (financial.length === 0) return;
    await supabase.from("funding_notifications").insert(
      financial.map((e) => ({
        request_id: requestId,
        target_employee_id: e.id!,
        kind,
        title,
        body,
      })),
    );
  };

  const confirmAndSend = async () => {
    if (!confirmSend) return;
    const r = confirmSend;
    await supabase.from("funding_requests").update({ status: "sent" }).eq("id", r.id);
    openMailtoFor(r);
    notify("Funding request sent", `Email opened for ${r.recipient_email}`);
    await notifyFinancial(
      r.id,
      "manager_sent",
      "Funding request sent",
      `${managerName} sent the funding request for ${r.company_name} (${Number(r.amount).toLocaleString()} SAR) to ${r.recipient_email}.`,
    );
    setConfirmSend(null);
  };

  const cancelSend = async () => {
    if (!confirmSend) return;
    const r = confirmSend;
    await supabase.from("funding_requests").update({ status: "cancelled" }).eq("id", r.id);
    notify("Funding request cancelled", "");
    await notifyFinancial(
      r.id,
      "manager_cancelled",
      "Funding request cancelled",
      `${managerName} cancelled the funding request for ${r.company_name}.`,
    );
    setConfirmSend(null);
  };



  const isError = (v: string | number) => showErrors && (!v || (typeof v === "number" && v <= 0));

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-5xl font-hind font-bold text-[#333366]">Request Funds</h1>
          <p className="text-[#9197B3] font-inter text-sm">Submit funding requests and track approvals</p>
        </div>
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center justify-center w-12 h-12 bg-white border border-[#DADCF5] text-[#333366] rounded-[12px] shadow-sm hover:bg-[#F3F2F7] transition-all"
            title="Filter requests"
          >
            <SlidersHorizontal size={18} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-14 z-40 bg-white border border-[#DADCF5] rounded-[12px] shadow-xl p-4 w-72 space-y-3">
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
          <button
            onClick={openForm}
            className="flex items-center gap-2 px-5 h-12 bg-gradient-to-r from-[#727FE5] to-[#3F467F] text-white font-bold rounded-[12px] shadow-lg hover:opacity-90 transition-all"
          >
            <Plus size={18} /> Add Funding Request
          </button>
        </div>
      </div>

      {/* Requests list */}
      <div className="space-y-4">
        {requests.length === 0 && (
          <div className="bg-white rounded-[15px] p-10 text-center border border-dashed border-[#DADCF5] text-[#9197B3]">
            No funding requests yet. Click "Add Funding Request" to create one.
          </div>
        )}
        {requests
          .filter((r) => {
            const isHidden = hiddenIds.has(r.id);
            if (showHidden) return isHidden;
            if (isHidden) return false;
            if (filterDate && r.request_date !== filterDate) return false;
            return true;
          })
          .sort((a, b) => {
            const ta = new Date(a.created_at).getTime();
            const tb = new Date(b.created_at).getTime();
            return sortOrder === "newest" ? tb - ta : ta - tb;
          })
          .map((r) => {
          const waiting = r.status === "pending_vote";
          const sent = r.status === "sent";
          const cancelled = r.status === "cancelled";
          const rejected = r.status === "rejected";
          const hidden = hiddenIds.has(r.id);
          return (
            <div key={r.id} className={`bg-white rounded-[15px] shadow-sm border border-[#DADCF5]/50 p-6 relative ${waiting ? "opacity-70" : ""}`}>
              {waiting && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="px-6 py-3 rounded-full bg-[#3F467F] text-white text-lg font-bold shadow-lg flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Waiting for approval
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[#333366]">{r.company_name}</h3>
                  <p className="text-xs text-[#9197B3]">{r.recipient_email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#333366]">{Number(r.amount).toLocaleString()} <span className="text-xs">SAR</span></p>
                  <p className="text-[10px] text-[#9197B3] uppercase mt-1">{r.mode === "vote" ? "Sent to vote" : "Immediate"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                <div><span className="text-[#9197B3]">Date:</span> <span className="font-bold text-[#333366]">{r.request_date}</span></div>
                <div><span className="text-[#9197B3]">Repayment:</span> <span className="font-bold text-[#333366]">{r.repayment_period}</span></div>
                <div className="col-span-2"><span className="text-[#9197B3]">Reason:</span> <span className="text-[#333366]">{r.reason}</span></div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  sent ? "bg-green-100 text-green-700" :
                  rejected ? "bg-red-100 text-red-700" :
                  cancelled ? "bg-gray-200 text-gray-600" :
                  waiting ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {r.status.replace("_", " ")}
                </span>
                <button
                  onClick={() => toggleHide(r.id)}
                  className="flex items-center gap-1 text-[11px] text-[#9197B3] hover:text-[#333366]"
                  title={hidden ? "Unhide" : "Hide"}
                >
                  {hidden ? <><Eye size={12} /> Unhide</> : <><EyeOff size={12} /> Hide</>}
                </button>
              </div>
              {rejected && r.rejection_reason && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-[8px] p-3">
                  <p className="text-[10px] text-red-600 uppercase font-bold mb-1">Rejected by {r.rejected_by_name || "—"}</p>
                  <p className="text-xs text-[#333366] whitespace-pre-wrap">{r.rejection_reason}</p>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !submitting && setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] w-full max-w-3xl p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#333366]">New Funding Request</h2>
              <button onClick={() => !submitting && setShowForm(false)}><X className="text-[#9197B3]" /></button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Company Manager Email"
                    value={form.recipient_email}
                    onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                    className={`w-full h-14 px-4 border-[0.5px] rounded-[8px] bg-white text-[#333366] focus:outline-none ${isError(form.recipient_email) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                  />
                  {isError(form.recipient_email) && <p className="absolute -bottom-5 left-2 text-[10px] text-red-500">Please enter recipient email</p>}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    className={`w-full h-14 px-4 border-[0.5px] rounded-[8px] bg-white text-[#333366] focus:outline-none ${isError(form.company_name) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                  />
                  {isError(form.company_name) && <p className="absolute -bottom-5 left-2 text-[10px] text-red-500">Please enter company name</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    type="date"
                    value={form.request_date}
                    onChange={(e) => setForm({ ...form, request_date: e.target.value })}
                    className={`w-full h-14 px-4 border-[0.5px] rounded-[8px] bg-white text-[#333366] focus:outline-none ${isError(form.request_date) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                  />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Request Amount (SAR)"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className={`w-full h-14 px-4 border-[0.5px] rounded-[8px] bg-[#E0E4F9] text-[#333366] focus:outline-none ${isError(amountNum) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                  />
                  {isError(amountNum) && <p className="absolute -bottom-5 left-2 text-[10px] text-red-500">Please enter the amount</p>}
                </div>
              </div>

              <input
                type="text"
                placeholder="Reason for Request..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className={`w-full h-14 px-4 border-[0.5px] rounded-[8px] bg-white text-[#333366] focus:outline-none ${isError(form.reason) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
              />

              <div className="relative">
                <select
                  value={form.repayment_period}
                  onChange={(e) => setForm({ ...form, repayment_period: e.target.value })}
                  className={`w-full h-14 px-4 border-[0.5px] rounded-[8px] bg-white text-[#333366] focus:outline-none appearance-none cursor-pointer ${isError(form.repayment_period) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                >
                  <option value="">Proposed Repayment Period</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                </select>
                <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#333366] pointer-events-none" />
              </div>

              <div className="flex items-center justify-between h-14 px-4 border-[0.5px] border-[#333366] rounded-[8px] bg-white">
                <span className="text-[#333366]/60 truncate pr-4 text-sm">
                  {form.attachment_name || "Attach Supporting Documents"}
                </span>
                <input
                  type="file"
                  ref={fileRef}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setForm({ ...form, attachment_name: f.name }); setAttachmentFile(f); }
                  }}
                />
                <button onClick={() => fileRef.current?.click()} className="px-5 py-1.5 bg-[#DADCF5] text-[#333366] text-sm font-bold rounded-[6px]">Upload File</button>
              </div>

              {/* Mode buttons — auto-activated by amount */}
              <div className="flex gap-4 pt-2">
                <button
                  disabled
                  className={`flex-1 h-12 text-sm font-bold rounded-[10px] transition-all ${willVote ? "bg-[#848FE1] text-white shadow-md" : "bg-white border-2 border-[#DADCF5] text-[#9197B3]"}`}
                >
                  Send to Vote {willVote && "(active)"}
                </button>
                <button
                  disabled
                  className={`flex-1 h-12 text-sm font-bold rounded-[10px] transition-all ${!willVote && amountNum > 0 ? "bg-[#848FE1] text-white shadow-md" : "bg-white border-2 border-[#DADCF5] text-[#9197B3]"}`}
                >
                  Request Immediate Approval {!willVote && amountNum > 0 && "(active)"}
                </button>
              </div>
              <p className="text-[11px] text-[#9197B3] text-center">
                Amounts ≥ {VOTE_THRESHOLD.toLocaleString()} SAR require a vote from the financial team. Smaller amounts go directly to the recipient.
              </p>

              <button
                onClick={submit}
                disabled={submitting || amountNum <= 0}
                className="w-full h-20 mt-4 bg-gradient-to-r from-[#727FE5] to-[#3F467F] text-white text-3xl font-bold rounded-[15px] shadow-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {submitting ? <><Loader2 className="animate-spin" /> Submitting…</> : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Immediate-approval confirm dialog */}
      {immediateConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#333366] mb-2">Confirm Send</h3>
            <p className="text-sm text-[#333366] mb-6">
              Are you sure you want to send this funding request to <span className="font-bold">{immediateConfirm.recipient}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setImmediateConfirm(null)} className="px-4 h-10 rounded-[8px] border border-[#DADCF5] text-sm">Cancel</button>
              <button onClick={() => immediateConfirm.submit()} className="px-4 h-10 rounded-[8px] bg-[#848FE1] text-white text-sm font-bold">Yes, send</button>
            </div>
          </div>
        </div>
      )}

      {/* Vote-approved confirm dialog */}
      {confirmSend && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[16px] p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-[#333366] mb-2">Funding request approved ✅</h3>
            <p className="text-sm text-[#333366] mb-6">
              The financial team approved the funding request for <span className="font-bold">{confirmSend.company_name}</span> ({Number(confirmSend.amount).toLocaleString()} SAR). Do you want to send the email now to <span className="font-bold">{confirmSend.recipient_email}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={cancelSend} className="px-4 h-10 rounded-[8px] border border-[#DADCF5] text-sm">No, cancel</button>
              <button onClick={confirmAndSend} className="px-4 h-10 rounded-[8px] bg-[#848FE1] text-white text-sm font-bold">Yes, send</button>
            </div>
          </div>
        </div>
      )}

      {/* Vote-rejected dialog */}
      {rejectedInfo && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setRejectedInfo(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[16px] p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-red-600 mb-2">Funding request not approved ❌</h3>
            <p className="text-sm text-[#333366] mb-3">
              The funding request for <span className="font-bold">{rejectedInfo.company_name}</span> ({Number(rejectedInfo.amount).toLocaleString()} SAR) was rejected by <span className="font-bold">{rejectedInfo.rejected_by_name || "the financial team"}</span>.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-[8px] p-3 mb-4">
              <p className="text-[11px] text-[#9197B3] uppercase font-bold mb-1">Reason</p>
              <p className="text-sm text-[#333366] whitespace-pre-wrap">{rejectedInfo.rejection_reason || "—"}</p>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setRejectedInfo(null)} className="px-4 h-10 rounded-[8px] bg-[#848FE1] text-white text-sm font-bold">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

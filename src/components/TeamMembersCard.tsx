import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getManyPerformance, type PerfStats } from "@/lib/performance";

type Member = { id?: string; name: string; email: string; role: string; permissions: string; position?: string };

export default function TeamMembersCard({ members }: { members: Member[] }) {
  const [perf, setPerf] = useState<Record<string, PerfStats>>({});

  useEffect(() => {
    const ids = members.map((m) => m.id).filter((x): x is string => !!x);
    if (ids.length === 0) { setPerf({}); return; }
    getManyPerformance(ids).then(setPerf).catch(() => setPerf({}));
  }, [members]);

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#DADCF5]/50">
        <h2 className="text-3xl font-hind font-bold text-[#333366] mb-4">Team Members</h2>
        <p className="text-xs text-[#9197B3]">No team members yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#DADCF5]/50">
      <h2 className="text-3xl font-hind font-bold text-[#333366] mb-8">Team Members</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {members.map((m) => {
          const p = (m.id && perf[m.id]) || { score: 0, qualityPct: 0, onTimePct: 0, avgStars: 0, ratingsCount: 0, doneCount: 0 };
          const isAdmin = (m.permissions ?? "").toLowerCase() === "admin";
          const title = m.position?.trim() || m.role || "";
          return (
            <div key={m.id ?? m.email} className="bg-[#F3F2F7] rounded-[20px] p-4 border border-white shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-bold text-[#333366] truncate">{m.name}</h4>
                {isAdmin && <span className="px-1.5 py-0.5 rounded-full bg-[#727FE5] text-white text-[8px] font-bold">Admin</span>}
              </div>
              <p className="text-[9px] text-[#9197B3] mb-1 truncate">{title || "—"}</p>
              <p className="text-[8px] text-[#9197B3] mb-2 truncate">{m.role}</p>
              <div className="flex items-center gap-1 mb-2">
                <Star size={10} className="fill-yellow-400 text-yellow-400" />
                <span className="text-[9px] font-bold text-[#333366]">{p.avgStars ? p.avgStars.toFixed(1) : "—"}</span>
                <span className="text-[8px] text-[#9197B3]">({p.ratingsCount})</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[8px] font-bold text-[#333366]">
                  <span>{p.score}% Performance</span>
                  <span className="text-[#9197B3] font-normal">{p.onTimePct}% on-time</span>
                </div>
                <div className="h-1.5 bg-[#DADCF5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3F467F] transition-all" style={{ width: `${p.score}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

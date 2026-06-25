import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import HomeDashboard from "@/components/HomeDashboard";
import AuthGate from "@/components/AuthGate";
import ManagerTasks from "@/components/ManagerTasks";
import MeetingsCalendar from "@/components/MeetingsCalendar";
import FundingRequestsPanel from "@/components/FundingRequestsPanel";
import MeetingsQuickPanel from "@/components/MeetingsQuickPanel";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;
import { 
  User, 
  Monitor, 
  Shield, 
  Users, 
  Search, 
  Calendar, 
  Bell, 
  Home,
  ShoppingBag,
  Ban,
  Folder,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  ChevronUp,
  Save,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit2,
  Sun,
  Globe,
  LayoutGrid,
  X
} from "lucide-react";

interface DropdownProps {
  label: string;
  value: string;
  secondary: string;
  options: string[];
  onSelect: (val: string) => void;
}

const CustomDropdown = ({ label, value, secondary, options, onSelect }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedValue = secondary || value;
  const isCustomValue = !!selectedValue && !options.includes(selectedValue);
  const showInput = customMode || isCustomValue;

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="block text-[11px] font-inter font-medium text-[#333366]">{label}</label>
      {showInput ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={selectedValue || ""}
            onChange={(e) => onSelect(e.target.value)}
            placeholder="Type custom value..."
            className="flex-1 px-4 h-12 bg-white border-[0.5px] border-[#333366] rounded-[5px] text-xs text-[#333366] focus:outline-none focus:border-[#727FE5]"
          />
          <button
            onClick={() => { setCustomMode(false); onSelect(options[0] || ""); }}
            className="shrink-0 whitespace-nowrap px-3 h-12 border border-[#333366] rounded-[5px] text-[11px] font-medium text-[#333366] hover:bg-[#F3F2F7]"
            type="button"
          >
            List
          </button>

        </div>
      ) : (
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="relative cursor-pointer group select-none"
        >
          <div className="flex items-center justify-between px-4 h-12 bg-white border-[0.5px] border-[#333366] rounded-[5px] shadow-sm transition-all hover:border-[#848FE1]">
            <span className={`text-xs transition-colors truncate ${selectedValue ? "font-bold text-[#333366]" : "font-medium text-[#333366] opacity-50"}`}>
              {selectedValue || "Select…"}
            </span>
            {isOpen ? <ChevronUp size={16} className="text-[#333366] shrink-0" /> : <ChevronDown size={16} className="text-[#333366] shrink-0" />}
          </div>

        </div>
      )}

      {isOpen && !showInput && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border-[0.5px] border-[#333366] rounded-[5px] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col max-h-60 overflow-y-auto">
            {options.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSelect(opt);
                  setCustomMode(false);
                  setIsOpen(false);
                }}
                className={`px-4 py-3 text-xs font-medium cursor-pointer transition-colors border-b last:border-none border-[#DADCF5]/30 ${
                  opt === selectedValue ? "bg-[#848FE1] text-white" : "text-[#333366] hover:bg-[#F3F2F7]"
                }`}
              >
                {opt}
              </div>
            ))}
            <div
              onClick={() => { setIsOpen(false); setCustomMode(true); onSelect(""); }}
              className="px-4 py-3 text-xs font-bold cursor-pointer text-[#727FE5] hover:bg-[#F3F2F7] border-t border-[#DADCF5]/40"
            >
              Other (custom)…
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


type ProjectInfo = {
  id?: string;
  name: string;
  description: string;
  budget: string;
  timeline: string;
  stage: string;
  type: string;
  industry: string;
  employees: string;
};

type Member = {
  id?: string;
  name: string;
  email: string;
  role: string;
  permissions: string;
};

const blankProject = (name = ""): ProjectInfo => ({
  name,
  description: "",
  budget: "",
  timeline: "",
  stage: "",
  type: "",
  industry: "",
  employees: "",
});

function IndexPage() {
  const [activeMenu, setActiveMenu] = useState("account");
  const [activeSidebarItem, setActiveSidebarItem] = useState("home");
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [activeProject, setActiveProject] = useState("");
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState<ProjectInfo>(blankProject());
  const [showProjectErrors, setShowProjectErrors] = useState(false);

  // Edit Project Info states
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editProjectData, setEditProjectData] = useState<ProjectInfo>(blankProject());

  const currentProject = projects.find((p) => p.name === activeProject);

  // Load from DB
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: projs } = await supabase.from("projects").select("*").order("created_at");
      if (projs) {
        const mapped: ProjectInfo[] = projs.map((p: any) => ({
          id: p.id, name: p.name, description: p.description ?? "",
          budget: p.budget ?? "", timeline: p.timeline ?? "", stage: p.stage ?? "",
          type: p.type ?? "", industry: p.industry ?? "", employees: p.employees ?? "",
        }));
        setProjects(mapped);
        if (mapped[0]) setActiveProject(mapped[0].name);
      }
      const { data: emps } = await supabase.from("employees").select("*").eq("manager_id", user.id).order("created_at");
      if (emps) {
        const mappedM: Member[] = emps.map((e: any) => ({
          id: e.id, name: e.name, email: e.email, role: e.role ?? "", permissions: e.permissions ?? "",
        }));
        setMembers(mappedM);
        setDraftMembers(mappedM);
      }

    })();
  }, []);

  const handleStartEditProject = () => {
    if (!currentProject) return;
    setEditProjectData({ ...currentProject });
    setIsEditingProject(true);
  };

  const handleCancelEditProject = () => {
    setIsEditingProject(false);
  };

  const handleSaveEditProject = async () => {
    if (!currentProject) return;
    const updated = { ...editProjectData, id: currentProject.id };
    setProjects(projects.map((p) => (p.name === activeProject ? updated : p)));
    setActiveProject(editProjectData.name);
    setIsEditingProject(false);
    notify("Project updated", `"${editProjectData.name}" was saved.`);
    if (currentProject.id) {
      await supabase.from("projects").update({
        name: updated.name, description: updated.description, budget: updated.budget,
        timeline: updated.timeline, stage: updated.stage, type: updated.type,
        industry: updated.industry, employees: updated.employees, updated_at: new Date().toISOString(),
      }).eq("id", currentProject.id);
    }
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    const removedName = activeProject;
    const removedId = currentProject.id;
    const remaining = projects.filter((p) => p.name !== activeProject);
    setProjects(remaining);
    setActiveProject(remaining[0]?.name ?? "");
    setIsEditingProject(false);
    notify("Project deleted", `"${removedName}" was removed.`);
    if (removedId) await supabase.from("projects").delete().eq("id", removedId);
  };



  // Request Funds States
  const [fundsData, setFundsData] = useState({
    phone: "0555555555555",
    date: "",
    amount: "",
    reason: "",
    period: "",
    fileName: ""
  });
  const [showFundsErrors, setShowFundsErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFundsSubmit = () => {
    setShowFundsErrors(true);
    // Add logic here for actual submission if needed
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "shopping", icon: ShoppingBag, label: "Plans" },
    { id: "ban", icon: Ban, label: "Funds" },
    { id: "folder", icon: Folder, label: "Projects" },
    { id: "settings", icon: SettingsIcon, label: "Settings" },
  ];

  // Team & Permissions States
  const [members, setMembers] = useState<Member[]>([]);
  const [draftMembers, setDraftMembers] = useState<Member[]>([]);

  const [newMember, setNewMember] = useState<Member>({ name: "", email: "", role: "", permissions: "" });
  const [showTeamErrors, setShowTeamErrors] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editMemberData, setEditMemberData] = useState<Member>({ name: "", email: "", role: "", permissions: "" });

  // Account Management States
  const [accountData, setAccountData] = useState({
    email: "ASEELH@gmail.com",
    password: "••••••••••••"
  });
  const [tempAccountData, setTempAccountData] = useState({ ...accountData });
  const [isEditingAccount, setIsEditingAccount] = useState(false);

  // Preferences States
  const [preferences, setPreferences] = useState({
    themeDark: false,
    language: "English",
    taskNotifications: true,
    defaultTaskView: "Kanban",
  });
  const [openPrefDropdown, setOpenPrefDropdown] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<{ id: number; title: string; body: string; time: string; read: boolean; onClick?: () => void }[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showMeetingsPanel, setShowMeetingsPanel] = useState(false);
  const [upcomingMeetingsCount, setUpcomingMeetingsCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { count } = await supabase
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("manager_id", user.id)
        .eq("completed", false);
      if (!cancelled) setUpcomingMeetingsCount(count ?? 0);
    };
    fetchCount();
    const ch = supabase
      .channel("mgr-meet-count-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, fetchCount)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, []);

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    try { await supabase.auth.signOut(); } catch {
      // ignore sign-out errors
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("lovable_employee");
      window.location.href = "/";
    }
  };

  // Global search
  const [searchQ, setSearchQ] = useState("");
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<{ type: string; label: string; sub: string; action: () => void }[]>([]);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchTasks, setSearchTasks] = useState<{ id: string; name: string; project_name: string | null; status: string; employee_id: string }[]>([]);

  // Fetch tasks for search index (manager scope)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("tasks")
        .select("id,name,project_name,status,employee_id")
        .eq("manager_id", user.id);
      if (data) setSearchTasks(data as any);
    })();
  }, [activeSidebarItem, activeMenu]);

  // Build search results
  useEffect(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) { setSearchResults([]); return; }
    const sections: { id: string; label: string; sidebar: string; menu?: string }[] = [
      { id: "home", label: "Home Dashboard", sidebar: "home" },
      { id: "plans", label: "Plans", sidebar: "shopping" },
      { id: "funds", label: "Request Funds", sidebar: "ban" },
      { id: "projects", label: "Projects", sidebar: "folder" },
      { id: "account", label: "Account Settings", sidebar: "settings", menu: "account" },
      { id: "preferences", label: "Preferences", sidebar: "settings", menu: "preferences" },
      { id: "team", label: "Team & Permissions", sidebar: "settings", menu: "team" },
    ];
    const results: { type: string; label: string; sub: string; action: () => void }[] = [];

    for (const s of sections) {
      if (s.label.toLowerCase().includes(q)) {
        results.push({
          type: "Page", label: s.label, sub: "Open page",
          action: () => { setActiveSidebarItem(s.sidebar); if (s.menu) setActiveMenu(s.menu); },
        });
      }
    }
    for (const t of searchTasks) {
      const decoded = (() => {
        const raw = t.project_name ?? "";
        const i = raw.indexOf("\u0001");
        return i >= 0 ? { project: raw.slice(0, i), desc: raw.slice(i + 1) } : { project: raw, desc: "" };
      })();
      const hay = `${t.name} ${decoded.project} ${decoded.desc} task`.toLowerCase();
      if (hay.includes(q)) {
        results.push({
          type: "Task", label: t.name, sub: `${decoded.project || "—"} · ${t.status}`,
          action: () => { setActiveSidebarItem("folder"); setHighlightTaskId(t.id); setTimeout(() => setHighlightTaskId(null), 3000); },
        });
      }
    }
    for (const p of projects) {
      if (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
        results.push({
          type: "Project", label: p.name, sub: p.description.slice(0, 60) || "Project info",
          action: () => { setActiveSidebarItem("settings"); setActiveMenu("account"); setActiveProject(p.name); },
        });
      }
    }
    for (const m of members) {
      if (m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.role || "").toLowerCase().includes(q)) {
        results.push({
          type: "Member", label: m.name, sub: `${m.email} · ${m.role}`,
          action: () => { setActiveSidebarItem("settings"); setActiveMenu("team"); },
        });
      }
    }
    setSearchResults(results.slice(0, 30));
  }, [searchQ, searchTasks, projects, members]);

  // Close search panel on outside click
  useEffect(() => {
    if (!showSearchPanel) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input")?.getAttribute("placeholder")?.startsWith("Search")) return;
      if (target.closest("[data-search-panel]")) return;
      setShowSearchPanel(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showSearchPanel]);


  const notify = (title: string, body: string = "", onClick?: () => void) => {
    if (!preferences.taskNotifications) return;
    // Auto-route funding notifications to the Funds tab if no explicit onClick provided
    const auto = !onClick && /funding/i.test(title)
      ? () => setActiveSidebarItem("ban")
      : onClick;
    const item = { id: Date.now() + Math.random(), title, body, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), read: false, onClick: auto };
    setNotifications((prev) => [item, ...prev].slice(0, 50));
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch {}
    }
  };
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (preferences.taskNotifications && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [preferences.taskNotifications]);

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.themeDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [preferences.themeDark]);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/i18n").then((m) => {
      if (cancelled) return;
      m.setLanguage(preferences.language === "العربية" ? "ar" : "en");
    });
    return () => { cancelled = true; };
  }, [preferences.language]);


  const handleStartAccountEdit = () => {
    setTempAccountData({ ...accountData });
    setIsEditingAccount(true);
  };

  const handleSaveAccountEdit = () => {
    setAccountData({ ...tempAccountData });
    setIsEditingAccount(false);
  };

  const handleCancelAccountEdit = () => {
    setTempAccountData({ ...accountData });
    setIsEditingAccount(false);
  };

  const handleAddProject = async () => {
    if (!newProjectData.name.trim() || !newProjectData.description.trim()) {
      setShowProjectErrors(true);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("projects").insert({
      manager_id: user.id,
      name: newProjectData.name, description: newProjectData.description,
      budget: newProjectData.budget, timeline: newProjectData.timeline,
      stage: newProjectData.stage, type: newProjectData.type,
      industry: newProjectData.industry, employees: newProjectData.employees,
    }).select().single();
    if (error) { notify("Error", error.message); return; }
    const inserted: ProjectInfo = { ...newProjectData, id: data.id };
    setProjects([...projects, inserted]);
    setActiveProject(inserted.name);
    notify("Project added", `"${inserted.name}" was created.`);
    setNewProjectData(blankProject());
    setShowProjectErrors(false);
    setShowAddProjectModal(false);
  };

  const handleInvite = async () => {
    if (!newMember.name || !newMember.email || !newMember.role || !newMember.permissions || newMember.role === "Select Role" || newMember.permissions === "Select Permissions") {
      setShowTeamErrors(true);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from("employees").insert({
      manager_id: user.id,
      name: newMember.name, email: newMember.email,
      role: newMember.role, permissions: newMember.permissions,
    }).select().single();
    if (error) { notify("Error", error.message); return; }
    const inserted: Member = { ...newMember, id: data.id };
    setDraftMembers([...draftMembers, inserted]);
    setMembers((prev) => [...prev, inserted]);
    setNewMember({ name: "", email: "", role: "", permissions: "" });
    setShowTeamErrors(false);
    notify("Employee added", `"${inserted.name}" was added.`);
  };

  const handleDeleteMember = async (email: string) => {
    const target = draftMembers.find((m) => m.email === email);
    setDraftMembers(draftMembers.filter(m => m.email !== email));
    if (target?.id) await supabase.from("employees").delete().eq("id", target.id);
  };


  const handleStartEdit = (member: Member) => {
    setEditingEmail(member.email);
    setEditMemberData({ ...member });
  };

  const handleCancelEdit = () => {
    setEditingEmail(null);
  };

  const handleSaveEdit = async () => {
    const target = draftMembers.find((m) => m.email === editingEmail);
    const merged = { ...editMemberData, id: target?.id };
    setDraftMembers(draftMembers.map(m => m.email === editingEmail ? merged : m));
    setEditingEmail(null);
    if (target?.id) {
      await supabase.from("employees").update({
        name: merged.name, email: merged.email, role: merged.role, permissions: merged.permissions,
      }).eq("id", target.id);
    }
  };

  const handleSaveTeamChanges = () => {
    setMembers(draftMembers);
    setEditingEmail(null);
    notify("Team updated", "Your team changes were saved.");
  };

  const handleCancelTeamChanges = () => {
    setDraftMembers(members);
    setEditingEmail(null);
  };


  // Calendar States
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(new Date().getDate());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust to start from Monday
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleMonthClick = (monthIdx: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), monthIdx, 1));
    setShowMonthPicker(false);
  };

  const renderContent = () => {
    if (activeSidebarItem === "home") {
      return <HomeDashboard />;
    }

    if (activeSidebarItem === "folder") {
      const agents = [
        { name: "Proactive Agent", desc: "+10% Boost contribution (2 months)" },
        { name: "Market Competition", desc: "+18% Highest transfer activity at week's end" },
        { name: "Spending Agent", desc: "-15% Test Ad Channels" },
        { name: "Risk Agent", desc: "Reminders & early payment Discount - suggested action" }
      ];

      const team = [
        { name: "Sara Ali", role: "UI/UX Designer", status: "Available", color: "bg-green-500" },
        { name: "Omar Fahad", role: "UI/UX Designer", status: "Busy", color: "bg-orange-400" },
        { name: "Reem Ahmed", role: "UI/UX Designer", status: "Unavailable", color: "bg-red-500" },
        { name: "Jood Abdullah", role: "UI/UX Designer", status: "Now working", color: "bg-blue-400" }
      ];

      return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          {/* Smart Agents Header & Agents Bar */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#DADCF5]/50 flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1">
              <h1 className="text-3xl font-hind font-bold text-[#333366] mb-1">Smart Agents</h1>
              <p className="text-[#9197B3] text-xs max-w-md">Your AI assistant helps you assign tasks, predict delays, and summarize project status</p>
            </div>
            <div className="flex flex-wrap gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {agents.map((agent, i) => (
                <div key={i} className="bg-[#F3F2F7] rounded-[15px] p-3 min-w-[140px] max-w-[160px] border border-white shadow-sm">
                  <h4 className="text-[10px] font-bold text-[#333366] mb-1">{agent.name}</h4>
                  <p className="text-[8px] text-[#9197B3] leading-relaxed">{agent.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-8 flex flex-col gap-8">
              {/* Tasks Card */}
              <ManagerTasks employees={members} projects={projects} notify={notify} search={searchQ} highlightId={highlightTaskId} />

              {/* Team Members Card */}
              <TeamMembersCard members={members} />
            </div>


            <div className="xl:col-span-4 flex flex-col gap-8">
              {/* Calendar Widget */}
              <MeetingsCalendar employees={members} notify={notify} />

              {/* Stats Card */}
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#DADCF5]/50 flex flex-col gap-8">
                <div className="flex justify-between items-center">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-hind font-bold text-red-500">8</span>
                    <span className="text-sm font-bold text-[#333366]">Overdue tasks</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-hind font-bold text-[#333366]">12</span>
                    <span className="text-sm font-bold text-[#333366]">Team members</span>
                  </div>
                </div>
                <button className="w-full h-14 bg-[#848FE1] text-white font-hind font-bold rounded-full shadow-lg hover:bg-[#727FE5] transition-all">
                  View Project
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSidebarItem === "shopping") {
      const plans = [
        {
          name: "Scale",
          price: "1999",
          features: [
            "Unlimited team members",
            "Full analytics dashboard",
            "Smart agents customization",
            "24/7 premium support"
          ],
          active: false
        },
        {
          name: "Growth",
          price: "599",
          features: [
            "Up to 20 members",
            "Advanced analytics dashboard",
            "AI growth recommendations",
            "Priority email support"
          ],
          active: false
        },
        {
          name: "Startup",
          price: "249",
          features: [
            "Up to 5 members",
            "Basic project management",
            "Monthly performance reports",
            "Email support"
          ],
          active: true
        }
      ];

      return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-6xl mx-auto px-4">
          {/* Top Banner */}
          <div className="relative h-[240px] rounded-[32px] overflow-hidden shadow-xl group">
            <img
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
              alt="Business Background"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#3F467F]/90 to-transparent flex flex-col justify-center px-12">
              <h1 className="text-4xl font-hind font-bold text-white mb-2 leading-tight max-w-2xl">
                Smart financial insights Powered by reliable AI agents
              </h1>
              <p className="text-xl font-inter font-light text-white/80 mb-6">
                choose the plan that elevates your business
              </p>
              <div className="flex items-center gap-4">
                <button className="px-8 py-2.5 bg-[#848FE1] text-white font-hind font-bold rounded-full flex items-center gap-3 hover:bg-[#727FE5] transition-all shadow-lg">
                  View Plans <ChevronDown size={20} className="rotate-0" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Scale Plan */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#DADCF5]/50 flex flex-col min-h-[400px]">
              <h3 className="text-4xl font-hind font-bold text-[#333366] mb-6">Scale</h3>
              <div className="flex-1">
                <p className="text-sm font-inter font-bold text-[#848FE1] mb-4">Featurs:</p>
                <ul className="space-y-3">
                  {plans[0].features.map((feature, i) => (
                    <li key={i} className="text-sm font-inter font-medium text-[#333366]/70 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#848FE1]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-4xl font-hind font-bold text-[#333366]">1999</span>
                  <span className="text-[10px] font-bold text-[#333366]/60 leading-none flex flex-col items-center">
                    <span>R</span><span>S</span>
                  </span>
                </div>
                <div className="flex items-center bg-[#848FE1] rounded-full p-1 pr-6 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-[#3F467F] flex items-center justify-center text-white mr-2">
                    <ChevronUp size={16} />
                  </div>
                  <span className="text-white font-hind font-bold text-sm">Stare Plan</span>
                </div>
              </div>
            </div>

            {/* Growth Plan */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#DADCF5]/50 flex flex-col min-h-[400px]">
              <h3 className="text-4xl font-hind font-bold text-[#333366] mb-6">Growth</h3>
              <div className="flex-1">
                <p className="text-sm font-inter font-bold text-[#848FE1] mb-4">Featurs:</p>
                <ul className="space-y-3">
                  {plans[1].features.map((feature, i) => (
                    <li key={i} className="text-sm font-inter font-medium text-[#333366]/70 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#848FE1]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-4xl font-hind font-bold text-[#333366]">599</span>
                  <span className="text-xs font-bold text-[#333366]/60">RS</span>
                </div>
                <div className="flex items-center bg-[#848FE1] rounded-full p-1 pr-6 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-[#3F467F] flex items-center justify-center text-white mr-2">
                    <ChevronUp size={16} />
                  </div>
                  <span className="text-white font-hind font-bold text-sm">Stare Plan</span>
                </div>
              </div>
            </div>

            {/* Startup Plan - Wide */}
            <div className="bg-gradient-to-br from-[#727FE5] to-[#3F467F] rounded-[32px] p-8 shadow-xl text-white flex flex-col">
              <h3 className="text-4xl font-hind font-bold mb-6 text-white">Startup</h3>
              <div className="flex-1">
                <p className="text-sm font-inter font-bold text-white/60 mb-4">Featurs:</p>
                <ul className="space-y-3">
                  {plans[2].features.map((feature, i) => (
                    <li key={i} className="text-sm font-inter font-medium text-white/90 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center bg-white rounded-full p-1 pr-6 shadow-md h-12">
                  <span className="text-2xl font-hind font-bold text-[#333366] px-4">249</span>
                  <span className="text-[10px] font-bold text-[#333366]/60 mr-2">rs</span>
                  <div className="w-8 h-8 rounded-full bg-[#3F467F] flex items-center justify-center text-white">
                    <ChevronUp size={16} />
                  </div>
                </div>
                <button className="px-10 h-12 bg-[#848FE1] text-white font-hind font-bold rounded-full shadow-lg hover:bg-white/10 transition-all border border-white/20">
                  Start Plan
                </button>
              </div>
            </div>

            {/* Compare Plans Button */}
            <div className="flex items-center justify-center h-full pt-12">
              <button className="w-full max-w-[400px] h-16 bg-[#848FE1] text-white text-2xl font-hind font-bold rounded-full shadow-xl hover:bg-[#727FE5] transition-all transform hover:scale-105 flex items-center justify-center">
                Compare Plans
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (activeSidebarItem === "ban") {
      return (
        <FundingRequestsPanel
          managerName={accountData.email.split("@")[0] || "Manager"}
          members={members}
          notify={notify}
        />
      );
    }

    if (activeMenu === "team") {
      const isTeamError = (val: string) => showTeamErrors && (!val || val.includes("Select"));

      return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="space-y-1">
            <h1 className="text-5xl font-hind font-bold text-[#333366]">Team & Permissions</h1>
            <p className="text-[#9197B3] font-inter text-sm">Manage your team members and their roles permissions</p>
          </div>

          {/* Add New Member Card */}
          <div className="bg-white rounded-[15px] shadow-sm overflow-hidden border border-[#DADCF5]/50">
            <div className="p-8">
              <h2 className="text-2xl font-hind font-bold text-[#333366] mb-8">Add New Member</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                <div className="space-y-2 lg:col-span-1">
                  <label className="block text-[11px] font-inter font-medium text-[#333366]">Name</label>
                  <input
                    type="text"
                    value={newMember.name || ""}
                    onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                    className={`w-full h-12 px-4 border-[0.5px] rounded-[5px] bg-[#F3F2F7] text-[#333366] focus:outline-none transition-all ${isTeamError(newMember.name) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                  />
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <label className="block text-[11px] font-inter font-medium text-[#333366]">Email</label>
                  <input
                    type="email"
                    value={newMember.email || ""}
                    onChange={(e) => setNewMember({...newMember, email: e.target.value})}
                    className={`w-full h-12 px-4 border-[0.5px] rounded-[5px] bg-[#F3F2F7] text-[#333366] focus:outline-none transition-all ${isTeamError(newMember.email) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                  />
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <label className="block text-[11px] font-inter font-medium text-[#333366]">Role</label>
                  <div className="relative">
                    <select
                      value={newMember.role || ""}
                      onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                      className={`w-full h-12 px-4 border-[0.5px] rounded-[5px] bg-[#F3F2F7] text-[#333366] focus:outline-none appearance-none cursor-pointer text-xs transition-all ${isTeamError(newMember.role) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                    >
                      <option value="">Select Role</option>
                      <option value="Designer">Designer</option>
                      <option value="Developer">Developer</option>
                      <option value="Manager">Manager</option>
                      <option value="Project manager">Project manager</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Financial">Financial</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#333366] pointer-events-none opacity-60" />
                  </div>
                </div>
                <div className="space-y-2 lg:col-span-1">
                  <label className="block text-[11px] font-inter font-medium text-[#333366]">Permissions</label>
                  <div className="relative">
                    <select
                      value={newMember.permissions || ""}
                      onChange={(e) => setNewMember({...newMember, permissions: e.target.value})}
                      className={`w-full h-12 px-4 border-[0.5px] rounded-[5px] bg-[#F3F2F7] text-[#333366] focus:outline-none appearance-none cursor-pointer text-xs transition-all ${isTeamError(newMember.permissions) ? "border-red-500 bg-red-50" : "border-[#333366]"}`}
                    >
                      <option value="">Select Permissions</option>
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#333366] pointer-events-none opacity-60" />
                  </div>
                </div>
                <button
                  onClick={handleInvite}
                  className="h-12 bg-[#848FE1] hover:bg-[#727FE5] text-white text-sm font-hind font-bold rounded-[8px] transition-colors flex items-center justify-center gap-2 shadow-sm px-6"
                >
                  <Users size={18} /> Invite
                </button>
              </div>
            </div>
          </div>

          {/* Members Table Card */}
          <div className="bg-white rounded-[15px] shadow-sm overflow-hidden border border-[#DADCF5]/50">
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#848FE1] scrollbar-track-[#F3F2F7]">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-[#F3F2F7] border-b border-[#DADCF5]">
                    <th className="px-3 sm:px-5 py-4 text-sm font-hind font-bold text-[#333366] whitespace-nowrap">Name</th>
                    <th className="px-3 sm:px-5 py-4 text-sm font-hind font-bold text-[#333366] whitespace-nowrap">Email</th>
                    <th className="px-3 sm:px-5 py-4 text-sm font-hind font-bold text-[#333366] whitespace-nowrap">Role</th>
                    <th className="px-3 sm:px-5 py-4 text-sm font-hind font-bold text-[#333366] whitespace-nowrap">Permissions</th>
                    <th className="px-3 sm:px-5 py-4 text-sm font-hind font-bold text-[#333366] text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DADCF5]/50">
                  {draftMembers.map((member, idx) => (
                    <tr key={idx} className="hover:bg-[#F3F2F7]/30 transition-colors">
                      <td className="px-3 sm:px-5 py-5 text-xs font-medium text-[#333366] break-words">
                        {editingEmail === member.email ? (
                          <input
                            type="text"
                            value={editMemberData.name || ""}
                            onChange={(e) => setEditMemberData({...editMemberData, name: e.target.value})}
                            className="w-full h-8 px-2 border border-[#848FE1] rounded bg-white text-[#333366] focus:outline-none"
                          />
                        ) : (
                          member.name
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-5 text-xs text-[#333366] opacity-60 break-all">
                        {editingEmail === member.email ? (
                          <input
                            type="email"
                            value={editMemberData.email || ""}
                            onChange={(e) => setEditMemberData({...editMemberData, email: e.target.value})}
                            className="w-full h-8 px-2 border border-[#848FE1] rounded bg-white text-[#333366] focus:outline-none"
                          />
                        ) : (
                          member.email
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-5 text-xs text-[#333366] opacity-60">
                        {editingEmail === member.email ? (
                          <select
                            value={editMemberData.role || ""}
                            onChange={(e) => setEditMemberData({...editMemberData, role: e.target.value})}
                            className="w-full h-8 px-2 border border-[#848FE1] rounded bg-white text-[#333366] focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="Designer">Designer</option>
                            <option value="Developer">Developer</option>
                            <option value="Manager">Manager</option>
                            <option value="Project manager">Project manager</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Financial">Financial</option>
                          </select>
                        ) : (
                          member.role
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-5 text-xs text-[#333366] opacity-60">
                        {editingEmail === member.email ? (
                          <select
                            value={editMemberData.permissions || ""}
                            onChange={(e) => setEditMemberData({...editMemberData, permissions: e.target.value})}
                            className="w-full h-8 px-2 border border-[#848FE1] rounded bg-white text-[#333366] focus:outline-none appearance-none cursor-pointer"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Editor">Editor</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        ) : (
                          member.permissions
                        )}
                      </td>
                      <td className="px-3 sm:px-5 py-5">
                        <div className="flex flex-wrap justify-center gap-2">
                          {editingEmail === member.email ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="px-3 py-1.5 bg-[#848FE1] text-white text-[10px] font-hind font-bold rounded-[4px] hover:bg-[#727FE5] transition-colors whitespace-nowrap"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1.5 bg-white text-[#333366] text-[10px] font-hind font-bold rounded-[4px] border border-[#DADCF5] hover:bg-[#F3F2F7] transition-colors whitespace-nowrap"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(member)}
                                className="px-3 py-1.5 bg-white text-[#333366] text-[10px] font-hind font-bold rounded-[4px] border border-[#DADCF5] hover:bg-[#F3F2F7] transition-colors whitespace-nowrap"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMember(member.email)}
                                className="px-3 py-1.5 bg-[#D92D20] text-white text-[10px] font-hind font-bold rounded-[4px] hover:bg-[#B42318] transition-colors whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      );
    }
    if (activeMenu === "preferences") {
      const Toggle = ({ on, onChange }: { on: boolean; onChange: () => void }) => (
        <button
          onClick={onChange}
          className={`relative w-11 h-6 rounded-full transition-colors ${on ? "bg-[#848FE1]" : "bg-[#DADCF5]"}`}
        >
          <span className={`absolute top-0.5 ${on ? "left-[22px]" : "left-0.5"} w-5 h-5 bg-[#333366] rounded-full transition-all`} />
        </button>
      );
      const PrefSelect = ({ id, value, options, onChange }: { id: string; value: string; options: string[]; onChange: (v: string) => void }) => (
        <div className="relative">
          <button
            onClick={() => setOpenPrefDropdown(openPrefDropdown === id ? null : id)}
            className="flex items-center justify-between gap-3 min-w-[110px] h-9 px-3 bg-[#848FE1] hover:bg-[#727FE5] text-white text-xs font-inter font-medium rounded-[6px] transition-colors"
          >
            <span>{value}</span>
            <ChevronDown size={14} />
          </button>
          {openPrefDropdown === id && (
            <div className="absolute right-0 top-[calc(100%+4px)] min-w-[110px] bg-white border border-[#DADCF5] rounded-[6px] shadow-lg z-20 overflow-hidden">
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setOpenPrefDropdown(null); }}
                  className={`block w-full text-left px-3 py-2 text-xs font-inter transition-colors ${opt === value ? "bg-[#848FE1] text-white" : "text-[#333366] hover:bg-[#F3F2F7]"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      );
      const rows = [
        { id: "theme", icon: Sun, label: "Theme Mode", control: <Toggle on={preferences.themeDark} onChange={() => setPreferences({ ...preferences, themeDark: !preferences.themeDark })} /> },
        { id: "language", icon: Globe, label: "Language", control: <PrefSelect id="language" value={preferences.language} options={["English", "العربية"]} onChange={(v) => setPreferences({ ...preferences, language: v })} /> },
        { id: "notifications", icon: Bell, label: "Task Notifications", control: <Toggle on={preferences.taskNotifications} onChange={async () => {
          const next = !preferences.taskNotifications;
          if (next && typeof window !== "undefined" && "Notification" in window) {
            try {
              const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
              if (perm !== "granted") {
                alert("لم يتم منح إذن الإشعارات. فعّلها من إعدادات المتصفح لاستلام التنبيهات على الجهاز.");
              } else {
                try { new Notification("Task Notifications enabled", { body: "ستصلك تنبيهات الموقع على جهازك." }); } catch {}
              }
            } catch {}
          }
          setPreferences({ ...preferences, taskNotifications: next });
        }} /> },
        { id: "taskview", icon: LayoutGrid, label: "Default Task View", control: <PrefSelect id="taskview" value={preferences.defaultTaskView} options={["Kanban", "List", "Calendar", "Timeline"]} onChange={(v) => setPreferences({ ...preferences, defaultTaskView: v })} /> },
      ];
      return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          <div className="bg-white rounded-[15px] shadow-sm overflow-hidden border border-[#DADCF5]/50">
            <div className="p-8">
              <h2 className="text-2xl font-hind font-bold text-[#333366] mb-6">Preferences</h2>
              <div className="divide-y divide-[#DADCF5]/60">
                {rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <row.icon className="w-4 h-4 text-[#333366]" strokeWidth={1.8} />
                      <span className="text-sm font-inter text-[#333366]">{row.label}</span>
                    </div>
                    {row.control}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (activeMenu === "account") {
      return (
        <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
          {/* Account Management Card */}
          <div className="bg-white rounded-[15px] shadow-sm overflow-hidden border border-[#DADCF5]/50">
            <div className="p-8">
              <h2 className="text-2xl font-hind font-bold text-[#333366] mb-6">Account Management</h2>
              <div className="space-y-6 max-w-3xl">
                <div>
                  <label className="block text-[11px] font-inter font-medium text-[#333366] mb-2">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={isEditingAccount ? tempAccountData.email || "" : accountData.email || ""}
                      onChange={(e) => setTempAccountData({...tempAccountData, email: e.target.value})}
                      className={`w-full h-12 px-4 pr-20 border-[0.5px] border-[#333366] rounded-[5px] text-[#333366] focus:outline-none transition-all ${isEditingAccount ? "bg-white" : "bg-[#F3F2F7] opacity-60"}`}
                      readOnly={!isEditingAccount}
                    />
                    {!isEditingAccount && (
                      <button
                        onClick={handleStartAccountEdit}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-white text-[#333366] text-sm font-hind font-bold rounded-[4px] border border-[#DADCF5] hover:bg-[#F3F2F7] transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-inter font-medium text-[#333366] mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={isEditingAccount ? "text" : "password"}
                      value={isEditingAccount ? tempAccountData.password || "" : accountData.password || ""}
                      onChange={(e) => setTempAccountData({...tempAccountData, password: e.target.value})}
                      className={`w-full h-12 px-4 pr-20 border-[0.5px] border-[#333366] rounded-[5px] text-[#333366] focus:outline-none transition-all ${isEditingAccount ? "bg-white" : "bg-[#F3F2F7] opacity-60"}`}
                      readOnly={!isEditingAccount}
                    />
                    {!isEditingAccount && (
                      <button
                        onClick={handleStartAccountEdit}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-white text-[#333366] text-sm font-hind font-bold rounded-[4px] border border-[#DADCF5] hover:bg-[#F3F2F7] transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#3F467F] p-4 flex justify-end gap-4">
              <button
                onClick={handleCancelAccountEdit}
                className="px-6 h-10 bg-white/10 hover:bg-white/20 text-white text-sm font-hind font-bold rounded-[5px] transition-colors border border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccountEdit}
                className="px-6 h-10 bg-[#848FE1] hover:bg-[#727FE5] text-white text-sm font-hind font-bold rounded-[5px] transition-colors flex items-center gap-2 shadow-lg"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>

          {/* Project Information Card */}
          <div className="bg-white rounded-[15px] shadow-sm overflow-visible border border-[#DADCF5]/50">

            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-hind font-bold text-[#333366]">Project Information</h2>
                {currentProject && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleStartEditProject}
                      disabled={isEditingProject}
                      className="flex items-center gap-2 px-4 py-1.5 bg-white text-[#333366] text-sm font-hind font-medium rounded-[8px] border border-[#333366] hover:bg-[#F3F2F7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteProject}
                      className="flex items-center gap-2 px-4 py-1.5 bg-[#D92D20] text-white text-sm font-hind font-medium rounded-[8px] hover:bg-[#B42318] transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {!currentProject ? (
                <div className="text-center text-[#333366]/60 py-12 text-sm font-inter">
                  No project selected. Add a project to get started.
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-inter font-medium text-[#333366] mb-2">Project Name</label>
                    <input
                      type="text"
                      value={isEditingProject ? editProjectData.name : currentProject.name}
                      onChange={(e) => setEditProjectData({ ...editProjectData, name: e.target.value })}
                      readOnly={!isEditingProject}
                      className={`w-full h-12 px-4 border-[0.5px] border-[#333366] rounded-[5px] text-[#333366] focus:outline-none ${isEditingProject ? "bg-white focus:border-[#727FE5]" : "bg-[#F3F2F7] cursor-default"}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-inter font-medium text-[#333366] mb-2">Project Description</label>
                    <textarea
                      placeholder="Description"
                      value={isEditingProject ? editProjectData.description : currentProject.description}
                      onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })}
                      readOnly={!isEditingProject}
                      className={`w-full h-24 px-4 py-2 border-[0.5px] border-[#333366] rounded-[5px] text-[#333366] focus:outline-none resize-none ${isEditingProject ? "bg-white focus:border-[#727FE5]" : "bg-[#F3F2F7] cursor-default"}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {([
                      { key: "budget", label: "Project Budget", options: ["700$-8900$", "30,000-100$", "100,000-500,000$"] },
                      { key: "timeline", label: "Timeline", options: ["6-12 months", "6 months", "1-2 years"] },
                      { key: "stage", label: "Company Stage", options: ["Growth", "Startup", "Enterprise"] },
                      { key: "type", label: "Project Type", options: ["Business", "Technical", "Creative"] },
                      { key: "industry", label: "Industry", options: ["Healthcare", "Education", "Finance", "Retail"] },
                      { key: "employees", label: "Number of Employees", options: ["100-200", "11-40", "1-10", "500+"] },
                    ] as const).map(({ key, label, options }) => (
                      isEditingProject ? (
                        <CustomDropdown
                          key={key}
                          label={label}
                          value={editProjectData[key]}
                          secondary={editProjectData[key]}
                          options={[...options]}
                          onSelect={(val) => setEditProjectData((prev) => ({ ...prev, [key]: val }))}
                        />
                      ) : (
                        <div key={key} className="space-y-2">
                          <label className="block text-[11px] font-inter font-medium text-[#333366]">{label}</label>
                          <div className="flex items-center justify-between px-4 h-12 bg-[#F3F2F7] border-[0.5px] border-[#333366] rounded-[5px]">
                            <span className={`text-xs truncate ${currentProject[key] ? "font-bold text-[#333366]" : "font-medium text-[#9197B3] italic"}`}>
                              {currentProject[key] || "—"}
                            </span>
                          </div>
                        </div>
                      )

                    ))}
                  </div>
                </div>
              )}
            </div>
            {currentProject && isEditingProject && (
              <div className="bg-[#3F467F] p-4 flex justify-end gap-4 mt-4">
                <button
                  onClick={handleCancelEditProject}
                  className="px-6 h-10 bg-white/10 hover:bg-white/20 text-white text-sm font-hind font-bold rounded-[5px] transition-colors border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditProject}
                  className="px-6 h-10 bg-[#848FE1] hover:bg-[#727FE5] text-white text-sm font-hind font-bold rounded-[5px] transition-colors flex items-center gap-2 shadow-lg"
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            )}
          </div>

        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F3F2F7] overflow-x-hidden font-inter pb-20 lg:pb-0">
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#DADCF5] flex lg:hidden items-center justify-around py-3 px-2 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveSidebarItem(item.id);
              if (item.id !== "settings") setIsMobileMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeSidebarItem === item.id ? "text-[#727FE5]" : "text-[#9197B3]"
            }`}
          >
            <item.icon size={24} strokeWidth={activeSidebarItem === item.id ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex flex-col items-center gap-1 text-[#9197B3]"
        >
          <LogOut size={24} strokeWidth={1.5} />
          <span className="text-[10px] font-medium">Exit</span>
        </button>
      </nav>

      {/* Floating Sidebar Navigation (Desktop) */}
      <aside className="fixed left-[27px] top-[27px] bottom-[27px] w-[112px] bg-white rounded-[31px] shadow-lg hidden lg:flex flex-col items-center py-10 z-[60]">
        <div className="mb-12">
          <svg width="32" height="47" viewBox="42 49 32 47" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M52.6033 60.6428L42.1836 60.5742L42.1214 72.2002L52.5411 72.2689L52.6033 60.6428Z" fill="#727FE5"/>
            <path d="M73.4236 60.8928L63.0039 60.8242L62.9417 72.4502L73.3614 72.5189L73.4236 60.8928Z" fill="#727FE5"/>
            <path d="M73.3621 72.3899L62.9424 72.3213L62.8802 83.9473L73.2999 84.0159L73.3621 72.3899Z" fill="#727FE5"/>
            <path d="M62.8779 83.9231L73.2976 83.9918L73.2354 95.6178C70.472 95.5996 67.8282 94.3636 65.8857 92.1819C63.9432 90.0001 62.8612 87.0512 62.8776 83.9839L62.8779 83.9199L62.8779 83.9231Z" fill="#727FE5"/>
            <path d="M64.1921 72.3291L52.4775 72.252L52.4154 83.878L64.1299 83.9551L64.1921 72.3291Z" fill="#727FE5"/>
            <path d="M53.5322 49.0744L53.47 60.7004L42.1722 60.626L42.1726 60.562C42.1811 59.0424 42.4818 57.5398 43.0574 56.1399C43.633 54.74 44.4722 53.4704 45.5272 52.4035C46.5822 51.3367 47.8321 50.4935 49.2057 49.9223C50.5792 49.3511 52.0494 49.063 53.5322 49.0744Z" fill="#727FE5"/>
            <path d="M63.1189 49.1487L52.6992 49.0801L52.6371 60.7061L63.0567 60.7747L63.1189 49.1487Z" fill="#727FE5"/>
            <path d="M73.4832 49.2127L73.4159 61.7899L62.9991 61.7213L62.9995 61.6521C63.0173 58.3338 64.132 55.1587 66.0987 52.8252C68.0653 50.4918 70.7226 49.1911 73.4861 49.2093L73.4832 49.2127Z" fill="#727FE5"/>
            <path d="M52.5408 72.2561L42.1211 72.1875L42.0589 83.8135L52.4786 83.8821L52.5408 72.2561Z" fill="#727FE5"/>
            <path d="M42.0625 83.7559L52.4822 83.8245L52.4818 83.8885C52.4654 86.9558 51.3519 89.8902 49.3863 92.0462C47.4206 94.2023 44.7638 95.4033 42.0003 95.3851L42.0625 83.7559Z" fill="#727FE5"/>
          </svg>
        </div>
        <nav className="flex flex-col items-center gap-10 flex-1">
          <button onClick={() => setActiveSidebarItem("home")} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeSidebarItem === "home" ? "bg-[#727FE5] text-white shadow-lg" : "text-[#727FE5] hover:bg-[#F3F2F7]"}`}><Home size={24} strokeWidth={1.5} /></button>
          <button onClick={() => setActiveSidebarItem("shopping")} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeSidebarItem === "shopping" ? "bg-[#727FE5] text-white shadow-lg" : "text-[#727FE5] opacity-60 hover:opacity-100 hover:bg-[#F3F2F7]"}`}><ShoppingBag size={24} strokeWidth={1.5} /></button>
          <button onClick={() => setActiveSidebarItem("ban")} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeSidebarItem === "ban" ? "bg-[#727FE5] text-white shadow-lg" : "text-[#727FE5] opacity-60 hover:opacity-100 hover:bg-[#F3F2F7]"}`}><Ban size={24} strokeWidth={1.5} /></button>
          <button onClick={() => setActiveSidebarItem("folder")} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeSidebarItem === "folder" ? "bg-[#727FE5] text-white shadow-lg" : "text-[#727FE5] opacity-60 hover:opacity-100 hover:bg-[#F3F2F7]"}`}><Folder size={24} strokeWidth={1.5} /></button>
        </nav>
        <div className="flex flex-col items-center gap-6 mt-auto">
          <button onClick={() => setActiveSidebarItem("settings")} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeSidebarItem === "settings" ? "bg-[#727FE5] text-white shadow-lg" : "text-[#727FE5] hover:bg-[#F3F2F7]"}`}><SettingsIcon size={24} strokeWidth={1.5} /></button>
          <button onClick={() => setShowLogoutConfirm(true)} className="w-12 h-12 rounded-full flex items-center justify-center transition-all text-[#727FE5] opacity-60 hover:opacity-100 hover:bg-[#F3F2F7]"><LogOut size={24} strokeWidth={1.5} /></button>
        </div>
      </aside>

      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 lg:pl-[167px] lg:pr-24 py-4 lg:py-6">
        <div className="bg-gradient-to-r from-[#727FE5] to-[#3F467F] rounded-[24px] lg:rounded-[32px] shadow-lg px-4 lg:px-6 py-4 lg:py-6 flex items-center justify-between gap-4">
          <div className="flex-shrink-0 flex items-center scale-75 lg:scale-100 origin-left">
            <svg width="107" height="47" viewBox="0 0 107 47" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M92.3643 10.6523L92.3036 20.8944L82.115 20.8339L82.1153 20.786C82.1225 19.4475 82.3933 18.1236 82.9124 16.8899C83.4314 15.6561 84.1884 14.5367 85.1402 13.5956C86.092 12.6546 87.2199 11.9102 88.4594 11.4052C89.699 10.9002 91.0259 10.6443 92.3643 10.6523Z" fill="white"/>
              <path d="M82.1182 20.7861L92.3067 20.8466L92.2456 31.1423C92.2296 33.8445 91.1408 36.4296 89.2187 38.329C87.2967 40.2284 84.6988 41.2864 81.9966 41.2704L82.1182 20.7861Z" fill="white"/>
              <path d="M102.201 0.528414L106.995 0.556862C106.979 3.27324 105.884 5.87197 103.952 7.78134C102.02 9.69072 99.4086 10.7543 96.6922 10.7382L92.2507 10.7119L92.2529 10.3565C92.2606 9.05795 92.524 7.7736 93.0282 6.57684C93.5323 5.38008 94.2673 4.29436 95.1911 3.3817C96.115 2.46904 97.2095 1.74731 98.4123 1.25773C99.6151 0.768162 100.903 0.520337 102.201 0.528414Z" fill="white"/>
              <path d="M92.4221 0.475483L92.3613 10.7176L82.1755 10.6572L82.1759 10.6008C82.1927 7.89958 83.2814 5.3156 85.2028 3.4169C87.1241 1.51821 89.7209 0.460201 92.4221 0.475483Z" fill="white"/>
              <path d="M43.1631 10.3778L32.9746 10.3174L32.9138 20.5595L43.1024 20.62L43.1631 10.3778Z" fill="white"/>
              <path d="M43.0459 20.5742L43.0713 20.5744C45.7732 20.5941 48.3569 21.6855 50.2548 23.6087C52.1527 25.532 53.2097 28.1298 53.1937 30.8318L53.1935 30.8628L42.9852 30.8023L43.0459 20.5742Z" fill="white"/>
              <path d="M32.834 30.7275L43.0225 30.788L43.0222 30.8444C43.0062 33.5466 41.9173 36.1317 39.9953 38.0311C38.0732 39.9305 35.4754 40.9885 32.7732 40.9725L32.834 30.7275Z" fill="white"/>
              <path d="M53.4122 0.244055L43.2236 0.183594L43.1629 10.4257L53.3514 10.4862L53.4122 0.244055Z" fill="white"/>
              <path d="M47.9893 0.211914L57.8941 0.270691C59.4215 0.279755 60.884 0.683004 61.9599 1.39172C63.0358 2.10044 63.6369 3.05657 63.631 4.04979L63.5925 10.5357L47.9285 10.4428L47.9893 0.211914Z" fill="white"/>
              <path d="M43.2266 0.186437L33.0381 0.125977L32.9773 10.3681L43.1659 10.4286L43.2266 0.186437Z" fill="white"/>
              <path d="M10.3761 10.1806L0.1875 10.1201L0.126721 20.3623L10.3153 20.4227L10.3761 10.1806Z" fill="white"/>
              <path d="M30.7354 10.3993L20.5469 10.3389L20.4861 20.581L30.6747 20.6415L30.7354 10.3993Z" fill="white"/>
              <path d="M30.6749 20.5292L20.4863 20.4688L20.4255 30.7109L30.6141 30.7713L30.6749 20.5292Z" fill="white"/>
              <path d="M20.4228 30.6874L30.6114 30.7479L30.5506 40.99C27.8484 40.974 25.2633 39.8851 23.3639 37.9631C21.4645 36.041 20.4065 33.4431 20.4225 30.741L20.4229 30.6846L20.4228 30.6874Z" fill="white"/>
              <path d="M21.7076 20.4752L10.2529 20.4072L10.1922 30.6494L21.6468 30.7173L21.7076 20.4752Z" fill="white"/>
              <path d="M11.2845 -0.011586L11.2237 10.2305L0.176526 10.165L0.176861 10.1086C0.185205 8.7699 0.4792 7.4461 1.04204 6.21286C1.60488 4.97961 2.42554 3.86109 3.4571 2.92124C4.48866 1.98138 5.71091 1.23862 7.05398 0.735386C8.39705 0.232155 9.83461 -0.0216722 11.2845 -0.011586Z" fill="white"/>
              <path d="M20.6593 0.0526483L10.4707 -0.0078125L10.4099 10.2343L20.5985 10.2948L20.6593 0.0526483Z" fill="white"/>
              <path d="M30.7931 0.110368L30.7274 11.1905L20.5417 11.13L20.542 11.069C20.5594 8.14578 21.6494 5.34862 23.5724 3.2929C25.4954 1.23718 28.0938 0.0913006 30.796 0.107336L30.7931 0.110368Z" fill="white"/>
              <path d="M10.3155 20.411L0.126953 20.3506L0.0661744 30.5927L10.2547 30.6532L10.3155 20.411Z" fill="white"/>
              <path d="M0.0693359 30.541L10.2579 30.6015L10.2576 30.6579C10.2415 33.36 9.1527 35.9452 7.23064 37.8446C5.30858 39.7439 2.71071 40.802 0.00854048 40.786L0.0693359 30.541Z" fill="white"/>
              <text fill="white" style={{ whiteSpace: 'pre' }} fontFamily="IBM Plex Sans Arabic" fontSize="17" fontWeight="bold" letterSpacing="0em"><tspan x="56.5449" y="33.0427">ee</tspan></text>
            </svg>
          </div>
          <div className="flex-1 max-w-xl hidden sm:block relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#848FE1]" strokeWidth={3} />
              <input
                type="text"
                placeholder="Search tasks, projects, team..."
                value={searchQ}
                onChange={(e) => { setSearchQ(e.target.value); setShowSearchPanel(true); }}
                onFocus={() => setShowSearchPanel(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQ.trim()) {
                    e.preventDefault();
                    setShowSearchPanel(false);
                    import("@/lib/searchHighlight").then(async ({ searchAndHighlight }) => {
                      if (searchAndHighlight(searchQ)) return;
                      const tabs: { sidebar: string; menu?: string }[] = [
                        { sidebar: "home" },
                        { sidebar: "shopping" },
                        { sidebar: "ban" },
                        { sidebar: "folder" },
                        { sidebar: "settings", menu: "account" },
                        { sidebar: "settings", menu: "preferences" },
                        { sidebar: "settings", menu: "team" },
                      ];
                      for (const t of tabs) {
                        setActiveSidebarItem(t.sidebar);
                        if (t.menu) setActiveMenu(t.menu);
                        await new Promise((r) => setTimeout(r, 220));
                        if (searchAndHighlight(searchQ)) return;
                      }
                    });
                  }
                }}
                className="w-full bg-white rounded-full py-2 pl-12 lg:pl-14 pr-10 text-sm font-archivo text-[#333366] focus:outline-none"
              />
              {searchQ && (
                <button
                  type="button"
                  onClick={() => { setSearchQ(""); setHighlightTaskId(null); setShowSearchPanel(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F3F2F7] hover:bg-[#DADCF5] flex items-center justify-center text-[#333366]"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {showSearchPanel && searchQ.trim() && searchResults.length > 0 && (
              <div data-search-panel className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-[#DADCF5] z-[160] max-h-80 overflow-y-auto">
                <ul className="divide-y divide-[#DADCF5]/60">
                  {searchResults.map((r, i) => (
                    <li
                      key={i}
                      onClick={() => { r.action(); setShowSearchPanel(false); }}
                      className="px-4 py-3 cursor-pointer hover:bg-[#F3F2F7]"
                    >
                      <p className="text-xs font-bold text-[#333366]">{r.label}</p>
                      <p className="text-[10px] text-[#9197B3]">{r.type} · {r.sub}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMeetingsPanel((v) => !v)}
                className="relative w-8 h-8 rounded-full bg-white flex items-center justify-center cursor-pointer"
                title="Upcoming meetings"
              >
                <Calendar className="w-5 h-5 text-[#727FE5]" />
                {upcomingMeetingsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 bg-[#848FE1] border-2 border-white rounded-full flex items-center justify-center text-[8px] font-semibold text-white">
                    {upcomingMeetingsCount > 9 ? "9+" : upcomingMeetingsCount}
                  </span>
                )}
              </button>
              <MeetingsQuickPanel
                open={showMeetingsPanel}
                onClose={() => setShowMeetingsPanel(false)}
                mode="manager"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifPanel((v) => {
                    const next = !v;
                    if (next) setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                    return next;
                  });
                }}
                className="relative w-8 h-8 rounded-full bg-white flex items-center justify-center cursor-pointer"
              >
                <Bell className="w-5 h-5 text-[#727FE5]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 bg-[#848FE1] border-2 border-white rounded-full flex items-center justify-center text-[8px] font-barlow font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-[#DADCF5]/60 z-[150]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#DADCF5]/60">
                    <span className="text-sm font-hind font-semibold text-[#333366]">Notifications</span>
                    <div className="flex items-center gap-3">
                      {notifications.length > 0 && (
                        <button onClick={() => setNotifications([])} className="text-xs text-[#727FE5] hover:underline">Clear all</button>
                      )}
                      <button onClick={() => setShowNotifPanel(false)} aria-label="Close" className="text-[#9197B3] hover:text-[#333366]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-[#9197B3]">No notifications yet</div>
                  ) : (
                    <ul className="divide-y divide-[#DADCF5]/60">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className={`px-4 py-3 ${n.onClick ? "cursor-pointer hover:bg-[#F3F2F7]" : ""}`}
                          onClick={() => {
                            if (n.onClick) {
                              n.onClick();
                              setShowNotifPanel(false);
                            }
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <Bell className="w-4 h-4 text-[#727FE5] mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-[#333366]">{n.title}</p>
                              {n.body && <p className="text-[11px] text-[#9197B3] mt-0.5">{n.body}</p>}
                              <p className="text-[10px] text-[#9197B3] mt-1">{n.time}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            
          </div>
        </div>
      </header>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-2xl my-auto">
            <div className="p-6 lg:p-8">

              <h2 className="text-2xl lg:text-3xl font-hind font-bold text-[#333366] mb-6">Project Information</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-[11px] font-inter font-medium text-[#333366] mb-2">Project Name</label>
                  <input
                    type="text"
                    placeholder="Enter project name"
                    value={newProjectData.name}
                    onChange={(e) => setNewProjectData({...newProjectData, name: e.target.value})}
                    className={`w-full h-12 px-4 border rounded-[5px] bg-white text-[#333366] placeholder-[#333366]/40 focus:outline-none ${showProjectErrors && !newProjectData.name.trim() ? "border-red-500 focus:border-red-500" : "border-[#333366] focus:border-[#727FE5]"}`}
                  />
                  {showProjectErrors && !newProjectData.name.trim() && (
                    <p className="mt-1 text-xs text-red-500">Project name is required</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-inter font-medium text-[#333366] mb-2">Project Description</label>
                  <textarea
                    placeholder="Enter project description"
                    value={newProjectData.description}
                    onChange={(e) => setNewProjectData({...newProjectData, description: e.target.value})}
                    className={`w-full h-24 px-4 py-2 border rounded-[5px] bg-white text-[#333366] placeholder-[#333366]/40 focus:outline-none resize-none ${showProjectErrors && !newProjectData.description.trim() ? "border-red-500 focus:border-red-500" : "border-[#333366] focus:border-[#727FE5]"}`}
                  />
                  {showProjectErrors && !newProjectData.description.trim() && (
                    <p className="mt-1 text-xs text-red-500">Project description is required</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CustomDropdown
                    label="Project Budget"
                    value={newProjectData.budget}
                    secondary={newProjectData.budget}
                    options={["700$-8900$", "30,000-100$", "100,000-500,000$"]}
                    onSelect={(val) => setNewProjectData({...newProjectData, budget: val})}
                  />
                  <CustomDropdown
                    label="Timeline"
                    value={newProjectData.timeline}
                    secondary={newProjectData.timeline}
                    options={["6-12 months", "6 months", "1-2 years"]}
                    onSelect={(val) => setNewProjectData({...newProjectData, timeline: val})}
                  />
                  <CustomDropdown
                    label="Company Stage"
                    value={newProjectData.stage}
                    secondary={newProjectData.stage}
                    options={["Growth", "Startup", "Enterprise"]}
                    onSelect={(val) => setNewProjectData({...newProjectData, stage: val})}
                  />
                  <CustomDropdown
                    label="Project Type"
                    value={newProjectData.type}
                    secondary={newProjectData.type}
                    options={["Business", "Technical", "Creative"]}
                    onSelect={(val) => setNewProjectData({...newProjectData, type: val})}
                  />
                  <CustomDropdown
                    label="Industry"
                    value={newProjectData.industry}
                    secondary={newProjectData.industry}
                    options={["Healthcare", "Education", "Finance", "Retail"]}
                    onSelect={(val) => setNewProjectData({...newProjectData, industry: val})}
                  />
                  <CustomDropdown
                    label="Number of Employees"
                    value={newProjectData.employees}
                    secondary={newProjectData.employees}
                    options={["100-200", "11-40", "1-10", "500+"]}
                    onSelect={(val) => setNewProjectData({...newProjectData, employees: val})}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#3F467F] p-6 flex justify-end gap-4">
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="px-6 h-10 bg-white/10 hover:bg-white/20 text-white text-sm font-hind font-bold rounded-[8px] transition-colors border border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                className="px-6 h-10 bg-[#848FE1] hover:bg-[#727FE5] text-white text-sm font-hind font-bold rounded-[8px] transition-colors flex items-center gap-2 shadow-lg"
              >
                <Save size={16} /> Save Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-[167px] pt-28 lg:pt-32 px-4 md:px-8 lg:pr-24 min-h-screen">
        <div className="flex flex-col gap-6 lg:gap-8">
          {activeSidebarItem === "settings" && (
            <>
              {activeMenu !== "team" && <h1 className="text-3xl lg:text-5xl font-hind font-bold text-[#333366]">Account Management</h1>}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                <div className="w-full lg:w-[227px] flex flex-row lg:flex-col gap-4 lg:gap-6 flex-shrink-0 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-hide">
                  <div className="bg-[#DADCF5] rounded-[15px] p-2 lg:p-3.5 shadow-sm flex flex-row lg:flex-col gap-1 lg:space-y-1 min-w-max lg:min-w-0">
                    {[
                      { id: "account", label: "Account Management", icon: Shield },
                      { id: "preferences", label: "Preferences", icon: Monitor },
                      { id: "team", label: "Team & Permissions", icon: Users }
                    ].map((item) => (
                      <button key={item.id} onClick={() => setActiveMenu(item.id)} className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] transition-all whitespace-nowrap ${activeMenu === item.id ? "bg-white shadow-sm" : "hover:bg-white/30"}`}>
                        <item.icon className="w-4 h-4 text-[#333366]" strokeWidth={1.8} />
                        <span className="text-[10.5px] font-inter font-medium text-[#333366]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                  {activeMenu === "account" && (
                  <div className="bg-[#DADCF5] rounded-[15px] p-2 lg:p-3.5 shadow-sm flex flex-row lg:flex-col gap-4 min-w-max lg:min-w-0">
                    <button onClick={() => setShowAddProjectModal(true)} className="h-10 px-4 lg:px-0 bg-[#848FE1] hover:bg-[#727FE5] text-white text-sm font-hind font-bold rounded-[8px] transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"><Plus size={16} />Add Project</button>
                    <div className="flex flex-row lg:flex-col gap-2 items-center lg:items-start">
                      <h3 className="text-[10px] lg:text-xs font-inter font-bold text-[#333366] px-2 whitespace-nowrap">Company Projects</h3>
                      <div className="flex flex-row lg:flex-col gap-1">
                        {projects.map((proj) => (
                          <button key={proj.name} onClick={() => { setActiveProject(proj.name); setIsEditingProject(false); }} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] text-[10.5px] font-inter font-medium transition-all whitespace-nowrap ${activeProject === proj.name ? "bg-[#848FE1] text-white shadow-sm" : "text-[#333366] hover:bg-white/30"}`}>
                            <span className="truncate max-w-[80px] lg:max-w-none">{proj.name}</span>
                            {activeProject === proj.name ? <MoreHorizontal size={14} /> : <ChevronDown size={14} className="opacity-40" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">{renderContent()}</div>
              </div>
            </>
          )}
          {activeSidebarItem !== "settings" && (
            <div className="flex-1 min-w-0 pt-4 lg:pt-0">{renderContent()}</div>
          )}
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[20px] shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F3F2F7] flex items-center justify-center mx-auto mb-4">
              <LogOut size={26} className="text-[#727FE5]" />
            </div>
            <h3 className="text-lg font-hind font-bold text-[#333366] mb-2">Log out?</h3>
            <p className="text-xs text-[#9197B3] mb-6">Do you want to log out of your account?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 h-10 rounded-[8px] border border-[#DADCF5] text-sm font-bold text-[#333366] hover:bg-[#F3F2F7]">No</button>
              <button onClick={handleConfirmLogout} className="flex-1 h-10 rounded-[8px] bg-[#727FE5] hover:bg-[#5d6bd9] text-sm font-bold text-white">Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function GatedIndex() {
  return (
    <AuthGate>
      <IndexPage />
    </AuthGate>
  );
}

export const Route = createFileRoute("/")({
  component: GatedIndex,
});

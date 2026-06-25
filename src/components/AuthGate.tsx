import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";

type Mode = "login" | "register";
type Role = "manager" | "employee";

export default function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("manager");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [empEmail, setEmpEmail] = useState("");

  const [rFull, setRFull] = useState("");
  const [rUser, setRUser] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rConfirm, setRConfirm] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleEmployeeLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!empEmail.trim()) { setError("Please enter your email"); return; }
    setLoading(true);
    const { data, error: err } = await supabase.from("employees").select("id, name, email, role, permissions").eq("email", empEmail.trim()).maybeSingle();
    setLoading(false);
    if (err) { setError(err.message); return; }
    if (!data) { setError("No account found — contact your manager"); return; }
    localStorage.setItem("lovable_employee", JSON.stringify(data));
    navigate({ to: "/employee" });
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!loginEmail.trim() || !loginPass) { setError("Please fill out all fields"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail.trim(), password: loginPass });
    setLoading(false);
    if (err) {
      const msg = err.message.toLowerCase();
      if (msg.includes("invalid") || msg.includes("credentials")) {
        setError("Invalid email or password. If you don't have an account, please register first.");
      } else if (msg.includes("not confirmed") || msg.includes("confirm")) {
        setError("Please confirm your email before logging in.");
      } else {
        setError(err.message);
      }
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!rFull.trim() || !rUser.trim() || !rEmail.trim() || !rPass || !rConfirm) { setError("Please fill out all fields"); return; }
    if (!/^\S+@\S+\.\S+$/.test(rEmail)) { setError("Invalid email"); return; }
    if (rPass.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (rPass !== rConfirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: rEmail.trim(), password: rPass,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: rFull.trim(), username: rUser.trim() } },
    });
    setLoading(false);
    if (err) setError(err.message);
  };

  if (!ready) return null;
  if (session) return <>{children}</>;

  const inputCls = "w-full h-11 px-4 rounded-full bg-[#DADCF5] border-none outline-none text-[#333366] text-sm focus:ring-2 focus:ring-white/60";

  const RoleTabs = () => (
    <div className="flex gap-2 mb-4 p-1 bg-[#DADCF5]/50 rounded-full">
      <button type="button" onClick={() => { setRole("manager"); setError(""); }} className={`flex-1 h-9 rounded-full text-xs font-bold transition ${role === "manager" ? "bg-[#848FE1] text-white shadow" : "text-[#333366]"}`}>Manager</button>
      <button type="button" onClick={() => { setRole("employee"); setError(""); setMode("login"); }} className={`flex-1 h-9 rounded-full text-xs font-bold transition ${role === "employee" ? "bg-[#848FE1] text-white shadow" : "text-[#333366]"}`}>Employee</button>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F3F2F7]">
      <div className="w-full min-h-screen bg-[#F3F2F7] overflow-hidden relative">
        {mode === "login" ? (
          <div className="grid md:grid-cols-2 min-h-screen">
            <div className="relative bg-gradient-to-br from-[#848FE1] to-[#5563C1] flex flex-col justify-between p-10 md:rounded-r-[50%]">
              <div className="text-white text-2xl font-bold tracking-wider">AF<span className="text-xs align-super">ee</span>r</div>
              <h1 className="text-white text-5xl font-extrabold leading-tight">Welcome<br />Back!</h1>
              <div />
            </div>
            <div className="flex flex-col justify-center p-10">
              <RoleTabs />
              {role === "manager" ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-[#333366] text-sm mb-2">Email:</label>
                    <input type="email" className={inputCls} value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[#333366] text-sm mb-2">Password:</label>
                    <input type="password" className={inputCls} value={loginPass} onChange={(e) => setLoginPass(e.target.value)} />
                  </div>
                  {error && <p className="text-red-500 text-xs">{error}</p>}
                  <button disabled={loading} type="submit" className="w-full h-12 rounded-full bg-[#848FE1] hover:bg-[#6f7bd1] text-white text-lg font-medium transition-colors disabled:opacity-50">
                    {loading ? "..." : "Log in"}
                  </button>
                  <p className="text-center text-xs text-[#333366]">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => { setError(""); setMode("register"); }} className="font-bold hover:underline">Register</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleEmployeeLogin} className="space-y-5">
                  <div>
                    <label className="block text-[#333366] text-sm mb-2">Employee Email:</label>
                    <input type="email" className={inputCls} value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="employee@company.com" />
                    <p className="text-[10px] text-[#9197B3] mt-2">Use the email your manager registered for you.</p>
                  </div>
                  {error && <p className="text-red-500 text-xs">{error}</p>}
                  <button disabled={loading} type="submit" className="w-full h-12 rounded-full bg-[#848FE1] hover:bg-[#6f7bd1] text-white text-lg font-medium transition-colors disabled:opacity-50">
                    {loading ? "..." : "Enter"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="p-10 min-h-[600px] flex flex-col items-center">
            <h2 className="text-2xl font-bold text-[#333366] mb-6">Please Fill out form to Register!</h2>
            <div className="relative w-full max-w-md">
              <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-[#848FE1] to-[#5563C1] blur-sm" />
              <form onSubmit={handleRegister} className="relative space-y-3 p-8">
                <div>
                  <label className="block text-white text-sm mb-1">Full name:</label>
                  <input className={inputCls} value={rFull} onChange={(e) => setRFull(e.target.value)} />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1">Username:</label>
                  <input className={inputCls} value={rUser} onChange={(e) => setRUser(e.target.value)} />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1">Email:</label>
                  <input type="email" className={inputCls} value={rEmail} onChange={(e) => setREmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1">Password:</label>
                  <input type="password" className={inputCls} value={rPass} onChange={(e) => setRPass(e.target.value)} />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1">Confirm Password:</label>
                  <input type="password" className={inputCls} value={rConfirm} onChange={(e) => setRConfirm(e.target.value)} />
                </div>
                {error && <p className="text-red-200 text-xs text-center">{error}</p>}
                <button disabled={loading} type="submit" className="w-full h-12 rounded-full bg-[#DADCF5] hover:bg-white text-[#333366] text-lg font-medium transition-colors disabled:opacity-50">
                  {loading ? "..." : "Register"}
                </button>
                <p className="text-center text-xs text-white">
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setError(""); setMode("login"); }} className="font-bold hover:underline">Log in</button>
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

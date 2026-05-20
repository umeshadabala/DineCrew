import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import {
  BarChart3,
  Check,
  Download,
  Home,
  Loader2,
  LogOut,
  Moon,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Star,
  Sun,
  Trash2,
  Users,
  MessageSquareText,
  Settings,
  Wifi,
  X
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "";
const nav = [
  ["/dashboard", Home, "Overview"],
  ["/dashboard/waiters", Users, "Waiters"],
  ["/dashboard/tables", QrCode, "QR"],
  ["/dashboard/reviews", MessageSquareText, "Reviews"],
  ["/dashboard/analytics", BarChart3, "Analytics"],
  ["/dashboard/settings", Settings, "Settings"]
];

function routeTo(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

function useAuth() {
  const [token, setToken] = useState(localStorage.getItem("restotip_token"));
  const [restaurant, setRestaurant] = useState(JSON.parse(localStorage.getItem("restotip_restaurant") || "null"));

  function save(payload) {
    localStorage.setItem("restotip_token", payload.token);
    localStorage.setItem("restotip_restaurant", JSON.stringify(payload.restaurant));
    setToken(payload.token);
    setRestaurant(payload.restaurant);
  }

  function logout() {
    localStorage.removeItem("restotip_token");
    localStorage.removeItem("restotip_restaurant");
    setToken(null);
    setRestaurant(null);
    routeTo("/login");
  }

  return { token, restaurant, save, logout };
}

function api(token, path, options = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  }).then(async (res) => {
    if (!res.ok) {
      let message = "Request failed";
      try {
        message = (await res.json()).error || message;
      } catch {
        message = res.statusText || message;
      }
      if (res.status === 401) {
        localStorage.removeItem("restotip_token");
        localStorage.removeItem("restotip_restaurant");
        routeTo("/login");
      }
      throw new Error(message);
    }
    if (res.status === 204) return null;
    return res.json();
  });
}

function useResource(load, deps = [], { intervalMs = 0, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  async function reload({ quiet = false } = {}) {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const result = await load();
      setData(result);
      setUpdatedAt(new Date());
      return result;
    } catch (err) {
      setError(err.message || "Something went wrong");
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let alive = true;
    async function run({ quiet = false } = {}) {
      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const result = await load();
        if (!alive) return;
        setData(result);
        setUpdatedAt(new Date());
      } catch (err) {
        if (!alive) return;
        setError(err.message || "Something went wrong");
      } finally {
        if (!alive) return;
        setLoading(false);
        setRefreshing(false);
      }
    }

    run();
    const timer = intervalMs ? window.setInterval(() => run({ quiet: true }), intervalMs) : null;
    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, deps);

  return { data, setData, loading, refreshing, error, updatedAt, reload };
}

function AuthPage({ mode, auth }) {
  const [form, setForm] = useState({ name: "", email: "owner@spicehub.in", password: "password123" });
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const payload = await api(null, `/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      auth.save(payload);
      routeTo("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">RestoTip by ParkoSpace</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{isRegister ? "Create dashboard" : "Restaurant login"}</h1>
        {isRegister && <Input label="Restaurant name" value={form.name} onChange={(name) => setForm({ ...form, name })} />}
        <Input label="Email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
        <Input label="Password" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} />
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button className="mt-6 h-12 w-full rounded-xl bg-slate-950 font-bold text-white dark:bg-white dark:text-slate-950">
          {isRegister ? "Register" : "Login"}
        </button>
        <button
          type="button"
          onClick={() => routeTo(isRegister ? "/login" : "/register")}
          className="mt-4 w-full text-sm font-semibold text-teal-700"
        >
          {isRegister ? "Already registered? Login" : "New restaurant? Register"}
        </button>
      </form>
    </main>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

function Shell({ auth, path, children }) {
  const [dark, setDark] = useState(localStorage.getItem("restotip_dark") === "true");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("restotip_dark", String(dark));
  }, [dark]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="rounded-xl bg-teal-700 p-4 text-white">
          <p className="text-xl font-black">RestoTip</p>
          <p className="text-sm text-teal-50">{auth.restaurant?.name}</p>
        </div>
        <nav className="mt-6 space-y-1">
          {nav.map(([href, Icon, label]) => (
            <button key={href} onClick={() => routeTo(href)} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ${path === href ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Restaurant dashboard</p>
              <p className="font-bold">{auth.restaurant?.name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDark(!dark)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700" title="Toggle theme">
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={auth.logout} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700" title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {nav.map(([href, Icon, label]) => (
              <button key={href} onClick={() => routeTo(href)} className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${path === href ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-slate-100 dark:bg-slate-800"}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function Card({ label, value, icon: Icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <Icon size={20} className="text-teal-700" />
      </div>
      <p className="mt-3 text-3xl font-black">{value ?? "0"}</p>
    </motion.div>
  );
}

function BlankAd() {
  return <div className="min-h-28 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800" aria-hidden="true" />;
}

function Overview({ token }) {
  const { data: stats, loading, refreshing, error, updatedAt, reload } = useResource(
    () => api(token, "/api/dashboard/overview"),
    [token],
    { intervalMs: 10000 }
  );
  if (error) return <EmptyState title="Dashboard could not load" message="Please log in again or check that the API server is running." />;
  if (loading || !stats) return <Loading />;
  return (
    <section>
      <PageTitle title="Overview" subtitle="Reviews, ratings, and tip attempts at a glance." />
      <LiveMeta updatedAt={updatedAt} refreshing={refreshing} onRefresh={reload} intervalLabel="Live metrics · 10s" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card label="Total reviews" value={stats.total_reviews} icon={MessageSquareText} />
        <Card label="Food rating" value={stats.average_food_rating || "0.0"} icon={Star} />
        <Card label="Service rating" value={stats.average_service_rating || "0.0"} icon={Star} />
        <Card label="Tip attempts" value={stats.total_tip_attempts} icon={QrCode} />
        <Card label="Top waiter" value={stats.top_waiter} icon={Users} />
      </div>
      <div className="mt-6"><BlankAd /></div>
    </section>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mt-1 text-slate-500">{subtitle}</p>
    </div>
  );
}

function Loading() {
  return <div className="grid h-56 place-items-center"><Loader2 className="animate-spin text-teal-700" /></div>;
}

function EmptyState({ title, message }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function LiveMeta({ updatedAt, refreshing, onRefresh, intervalLabel = "Live" }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center gap-2 text-slate-500">
        <Wifi size={16} className="text-teal-700" />
        <span>{intervalLabel}</span>
        {updatedAt && <span>· Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
      </div>
      <button
        type="button"
        onClick={() => onRefresh?.({ quiet: true })}
        className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        Refresh
      </button>
    </div>
  );
}

function SkeletonRows({ count = 3 }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="h-full rounded-2xl bg-gradient-to-r from-transparent via-slate-100 to-transparent dark:via-slate-800" />
        </div>
      ))}
    </div>
  );
}

function Waiters({ token }) {
  const [form, setForm] = useState({ name: "", upiId: "", active: true });
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", upiId: "", active: true });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const {
    data: waiters = [],
    setData: setWaiters,
    loading,
    refreshing,
    error,
    updatedAt,
    reload
  } = useResource(() => api(token, "/api/waiters"), [token], { intervalMs: 12000, initialData: [] });

  async function add(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const created = await api(token, "/api/waiters", { method: "POST", body: JSON.stringify(form) });
      setWaiters((current) => [created, ...current]);
      setForm({ name: "", upiId: "", active: true });
      setNotice("Staff member added");
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(waiter) {
    setEditingId(waiter.id);
    setDraft({ name: waiter.name, upiId: waiter.upi_id, active: Boolean(waiter.active) });
  }

  async function saveEdit(id) {
    setSaving(true);
    setNotice("");
    const previous = waiters;
    setWaiters((current) =>
      current.map((waiter) => waiter.id === id ? { ...waiter, name: draft.name, upi_id: draft.upiId, active: draft.active ? 1 : 0 } : waiter)
    );
    setEditingId(null);
    try {
      const updated = await api(token, `/api/waiters/${id}`, { method: "PUT", body: JSON.stringify(draft) });
      setWaiters((current) => current.map((waiter) => waiter.id === id ? updated : waiter));
      setNotice("Staff member updated");
    } catch (err) {
      setWaiters(previous);
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(waiter) {
    const next = { name: waiter.name, upiId: waiter.upi_id, active: !waiter.active };
    const previous = waiters;
    setWaiters((current) => current.map((item) => item.id === waiter.id ? { ...item, active: next.active ? 1 : 0 } : item));
    try {
      const updated = await api(token, `/api/waiters/${waiter.id}`, { method: "PUT", body: JSON.stringify(next) });
      setWaiters((current) => current.map((item) => item.id === waiter.id ? updated : item));
    } catch (err) {
      setWaiters(previous);
      setNotice(err.message);
    }
  }

  async function remove(id) {
    const previous = waiters;
    setWaiters((current) => current.filter((waiter) => waiter.id !== id));
    setNotice("");
    try {
      await api(token, `/api/waiters/${id}`, { method: "DELETE" });
      setNotice("Staff member removed");
    } catch (err) {
      setWaiters(previous);
      setNotice(err.message);
    }
  }

  return (
    <section>
      <PageTitle title="Waiters" subtitle="Manage waiter names, active status, and UPI IDs." />
      <LiveMeta updatedAt={updatedAt} refreshing={refreshing} onRefresh={reload} intervalLabel="Live staff list · 12s" />
      <form onSubmit={add} className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 md:grid-cols-[1fr_1fr_auto_auto]">
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950" />
        <input required value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} placeholder="UPI ID" className="h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950" />
        <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
        <button disabled={saving} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 font-bold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          Add
        </button>
      </form>
      {notice && <p className="mt-3 rounded-xl bg-teal-50 p-3 text-sm font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-100">{notice}</p>}
      {error && <div className="mt-4"><EmptyState title="Staff could not load" message={error} /></div>}
      {loading && <div className="mt-4"><SkeletonRows /></div>}
      <div className="mt-4 grid gap-3">
        {waiters.map((waiter) => (
          <motion.div layout key={waiter.id} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {editingId === waiter.id ? (
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950" />
                <input value={draft.upiId} onChange={(e) => setDraft({ ...draft, upiId: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950" />
                <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-700"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveEdit(waiter.id)} className="grid h-11 w-11 place-items-center rounded-xl bg-teal-700 text-white" title="Save staff"><Save size={18} /></button>
                  <button type="button" onClick={() => setEditingId(null)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-slate-700" title="Cancel edit"><X size={18} /></button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{waiter.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${waiter.active ? "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-100" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                      {waiter.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{waiter.upi_id}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(waiter)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-teal-700 dark:border-slate-700" title={waiter.active ? "Set inactive" : "Set active"}><Check size={18} /></button>
                  <button onClick={() => startEdit(waiter)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700" title="Edit staff"><Pencil size={18} /></button>
                  <button onClick={() => remove(waiter.id)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-rose-600 dark:border-slate-700" title="Remove staff"><Trash2 size={18} /></button>
                </div>
              </div>
            )}
          </motion.div>
        ))}
        {!loading && !error && waiters.length === 0 && <EmptyState title="No staff added yet" message="Add your team above so customers can choose who served them." />}
      </div>
    </section>
  );
}

function Tables({ restaurant }) {
  const customerBaseUrl = import.meta.env.VITE_CUSTOMER_URL || "http://localhost:5173";
  const publicUrl = restaurant?.slug ? `${customerBaseUrl}/r/${restaurant.slug}` : "";
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, { width: 1024, margin: 2, color: { dark: "#0f172a", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [publicUrl]);

  async function copyUrl() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `${restaurant.slug}-restotip-restaurant-qr.png`;
    anchor.click();
  }

  return (
    <section>
      <PageTitle title="Restaurant QR" subtitle="One QR for the whole restaurant. Guests pick the staff member after scanning." />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <motion.div layout className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Restaurant QR code" className="mx-auto aspect-square w-full max-w-80 rounded-xl bg-white p-3" />
            ) : (
              <div className="grid aspect-square w-full max-w-80 place-items-center rounded-xl bg-white text-teal-700">
                <Loader2 className="animate-spin" />
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={downloadQr} className="flex h-10 items-center gap-2 rounded-xl bg-teal-700 px-3 text-sm font-bold text-white">
              <Download size={16} /> PNG
            </button>
            <button onClick={() => window.print()} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-slate-700">Print</button>
            <button onClick={copyUrl} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-slate-700">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </motion.div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-700">Public customer link</p>
          <p className="mt-3 break-all rounded-xl bg-slate-100 p-4 text-sm dark:bg-slate-800">{publicUrl}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="font-bold">1. Scan</p>
              <p className="mt-1 text-sm text-slate-500">Guest opens the restaurant-wide flow.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="font-bold">2. Pick staff</p>
              <p className="mt-1 text-sm text-slate-500">They choose who served them from active staff.</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="font-bold">3. Rate + tip</p>
              <p className="mt-1 text-sm text-slate-500">Ratings and UPI tip attempts are saved.</p>
            </div>
          </div>
          <div className="mt-5"><BlankAd /></div>
        </div>
      </div>
    </section>
  );
}

function Reviews({ token }) {
  const [filters, setFilters] = useState({ date: "", waiter: "", rating: "" });
  const {
    data,
    loading,
    refreshing,
    error,
    updatedAt,
    reload
  } = useResource(() => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
    return Promise.all([
      api(token, "/api/waiters"),
      api(token, `/api/reviews${query ? `?${query}` : ""}`)
    ]).then(([waiters, reviews]) => ({ waiters, reviews }));
  }, [token, filters.date, filters.waiter, filters.rating], { intervalMs: 6000, initialData: { waiters: [], reviews: [] } });
  const waiters = data?.waiters || [];
  const reviews = data?.reviews || [];

  return (
    <section>
      <PageTitle title="Reviews" subtitle="Filter by date, waiter, and rating." />
      <LiveMeta updatedAt={updatedAt} refreshing={refreshing} onRefresh={reload} intervalLabel="Live review feed · 6s" />
      <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 md:grid-cols-3">
        <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950" />
        <select value={filters.waiter} onChange={(e) => setFilters({ ...filters, waiter: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950">
          <option value="">All waiters</option>
          {waiters.map((waiter) => <option key={waiter.id} value={waiter.id}>{waiter.name}</option>)}
        </select>
        <select value={filters.rating} onChange={(e) => setFilters({ ...filters, rating: e.target.value })} className="h-11 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950">
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
        </select>
      </div>
      {error && <div className="mt-4"><EmptyState title="Reviews could not load" message={error} /></div>}
      {loading && <div className="mt-4"><SkeletonRows count={4} /></div>}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        {reviews.map((review) => (
          <motion.div layout key={review.id} className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 dark:border-slate-800 md:grid-cols-[1fr_1fr_2fr_1fr]">
            <div><p className="font-bold">{review.table_number || "Restaurant QR"}</p><p className="text-sm text-slate-500">{review.waiter_name || "Team"}</p></div>
            <div><p>Food {review.food_rating} · Service {review.service_rating}</p><p className="text-sm text-slate-500">Tip ₹{review.tip_amount || 0}</p></div>
            <p className="text-slate-600 dark:text-slate-300">{review.feedback || "No feedback"}</p>
            <p className="text-sm text-slate-500">{new Date(review.created_at).toLocaleString()}</p>
          </motion.div>
        ))}
        {!loading && !error && reviews.length === 0 && <EmptyState title="No reviews match" message="New customer feedback will appear here automatically." />}
      </div>
    </section>
  );
}

function Analytics({ token }) {
  const { data, loading, refreshing, error, updatedAt, reload } = useResource(
    () => api(token, "/api/analytics"),
    [token],
    { intervalMs: 12000 }
  );
  if (error) return <EmptyState title="Analytics could not load" message={error} />;
  if (loading || !data) return <Loading />;
  return (
    <section>
      <PageTitle title="Analytics" subtitle="Rating trends, daily reviews, top waiters, and busy hours." />
      <LiveMeta updatedAt={updatedAt} refreshing={refreshing} onRefresh={reload} intervalLabel="Live analytics · 12s" />
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Rating trends" empty={!data.ratingTrends.length}>
          <LineChart data={data.ratingTrends}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis domain={[0, 5]} /><Tooltip /><Line dataKey="food" stroke="#0f766e" strokeWidth={3} /><Line dataKey="service" stroke="#f59e0b" strokeWidth={3} /></LineChart>
        </ChartCard>
        <ChartCard title="Daily reviews" empty={!data.dailyReviews.length}>
          <BarChart data={data.dailyReviews}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="reviews" fill="#0f766e" radius={[8, 8, 0, 0]} /></BarChart>
        </ChartCard>
        <ChartCard title="Top waiters" empty={!data.topWaiters.length}>
          <BarChart data={data.topWaiters}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis domain={[0, 5]} /><Tooltip /><Bar dataKey="rating" fill="#f59e0b" radius={[8, 8, 0, 0]} /></BarChart>
        </ChartCard>
        <ChartCard title="Busy hours" empty={!data.busyHours.length}>
          <BarChart data={data.busyHours}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="reviews" fill="#334155" radius={[8, 8, 0, 0]} /></BarChart>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, children, empty }) {
  return (
    <div className="h-80 rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <p className="mb-3 font-bold">{title}</p>
      {empty ? (
        <div className="grid h-[88%] place-items-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-slate-950">Waiting for data</div>
      ) : (
        <ResponsiveContainer width="100%" height="88%">{children}</ResponsiveContainer>
      )}
    </div>
  );
}

function SettingsPage({ auth }) {
  return (
    <section>
      <PageTitle title="Settings" subtitle="Restaurant identity and dashboard preferences." />
      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-xl font-black">{auth.restaurant?.name}</p>
        <p className="mt-1 text-slate-500">{auth.restaurant?.email}</p>
        <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">Public link: /r/{auth.restaurant?.slug}</p>
      </div>
    </section>
  );
}

function Admin() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api(null, "/api/admin/stats").then(setStats); }, []);
  return (
    <main className="min-h-screen bg-slate-100 p-6 dark:bg-slate-950 dark:text-white">
      <PageTitle title="Admin" subtitle="Platform-level stats for ParkoSpace." />
      {stats ? <div className="grid gap-4 md:grid-cols-4"><Card label="Restaurants" value={stats.restaurants} icon={Home} /><Card label="Reviews" value={stats.reviews} icon={MessageSquareText} /><Card label="Waiters" value={stats.waiters} icon={Users} /><Card label="QR records" value={stats.tables} icon={QrCode} /></div> : <Loading />}
    </main>
  );
}

function App() {
  const path = usePath();
  const auth = useAuth();
  const page = useMemo(() => {
    if (path === "/dashboard/waiters") return <Waiters token={auth.token} />;
    if (path === "/dashboard/tables") return <Tables restaurant={auth.restaurant} />;
    if (path === "/dashboard/reviews") return <Reviews token={auth.token} />;
    if (path === "/dashboard/analytics") return <Analytics token={auth.token} />;
    if (path === "/dashboard/settings") return <SettingsPage auth={auth} />;
    return <Overview token={auth.token} />;
  }, [path, auth.token, auth.restaurant]);

  if (path === "/admin") return <Admin />;
  if (path === "/register") return <AuthPage mode="register" auth={auth} />;
  if (!auth.token || !auth.restaurant || path === "/login") return <AuthPage mode="login" auth={auth} />;
  return <Shell auth={auth} path={path}>{page}</Shell>;
}

createRoot(document.getElementById("root")).render(<App />);

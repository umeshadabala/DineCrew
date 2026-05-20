import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Heart, Loader2, Sparkles, Star, UserCheck } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "";

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

function StarRating({ value, onChange, label }) {
  return (
    <motion.div layout className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-slate-950 dark:text-white">{label}</p>
        {value > 0 && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-100">{value}/5</span>}
      </div>
      <div className="mt-4 flex justify-between gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`grid h-12 w-12 place-items-center rounded-full transition active:scale-95 ${
              rating <= value
                ? "bg-amber-100 text-amber-400 shadow-sm dark:bg-amber-950"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
            }`}
            aria-label={`${rating} stars`}
          >
            <Star
              size={28}
              className={rating <= value ? "fill-amber-400 text-amber-400" : ""}
            />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function StaffPicker({ waiters, selectedWaiterId, onSelect }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center gap-2">
        <UserCheck size={20} className="text-teal-700" />
        <p className="text-lg font-semibold text-slate-950 dark:text-white">Who served you?</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {waiters.map((waiter) => {
          const selected = waiter.id === selectedWaiterId;
          return (
            <motion.button
              whileTap={{ scale: 0.97 }}
              key={waiter.id}
              type="button"
              onClick={() => onSelect(waiter.id)}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-teal-600 bg-teal-50 text-teal-950 shadow-sm dark:bg-teal-950 dark:text-teal-50"
                  : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              }`}
            >
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-base font-black text-teal-700 shadow-sm dark:bg-slate-900">
                {waiter.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="mt-3 block truncate font-bold">{waiter.name}</span>
              {selected && <CheckCircle2 className="absolute right-3 top-3 text-teal-700 dark:text-teal-200" size={19} />}
            </motion.button>
          );
        })}
      </div>
      {waiters.length === 0 && <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">No active staff found. Please ask the restaurant team to add staff in the portal.</p>}
    </section>
  );
}

function BlankAd() {
  return <div className="min-h-20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800" aria-hidden="true" />;
}

function CustomerPage({ slug, tableId }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [selectedWaiterId, setSelectedWaiterId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [tipAmount, setTipAmount] = useState(null);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const primaryUrl = tableId
      ? `${API}/api/public/restaurants/${slug}/tables/${tableId}`
      : `${API}/api/public/restaurants/${slug}`;

    fetch(primaryUrl)
      .then((res) => {
        if (!res.ok) throw new Error("This QR code is not active");
        return res.json();
      })
      .catch(() => {
        if (tableId) throw new Error("This QR code is not active");
        return fetch(`${API}/api/public/restaurants/${slug}/tables/table-4`).then((res) => {
          if (!res.ok) throw new Error("This QR code is not active");
          return res.json();
        }).then((data) => ({ ...data, table_number: "Restaurant QR" }));
      })
      .then(setContext)
      .catch(() => setContext(null))
      .finally(() => setLoading(false));
  }, [slug, tableId]);

  const selectedTip = useMemo(() => Number(customTip || tipAmount || 0), [customTip, tipAmount]);
  const selectedWaiter = useMemo(
    () => context?.waiters?.find((waiter) => waiter.id === selectedWaiterId),
    [context, selectedWaiterId]
  );

  function openUpi(amount) {
    if (!selectedWaiter?.upi_id || !amount) return;
    setTipAmount(amount);
    setCustomTip("");
    setShowCustomTip(false);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(selectedWaiter.upi_id)}&pn=${encodeURIComponent(
      selectedWaiter.name
    )}&am=${amount}&cu=INR`;
    window.location.href = upiUrl;
  }

  async function submit() {
    if (!context || !selectedWaiterId || foodRating === 0 || serviceRating === 0) return;
    setSubmitting(true);
    await fetch(`${API}/api/public/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: context.restaurant_id,
        tableId: context.table_id || null,
        waiterId: selectedWaiterId,
        foodRating,
        serviceRating,
        feedback,
        tipAmount: selectedTip || null
      })
    });
    window.history.pushState({}, "", "/thank-you");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-teal-700 dark:bg-slate-950">
        <Loader2 className="animate-spin" />
      </main>
    );
  }

  if (!context) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center dark:bg-slate-950">
        <div>
          <p className="text-xl font-semibold text-slate-950 dark:text-white">QR not found</p>
          <p className="mt-2 text-slate-500">Please ask the restaurant team for a fresh code.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ccfbf1_0,#f8fafc_38%,#f8fafc_100%)] px-4 py-5 text-slate-950 dark:bg-[radial-gradient(circle_at_top,#134e4a_0,#020617_42%,#020617_100%)] dark:text-white">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/15 dark:bg-teal-950">
          <div className="flex items-center gap-4">
            <img src={context.logo_url} alt="" className="h-14 w-14 rounded-2xl bg-white object-cover p-1" />
            <div>
              <p className="text-2xl font-bold">{context.restaurant_name}</p>
              <p className="text-sm text-slate-300">{context.table_number || "Restaurant QR"}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-300">
            <div className={`rounded-2xl p-2 ${selectedWaiterId ? "bg-teal-500 text-white" : "bg-white/10"}`}>Staff</div>
            <div className={`rounded-2xl p-2 ${foodRating && serviceRating ? "bg-amber-400 text-slate-950" : "bg-white/10"}`}>Rate</div>
            <div className={`rounded-2xl p-2 ${serviceRating >= 4 ? "bg-rose-500 text-white" : "bg-white/10"}`}>Tip</div>
          </div>
        </header>

        <StaffPicker
          waiters={context.waiters || []}
          selectedWaiterId={selectedWaiterId}
          onSelect={(id) => {
            setSelectedWaiterId(id);
            setTipAmount(null);
            setCustomTip("");
          }}
        />

        <StarRating label="How was your food?" value={foodRating} onChange={setFoodRating} />
        <StarRating label="How was the service?" value={serviceRating} onChange={setServiceRating} />

        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          placeholder="Tell us more about your experience"
          className="min-h-28 rounded-3xl border border-slate-200 bg-white p-4 text-base shadow-sm outline-none focus:border-teal-500 dark:border-slate-800 dark:bg-slate-900"
        />

        <AnimatePresence>
          {serviceRating >= 4 && selectedWaiter && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Heart className="fill-rose-500 text-rose-500" size={20} />
                <span>Loved the service?</span>
              </div>
              <p className="mt-1 text-slate-500">Appreciate {selectedWaiter.name} ❤️</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[20, 50, 100].map((amount) => (
                  <button key={amount} onClick={() => openUpi(amount)} className="h-12 rounded-xl bg-teal-50 font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-100">
                    ₹{amount}
                  </button>
                ))}
                <button onClick={() => setShowCustomTip(true)} className="h-12 rounded-xl bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  Custom
                </button>
              </div>
              {showCustomTip && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={customTip}
                    onChange={(event) => {
                      setTipAmount(null);
                      setCustomTip(event.target.value.replace(/\D/g, ""));
                    }}
                    inputMode="numeric"
                    placeholder="Amount"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-950"
                  />
                  <button onClick={() => openUpi(Number(customTip))} className="h-12 rounded-xl bg-teal-700 px-5 font-bold text-white">
                    Pay
                  </button>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {serviceRating >= 4 && !selectedWaiter && (
          <div className="rounded-3xl bg-amber-50 p-4 text-sm font-semibold text-amber-900 ring-1 ring-amber-100 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-900">
            Select your staff member to unlock UPI tipping.
          </div>
        )}

        <BlankAd />

        <button
          onClick={submit}
          disabled={!selectedWaiterId || !foodRating || !serviceRating || submitting}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-teal-700 text-lg font-bold text-white shadow-lg shadow-teal-900/10 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Sparkles size={19} />
          {submitting ? "Saving..." : "Submit"}
        </button>
      </div>
    </main>
  );
}

function ThankYou() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center dark:bg-slate-950">
      <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-sm">
        <motion.div initial={{ rotate: -20 }} animate={{ rotate: 0 }} transition={{ type: "spring" }} className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-200">
          <CheckCircle2 size={52} />
        </motion.div>
        <h1 className="mt-6 text-3xl font-black text-slate-950 dark:text-white">Thank you</h1>
        <p className="mt-2 text-slate-500">Your review helps the restaurant team serve better.</p>
      </motion.div>
    </main>
  );
}

function Home() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center dark:bg-slate-950">
      <div className="max-w-sm">
        <p className="text-3xl font-black text-slate-950 dark:text-white">RestoTip</p>
        <p className="mt-2 text-slate-500">Scan the restaurant QR to leave a quick review and tip with UPI.</p>
      </div>
    </main>
  );
}

function App() {
  const path = useRoute();
  const match = path.match(/^\/r\/([^/]+)(?:\/([^/]+))?$/);
  if (path === "/thank-you") return <ThankYou />;
  if (match) return <CustomerPage slug={match[1]} tableId={match[2]} />;
  return <Home />;
}

createRoot(document.getElementById("root")).render(<App />);

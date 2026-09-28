import { useEffect, useState } from "react";
import { ChefHat, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";

export default function ChefDashboardPage() {
  const navigate = useNavigate();
  const [chef, setChef] = useState(null);

  useEffect(() => {
    requestJson("/api/chef/me", { method: "GET" })
      .then(setChef)
      .catch(() => navigate("/chef/login", { replace: true }));
  }, [navigate]);

  async function handleLogout() {
    try {
      await requestJson("/api/auth/chef/logout", { method: "POST" });
    } finally {
      navigate("/chef/login", { replace: true });
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7f8] text-[#172335]">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 sm:px-10">
        <div className="flex items-center gap-3 font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0fa99d] text-white"><ChefHat size={19} /></span>
          DineBook Chef Portal
        </div>
        <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-[#0fa99d] hover:text-[#0fa99d]" type="button">
          <LogOut size={16} /> Sign out
        </button>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0fa99d]">Kitchen portal</p>
          <h1 className="mt-2 text-3xl font-semibold">Welcome{chef?.name ? `, ${chef.name}` : ""}</h1>
          <p className="mt-3 text-sm text-gray-500">You’re signed in to DineBook as a chef.</p>
        </div>
      </section>
    </main>
  );
}

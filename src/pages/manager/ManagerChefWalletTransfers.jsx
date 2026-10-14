import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ManagerChefWalletTransfers() {
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [chefId, setChefId] = useState("");
  const [amount, setAmount] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const [revenue, walletData] = await Promise.all([
      requestJson("/api/manager/revenue"), requestJson("/api/manager/wallet"),
    ]);
    setData(revenue);
    setWallet(walletData);
    setChefId((current) => revenue.chefs?.some((chef) => chef.id === current) ? current : (revenue.chefs?.[0]?.id || ""));
  }, []);

  useEffect(() => { refresh().catch((reason) => setError(reason.message)); }, [refresh]);
  useRealtimeEvents({ enabled: true, onEvent: () => refresh().catch(() => {}), onReconnect: () => refresh().catch(() => {}) });

  async function send(event) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const amountToSend = Number(amount);
      const key = idempotencyKey || window.crypto.randomUUID();
      setIdempotencyKey(key);
      await requestJson("/api/manager/wallet/transfers", {
        method: "POST", body: JSON.stringify({ chef_id: chefId, amount: amountToSend, idempotency_key: key }),
      });
      await refresh();
      setNotice(`${money(amountToSend)} sent to the chef's DineBook wallet.`);
      setAmount(""); setIdempotencyKey("");
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }

  const selectedChef = data?.chefs?.find((chef) => chef.id === chefId);
  return <section className="revenue-card manager-wallet-section" aria-labelledby="staff-chef-transfers-title">
    <div className="revenue-card-heading"><div><h3 id="staff-chef-transfers-title" className="flex items-center gap-2"><ArrowRightLeft size={18} /> Chef wallet transfers</h3><p>Send an exact amount from the restaurant wallet to a chef's wallet.</p></div><strong className="revenue-wallet-balance">Available: {money(wallet?.balance)}</strong></div>
    {error && <p className="revenue-error" role="alert">{error}</p>}
    {notice && <p className="revenue-notice" role="status">{notice}</p>}
    {data?.chefs?.length ? <>
      <form className="revenue-transfer-form revenue-transfer-controls" onSubmit={send}>
        <label>Choose chef<select value={chefId} onChange={(event) => { setChefId(event.target.value); setAmount(""); setIdempotencyKey(""); }}>
          {data.chefs.map((chef) => <option key={chef.id} value={chef.id}>{chef.name}</option>)}
        </select></label>
        <label>Exact amount to send<span>₹<input type="number" min="0.01" max={wallet?.balance || 0} step="0.01" value={amount} onChange={(event) => { setAmount(event.target.value); setIdempotencyKey(""); }} /></span></label>
        <button type="submit" disabled={!chefId || saving || Number(wallet?.balance || 0) <= 0}>{saving ? "Sending…" : "Send exact amount"}</button>
      </form>
      {selectedChef && <div className="revenue-chef-summary"><strong>{selectedChef.name}</strong><span>Sent this month: {money(selectedChef.transferred_this_month)}</span><span>Sent this year: {money(selectedChef.transferred_this_year)}</span></div>}
    </> : data ? <p className="revenue-empty">Add a chef above to send wallet funds.</p> : <p className="revenue-loading" role="status">Loading chef wallet details…</p>}
  </section>;
}

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import "./RevenueWalletPage.css";

const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let script = document.querySelector("script[data-razorpay-checkout]");
    if (!script) {
      script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.dataset.razorpayCheckout = "true";
      document.body.appendChild(script);
    }
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
  });
}

export function ChefRevenuePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const refresh = useCallback(() => requestJson("/api/chef/revenue").then(setData).catch((reason) => setError(reason.message)), []);
  useEffect(() => { refresh(); }, [refresh]);
  useRealtimeEvents({ enabled: true, onEvent: refresh, onReconnect: refresh });
  return <ChefLayout title="Revenue & Wallet">
    <RevenueContent data={data} error={error} title="Your earnings" description="Amounts your manager has transferred to your DineBook wallet." />
    {data?.transactions?.length > 0 && <section className="revenue-card"><h2>Wallet activity</h2><ul className="revenue-transaction-list">{data.transactions.slice(0, 20).map((transaction) => <li key={transaction.id}><span>{transaction.description} · {new Date(transaction.created_at).toLocaleDateString()}</span><strong className={transaction.amount < 0 ? "is-debit" : "is-credit"}>{transaction.amount < 0 ? "−" : "+"}{money(Math.abs(transaction.amount))}</strong></li>)}</ul></section>}
  </ChefLayout>;
}

export function ManagerRevenuePage() {
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [topupAmount, setTopupAmount] = useState("500");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [walletBusy, setWalletBusy] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [confirmCommissionPayout, setConfirmCommissionPayout] = useState(false);
  const refresh = useCallback(async () => {
    const [result, walletResult] = await Promise.all([
      requestJson("/api/manager/revenue"), requestJson("/api/manager/wallet"),
    ]);
    setData(result);
    setWallet(walletResult);
  }, []);
  useEffect(() => { refresh().catch((reason) => setError(reason.message)); }, [refresh]);
  useRealtimeEvents({ enabled: true, onEvent: () => refresh().catch(() => {}), onReconnect: () => refresh().catch(() => {}) });
  async function addWalletMoney(event) {
    event.preventDefault(); setWalletBusy(true); setError(""); setNotice("");
    try {
      const amount = Number(topupAmount);
      const order = await requestJson("/api/manager/wallet/topups/order", { method: "POST", body: JSON.stringify({ amount }) });
      await loadRazorpayCheckout();
      const checkout = new window.Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency,
        name: order.name, description: order.description, order_id: order.order_id,
        theme: { color: "#641d2c" },
        handler: async (payment) => {
          try {
            await requestJson("/api/manager/wallet/topups/verify", { method: "POST", body: JSON.stringify(payment) });
            await refresh(); setNotice(`${money(amount)} added to your manager wallet.`);
          } catch (reason) { setError(reason.message); }
          finally { setWalletBusy(false); }
        },
        modal: { ondismiss: () => setWalletBusy(false) },
      });
      checkout.on("payment.failed", async (response) => {
        const payment = response.error?.metadata || {};
        try {
          await requestJson("/api/manager/wallet/topups/failure", { method: "POST", body: JSON.stringify({ razorpay_order_id: payment.order_id || order.order_id, ...(payment.payment_id ? { razorpay_payment_id: payment.payment_id } : {}) }) });
          setError(response.error?.description || "Payment failed. No funds were added.");
        } catch (reason) { setError(reason.message); }
        finally { setWalletBusy(false); }
      });
      checkout.open();
    } catch (reason) { setError(reason.message); setWalletBusy(false); }
  }
  async function payAdminCommission() {
    setPayoutBusy(true); setError(""); setNotice("");
    try {
      const result = await requestJson("/api/manager/revenue/commission-payouts", { method: "POST", body: JSON.stringify({ amount: String(data.admin_commission_outstanding) }) });
      await refresh();
      setNotice(`${money(result.amount)} sent to the admin wallet.`);
      setConfirmCommissionPayout(false);
    } catch (reason) { setError(reason.message); }
    finally { setPayoutBusy(false); }
  }
  return <ManagerLayout title="Revenue & wallets">
    <RevenueContent data={data} error={error} title="Restaurant revenue" description="Paid reservations and food orders, with the admin share tracked separately." />
    {data && <section className="revenue-card commission-card">
      <div><h2>Admin commission</h2><p>{Number(data.commission_percent).toFixed(2)}% of paid reservation fees, pre-orders, and food orders is recorded here. It stays separate from your wallet until you send it.</p></div>
      <div className="commission-due"><span>Recorded and unpaid</span><strong>{money(data.admin_commission_outstanding)}</strong>
        <button type="button" disabled={payoutBusy || Number(data.admin_commission_outstanding) <= 0 || Number(wallet?.balance) < Number(data.admin_commission_outstanding)} onClick={() => setConfirmCommissionPayout(true)}>
          {payoutBusy ? "Sending…" : "Send commission to admin"}
        </button>
        {Number(wallet?.balance) < Number(data.admin_commission_outstanding) && <small>Your wallet balance is below the recorded commission.</small>}
      </div>
      <CommissionActivity data={data} />
    </section>}
    {data && <div className="manager-wallet-workflow">
      <section className="revenue-card manager-wallet-section" id="manager-wallet">
        <div className="revenue-card-heading"><div><h2>Restaurant wallet</h2><p>Customer online payments are recorded here. Add funds with Razorpay when needed for staff payments.</p></div><strong className="revenue-wallet-balance">{money(wallet?.balance)}</strong></div>
        <form className="revenue-rate-form" onSubmit={addWalletMoney}><label>Top-up amount <span>₹<input type="number" min="100" max="50000" step="0.01" value={topupAmount} onChange={(event) => setTopupAmount(event.target.value)} /></span></label><button type="submit" disabled={walletBusy}>{walletBusy ? "Processing…" : "Add money with Razorpay"}</button></form>
        {notice && <p className="revenue-notice" role="status">{notice}</p>}
        <section className="revenue-wallet-recent" aria-labelledby="wallet-recent-transactions-title">
          <div className="revenue-wallet-transactions-heading"><div><span>WALLET ACTIVITY</span><h3 id="wallet-recent-transactions-title">Recent transactions</h3></div><Link to="/manager/payments">View transactions</Link></div>
          {wallet?.transactions?.length ? <div className="revenue-wallet-table-wrap"><table className="revenue-wallet-table"><thead><tr><th>Date</th><th>Transaction</th><th>Type</th><th>Amount</th></tr></thead><tbody>{wallet.transactions.slice(0, 5).map((transaction) => <tr key={transaction.id}><td>{new Date(transaction.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td><td>{transaction.description || "Wallet activity"}</td><td>{String(transaction.type || "—").toLowerCase()}</td><td className={transaction.amount < 0 ? "is-debit" : "is-credit"}>{transaction.amount < 0 ? "−" : "+"}{money(Math.abs(transaction.amount))}</td></tr>)}</tbody></table></div> : <p className="revenue-empty">No wallet transactions yet.</p>}
        </section>
      </section>
    </div>}
    {confirmCommissionPayout && <div className="commission-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !payoutBusy) setConfirmCommissionPayout(false); }}>
      <section className="commission-modal" role="dialog" aria-modal="true" aria-labelledby="commission-confirm-title">
        <h2 id="commission-confirm-title">Confirm admin commission payment</h2>
        <p>This will deduct <strong>{money(data?.admin_commission_outstanding)}</strong> from your manager wallet and credit it to the admin wallet.</p>
        <div><button type="button" className="commission-cancel" disabled={payoutBusy} onClick={() => setConfirmCommissionPayout(false)}>Cancel</button>
          <button type="button" disabled={payoutBusy} onClick={payAdminCommission}>{payoutBusy ? "Sending…" : "Confirm and send"}</button></div>
      </section>
    </div>}
  </ManagerLayout>;
}

export function AdminRevenuePage() {
  const [data, setData] = useState(null);
  const [rate, setRate] = useState("10");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    requestJson("/api/admin/revenue").then((result) => { setData(result); setRate(String(result.commission_percent ?? 10)); }).catch((reason) => setError(reason.message));
  }, []);
  async function save(event) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const result = await requestJson("/api/admin/revenue/settings", { method: "PATCH", body: JSON.stringify({ commission_percent: Number(rate) }) });
      setRate(String(result.commission_percent)); setNotice("Commission rate updated.");
      const refreshed = await requestJson("/api/admin/revenue"); setData(refreshed);
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }
  return <AdminLayout title="Revenue & wallets" activePath="/admin/revenue">
    <RevenueContent data={data} error={error} title="Platform revenue" description="Commission earned from paid reservations and restaurant orders." />
    {data && <section className="revenue-card commission-card"><div><h2>Commission activity</h2><p>Each manager payout is shown as one transaction for the full amount sent to the admin wallet.</p></div><CommissionActivity data={data} /></section>}
    {data && <section className="revenue-card"><h2>Platform commission</h2><p>Set the percentage for future paid reservations, pre-orders, and orders. Recorded commission amounts keep the rate they were originally given.</p>
      <form className="revenue-rate-form" onSubmit={save}><label>Commission rate <span><input type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} /> %</span></label><button type="submit" disabled={saving}>{saving ? "Saving…" : "Save rate"}</button></form>
      {notice && <p className="revenue-notice" role="status">{notice}</p>}
    </section>}
  </AdminLayout>;
}

function CommissionActivity({ data }) {
  const payouts = data.commission_payouts || [];
  return <div className="commission-activity">
    <div className="commission-records">
      <h3>{data.role === "ADMIN" ? "Payouts from managers" : "Your payouts to the admin"}</h3>
      {payouts.length ? <div className="revenue-wallet-table-wrap"><table className="revenue-wallet-table"><thead><tr><th>Date</th><th>Paid by</th><th>Amount sent</th></tr></thead><tbody>
        {payouts.map((row) => <tr key={row.id}><td>{new Date(row.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</td><td>{data.role === "ADMIN" ? (row.manager_name || "Manager") : "You"}</td><td className="is-credit">{money(row.amount)}</td></tr>)}
      </tbody></table></div> : <p className="revenue-empty">No commission payouts yet.</p>}
    </div>
  </div>;
}

function RevenueContent({ data, error, title, description }) {
  return <div className="revenue-page">
    <header className="revenue-heading"><div><span>WALLET OVERVIEW</span><h2>{title}</h2><p>{description}</p></div></header>
    {error && <p className="revenue-error" role="alert">{error}</p>}
    {!data && !error && <p className="revenue-loading" role="status">Loading revenue…</p>}
    {data && <div className="revenue-stat-grid">
      <article><span>Wallet balance</span><strong>{money(data.balance)}</strong><small>{data.role === "ADMIN" ? "Accrued commission" : data.role === "MANAGER" ? "Available to transfer" : "Transfers received"}</small></article>
      {data.role !== "CHEF" && <article><span>Paid revenue this month</span><strong>{money(data.gross_this_month)}</strong><small>Current calendar month</small></article>}
      <article><span>Earned this month</span><strong>{money(data.earned_this_month)}</strong><small>{data.role === "ADMIN" ? `${Number(data.commission_percent).toFixed(2)}% commission` : data.role === "CHEF" ? "Wallet transfers received" : "After platform commission"}</small></article>
      <article><span>Earned this year</span><strong>{money(data.earned_this_year)}</strong><small>Current calendar year</small></article>
      {data.role === "MANAGER" && <article><span>Sent to chefs this month</span><strong>{money(data.transferred_to_chefs_this_month)}</strong><small>{data.chefs?.length || 0} active chefs</small></article>}
      {data.role === "ADMIN" && <article><span>Commission this month</span><strong>{money(data.admin_commission_this_month)}</strong><small>Default rate: 10%</small></article>}
      {data.role === "ADMIN" && <article><span>Awaiting manager payouts</span><strong>{money(data.admin_commission_outstanding)}</strong><small>Recorded and unpaid</small></article>}
      {data.role === "ADMIN" && <article><span>Received this month</span><strong>{money(data.admin_received_this_month)}</strong><small>Credited to admin wallet</small></article>}
    </div>}
  </div>;
}

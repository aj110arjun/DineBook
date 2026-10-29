import CustomForm from "../../components/forms/CustomForm.jsx";
import { useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet as WalletIcon,
  Plus,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { requestJson } from "../../lib/authApi.js";
import { useRealtimeEvents } from "../../lib/useRealtimeEvents.js";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import Pagination from "../../components/Pagination.jsx";
import TransactionInvoiceButton from "../../components/TransactionInvoice.jsx";
import "./CustomerProfilePage.css";

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

export default function CustomerWalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("500");
  const [topupBusy, setTopupBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [pendingVerification, setPendingVerification] = useState(null);
  const [activityQuery, setActivityQuery] = useState("");
  const [activityType, setActivityType] = useState("ALL");
  const [activityFrom, setActivityFrom] = useState("");
  const [activityTo, setActivityTo] = useState("");
  const [activitySort, setActivitySort] = useState("newest");
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(10);
  const [activityTransactions, setActivityTransactions] = useState([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activityRefresh, setActivityRefresh] = useState(0);

  async function refreshWallet() {
    const latest = await requestJson("/api/customer/wallet");
    setWallet(latest);
    setActivityRefresh((current) => current + 1);
  }

  const realtimeStatus = useRealtimeEvents({
    enabled: Boolean(user),
    onEvent: refreshWallet,
    onReconnect: refreshWallet,
  });
  useEffect(() => {
    setActivityPage(1);
  }, [
    activityQuery,
    activityType,
    activityFrom,
    activityTo,
    activitySort,
    activityPageSize,
  ]);
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setActivityLoading(true);
      setActivityError("");
      const params = new URLSearchParams({
        page: String(activityPage),
        page_size: String(activityPageSize),
        sort: activitySort,
        transaction_type: "WALLET",
      });
      if (activityQuery.trim()) params.set("q", activityQuery.trim());
      if (activityType !== "ALL") params.set("wallet_direction", activityType);
      if (activityFrom) params.set("date_from", activityFrom);
      if (activityTo) params.set("date_to", activityTo);
      try {
        const result = await requestJson(
          `/api/customer/transactions?${params.toString()}`,
        );
        if (active) {
          setActivityTransactions(result.transactions || []);
          setActivityTotal(Number(result.total || 0));
        }
      } catch (reason) {
        if (active) setActivityError(reason.message);
      } finally {
        if (active) setActivityLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    user,
    activityPage,
    activityPageSize,
    activitySort,
    activityQuery,
    activityType,
    activityFrom,
    activityTo,
    wallet?.balance,
    activityRefresh,
  ]);
  useEffect(() => {
    setActivityPage((current) =>
      Math.min(
        current,
        Math.max(1, Math.ceil(activityTotal / activityPageSize)),
      ),
    );
  }, [activityTotal, activityPageSize]);

  useEffect(() => {
    let active = true;
    Promise.all([
      requestJson("/api/customer/me"),
      requestJson("/api/customer/wallet"),
    ])
      .then(([customer, data]) => {
        if (active) {
          setUser(customer);
          setWallet(data);
        }
      })
      .catch((reason) => {
        if (active) {
          setError(reason.message);
          if (reason.status === 401)
            navigate("/customer/login", { replace: true });
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function addMoney(event) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 100 ||
      numericAmount > 50000
    ) {
      setError("Choose an amount between ₹100 and ₹50,000.");
      return;
    }
    setTopupBusy(true);
    setError("");
    setNotice("");
    try {
      const order = await requestJson("/api/customer/wallet/topups/order", {
        method: "POST",
        body: JSON.stringify({ amount: numericAmount }),
      });
      await loadRazorpayCheckout();
      const checkout = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#641d2c" },
        handler: async (payment) => {
          try {
            const result = await requestJson(
              "/api/customer/wallet/topups/verify",
              {
                method: "POST",
                body: JSON.stringify(payment),
              },
            );
            const latest = await requestJson("/api/customer/wallet");
            setWallet(latest);
            setPendingVerification(null);
            setNotice(
              `₹${numericAmount.toFixed(2)} added to your wallet. New balance ₹${Number(result.balance).toFixed(2)}.`,
            );
          } catch (reason) {
            setPendingVerification(payment);
            setError(
              reason.message ||
                "Payment could not be verified. Contact support before retrying.",
            );
          } finally {
            setTopupBusy(false);
          }
        },
        modal: { ondismiss: () => setTopupBusy(false) },
      });
      checkout.on("payment.failed", async (response) => {
        const payment = response.error?.metadata || {};
        setTopupBusy(true);
        try {
          await requestJson("/api/customer/wallet/topups/failure", {
            method: "POST",
            body: JSON.stringify({
              razorpay_order_id: payment.order_id || order.order_id,
              ...(payment.payment_id
                ? { razorpay_payment_id: payment.payment_id }
                : {}),
            }),
          });
          await refreshWallet();
          setNotice(
            "Payment failed. The attempt is recorded in your wallet transactions; no funds were added.",
          );
        } catch (reason) {
          const failureMessage =
            response.error?.description ||
            "Payment failed. No wallet funds were added.";
          setError(
            `${failureMessage} We couldn't save the failed attempt: ${reason.message}`,
          );
        } finally {
          setTopupBusy(false);
        }
      });
      checkout.open();
    } catch (reason) {
      setError(reason.message || "Unable to start wallet top-up.");
      setTopupBusy(false);
    }
  }

  async function addTestMoney() {
    const numericAmount = Number(amount);
    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 100 ||
      numericAmount > 50000
    ) {
      setError("Choose an amount between ₹100 and ₹50,000.");
      return;
    }
    setTopupBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson("/api/customer/wallet/manual-topup", {
        method: "POST",
        body: JSON.stringify({ amount: numericAmount }),
      });
      setWallet(await requestJson("/api/customer/wallet"));
      setNotice(
        `₹${numericAmount.toFixed(2)} added in test mode. New balance ₹${Number(result.balance).toFixed(2)}.`,
      );
    } catch (reason) {
      setError(reason.message || "Unable to add test funds.");
    } finally {
      setTopupBusy(false);
    }
  }

  async function retryVerification() {
    if (!pendingVerification) return;
    setTopupBusy(true);
    setError("");
    try {
      const result = await requestJson("/api/customer/wallet/topups/verify", {
        method: "POST",
        body: JSON.stringify(pendingVerification),
      });
      setWallet(await requestJson("/api/customer/wallet"));
      setPendingVerification(null);
      setNotice(
        `Top-up verified. New wallet balance ₹${Number(result.balance).toFixed(2)}.`,
      );
    } catch (reason) {
      setError(reason.message || "Payment has not been confirmed yet.");
    } finally {
      setTopupBusy(false);
    }
  }

  return (
    <ProfileFrame user={user} active="Wallet">
      <section className="profile-card customer-wallet-page">
        <div className="profile-card-title">
          <div>
            <span className="wallet-eyebrow">DINEBOOK ACCOUNT</span>
            <h1>My wallet</h1>
          </div>
          <WalletIcon size={23} />
        </div>
        <p className="wallet-intro">
          Use your wallet balance to pay for restaurant reservations and
          preorders.
        </p>
        <p
          className={`realtime-status realtime-${realtimeStatus}`}
          aria-live="polite"
        >
          {realtimeStatus === "connected"
            ? "Live balance updates connected"
            : realtimeStatus === "reconnecting"
              ? "Reconnecting to live updates…"
              : realtimeStatus === "disconnected"
                ? "Live updates disconnected · Refresh to sync"
                : "Connecting to live updates…"}
        </p>
        <div className="wallet-balance-card">
          <span>AVAILABLE BALANCE</span>
          <strong>₹{Number(wallet?.balance || 0).toFixed(2)}</strong>
          <small>
            Wallet funds are securely managed in your DineBook account.
          </small>
        </div>
        <CustomForm className="wallet-topup-card" onSubmit={addMoney}>
          <div className="wallet-topup-heading">
            <div>
              <span className="wallet-eyebrow">ADD FUNDS</span>
              <h2>Add money to your wallet</h2>
              <p>
                Choose a test credit without payment or top up securely through
                Razorpay.
              </p>
            </div>
            <Plus size={19} />
          </div>
          <div className="wallet-topup-controls">
            <label htmlFor="wallet-topup-amount">
              Amount (INR)
              <span className="wallet-topup-input">
                <span>₹</span>
                <input
                  id="wallet-topup-amount"
                  type="number"
                  min="100"
                  max="50000"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </span>
            </label>
            <div
              className="wallet-topup-presets"
              aria-label="Suggested top-up amounts"
            >
              {[500, 1000, 2000, 5000].map((value) => (
                <button
                  type="button"
                  className={Number(amount) === value ? "selected" : ""}
                  key={value}
                  onClick={() => setAmount(String(value))}
                >
                  ₹{value.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            <div className="wallet-topup-actions">
              {wallet?.manual_topups_enabled && (
                <button
                  type="button"
                  className="wallet-topup-submit manual"
                  disabled={topupBusy || !wallet}
                  onClick={addTestMoney}
                >
                  {topupBusy ? (
                    "Processing…"
                  ) : (
                    <>
                      <Plus size={16} /> Add test funds
                    </>
                  )}
                </button>
              )}
              <button
                type="submit"
                className="wallet-topup-submit"
                disabled={topupBusy || !wallet}
              >
                {topupBusy ? (
                  "Opening secure checkout…"
                ) : (
                  <>
                    <CreditCard size={16} /> Add ₹
                    {Number(amount || 0).toLocaleString("en-IN")} via Razorpay
                  </>
                )}
              </button>
            </div>
          </div>
          {wallet?.manual_topups_enabled && (
            <p className="wallet-test-mode-note">
              Test mode is active. Manual credits do not collect or charge
              money.
            </p>
          )}
          {error && (
            <p className="wallet-topup-message error" role="alert">
              {error}
            </p>
          )}
          {pendingVerification && (
            <button
              type="button"
              className="wallet-topup-retry"
              disabled={topupBusy}
              onClick={retryVerification}
            >
              Check payment status
            </button>
          )}
          {notice && (
            <p className="wallet-topup-message success" role="status">
              {notice}
            </p>
          )}
        </CustomForm>
        <div className="wallet-history-heading" id="activity">
          <div>
            <h2>Wallet activity</h2>
            <p>Your latest credits, payments, and refunds.</p>
          </div>
          <span>{activityTotal} entries</span>
        </div>
        {wallet && (
          <div className="wallet-activity-toolbar">
            <label>
              Search activity
              <input
                type="search"
                value={activityQuery}
                onChange={(event) => setActivityQuery(event.target.value)}
                placeholder="Transaction, order, or reservation reference"
              />
            </label>
            <label>
              Type
              <select
                value={activityType}
                onChange={(event) => setActivityType(event.target.value)}
              >
                <option value="ALL">All activity</option>
                <option value="CREDIT">Credits and refunds</option>
                <option value="DEBIT">Payments</option>
              </select>
            </label>
            <label>
              From
              <input
                type="date"
                value={activityFrom}
                onChange={(event) => setActivityFrom(event.target.value)}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={activityTo}
                onChange={(event) => setActivityTo(event.target.value)}
              />
            </label>
            <label>
              Sort
              <select
                value={activitySort}
                onChange={(event) => setActivitySort(event.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount-low">Amount: low to high</option>
                <option value="amount-high">Amount: high to low</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setActivityQuery("");
                setActivityType("ALL");
                setActivityFrom("");
                setActivityTo("");
                setActivitySort("newest");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
        {error ? (
          <p className="wallet-empty" role="alert">
            {error}
          </p>
        ) : !wallet ? (
          <p className="wallet-empty" role="status">
            Loading wallet…
          </p>
        ) : activityError ? (
          <p className="wallet-empty" role="alert">
            {activityError}
          </p>
        ) : activityLoading && activityTotal === 0 ? (
          <p className="wallet-empty" role="status">
            Loading wallet activity…
          </p>
        ) : activityTotal === 0 &&
          wallet.transactions.length === 0 &&
          !activityQuery.trim() &&
          activityType === "ALL" &&
          !activityFrom &&
          !activityTo ? (
          <div className="wallet-empty">
            <WalletIcon size={25} />
            <strong>No wallet activity yet</strong>
            <p>Credits and reservation payments will appear here.</p>
          </div>
        ) : activityTotal === 0 ? (
          <div className="wallet-empty">
            No wallet activity matches these filters.
          </div>
        ) : (
          <div className="customer-transactions-list wallet-transactions">
            {activityTransactions.map((transaction) => {
              const credit =
                transaction.status === "CREDITED" ||
                transaction.status === "REFUNDED";
              const isRefund = transaction.status === "REFUNDED";
              const isTopUp = /wallet top.?up/i.test(
                transaction.description || "",
              );
              const linkedReference = /^(reservation|food-order):(.+)$/i.exec(
                transaction.provider_reference || "",
              );
              const relatedId = transaction.related_id || linkedReference?.[2];
              const relatedPrefix =
                transaction.related_id ||
                linkedReference?.[1]?.toLowerCase() === "reservation"
                  ? "RES"
                  : "ORD";
              const invoice = {
                category: isRefund
                  ? "refund"
                  : isTopUp
                    ? "wallet_top_up"
                    : "wallet",
                transactionId: transaction.id,
                transactionPrefix: isRefund ? "RFD" : "WLT",
                relatedId,
                relatedPrefix,
                relatedLabel:
                  relatedPrefix === "RES" ? "Reservation ID" : "Order ID",
                typeLabel: transaction.description,
                description: transaction.description,
                amount: Math.abs(Number(transaction.amount || 0)),
                subtotal: Math.abs(Number(transaction.amount || 0)),
                currency: "INR",
                status: isRefund ? "Refunded" : credit ? "Credited" : "Debited",
                paymentMethod: isTopUp ? "Razorpay" : "DineBook wallet",
                provider: isTopUp ? "Razorpay" : undefined,
                providerReference: isTopUp
                  ? transaction.provider_reference
                  : undefined,
                providerOrderReference: isTopUp
                  ? transaction.provider_order_reference
                  : undefined,
                refundAmount: isRefund
                  ? Math.abs(Number(transaction.amount || 0))
                  : undefined,
                refundStatus: isRefund ? "Refunded" : undefined,
                refundReference: isRefund ? transaction.id : undefined,
                originalPaymentReference: isRefund
                  ? transaction.reference
                  : undefined,
                createdAt: transaction.created_at,
                customerName: user?.name,
                customerEmail: user?.email,
              };
              return (
                <article
                  className="customer-transaction-row wallet-transaction"
                  key={transaction.id}
                >
                  <span
                    className={`customer-transaction-icon wallet-transaction-icon ${credit ? "credit" : "debit"}`}
                  >
                    {credit ? (
                      <ArrowDownLeft size={17} />
                    ) : (
                      <ArrowUpRight size={17} />
                    )}
                  </span>
                  <div className="customer-transaction-main wallet-transaction-copy">
                    <strong>
                      {isTopUp
                        ? "Wallet top-up"
                        : isRefund
                          ? "Wallet refund"
                          : credit
                            ? "Wallet credit"
                            : "Wallet payment"}
                    </strong>
                    <span>{transaction.description}</span>
                    <small>
                      <CreditCard size={13} />
                      {isTopUp ? "Razorpay" : "DineBook Wallet"}
                      {transaction.provider_reference
                        ? ` · Reference: ${transaction.provider_reference}`
                        : ""}
                    </small>
                    <small>
                      <CalendarDays size={13} />
                      {new Date(transaction.created_at).toLocaleString(
                        "en-IN",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </small>
                  </div>
                  <div className="customer-transaction-side">
                    <strong
                      className={
                        credit ? "wallet-credit-amount" : "wallet-debit-amount"
                      }
                    >
                      {credit ? "+" : "−"}₹
                      {Math.abs(transaction.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                    <span
                      className={`customer-transaction-status status-${String(transaction.status || "").toLowerCase()}`}
                    >
                      {transaction.status === "FAILED"
                        ? "Failed"
                        : isRefund
                          ? "Refunded"
                          : credit
                            ? "Credited"
                            : "Debited"}
                    </span>
                    <Link
                      to={`/customer/profile/transactions/wallet/${encodeURIComponent(transaction.id)}`}
                    >
                      View details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {activityTotal > 0 && (
          <Pagination
            page={activityPage}
            pageSize={activityPageSize}
            total={activityTotal}
            onPageChange={setActivityPage}
            label="transactions"
          />
        )}
      </section>
    </ProfileFrame>
  );
}

import { Bell, CalendarDays, CreditCard, ShieldCheck, Star, Store, Users, UtensilsCrossed } from "lucide-react";
import Notice from "../../components/auth/Notice.jsx";
import ManagerLayout from "../../components/manager/ManagerLayout.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import { useAccountPreferences } from "../../components/preferences/AccountPreferences.jsx";
import { GeneralSettingsSection, ToggleSetting } from "../../components/preferences/SettingsControls.jsx";
import "../../assets/css/ManagerSettingsPage.css";

const groups = [
  ["Notification channel", Bell, [
    ["in_app_enabled", "In-app notifications", "Receive optional restaurant updates in your notification center and pop-up alerts."],
  ]],
  ["Reservations", CalendarDays, [
    ["reservation_confirmation", "Confirmed reservations", "An alert when a restaurant reservation is confirmed."],
    ["reservation_reminders", "Reservation reminders", "Reminders for upcoming restaurant bookings when available."],
    ["reservation_updates", "Reservation changes and cancellations", "Updates to your restaurant's reservations."],
  ]],
  ["Orders", UtensilsCrossed, [
    ["order_confirmation", "New orders", "An alert when a customer places an order."],
    ["order_status_updates", "Order status updates", "Kitchen preparation, ready-to-serve, and other order updates."],
    ["order_completion", "Completed orders", "An update when an order is completed."],
  ]],
  ["Payments and wallet", CreditCard, [
    ["payment_confirmation", "Payment confirmation", "Optional alerts for successful payments."],
    ["refund_updates", "Refund updates", "Updates when a refund is processed."],
    ["wallet_transactions", "Wallet transactions", "Updates when money moves in your manager wallet."],
  ]],
  ["Reviews", Star, [
    ["review_updates", "Review updates", "Restaurant review and moderation alerts when available."],
  ]],
  ["Restaurant and team", Users, [
    ["staff_updates", "Kitchen team updates", "Optional staff and kitchen team alerts when available."],
  ]],
  ["Restaurant application", Store, [
    ["approval_updates", "Application updates", "Updates about your restaurant application and approval."],
  ]],
];

export function ManagerSettingsContent({ preferences }) {
  const { settings, loading, pending, error, success, load, save } = preferences;
  const disabled = Boolean(pending) || loading;
  return <>
    <header className="customer-settings-heading">
      <h2>Settings</h2>
      <p>Manage your notification preferences and Manager Portal appearance.</p>
    </header>
    <Notice message={success} type="success" />
    {error && <div><Notice message={error.message || "Unable to load or save settings."} />
      {!settings && <button className="db-portal-button db-portal-control" type="button" disabled={loading} onClick={load}>Try again</button>}
    </div>}
    {!settings ? <div className="customer-settings-loading profile-card" role="status" aria-busy={loading || !error}>
      <span className="loading-mark">D</span>
      <p>{loading || !error ? "Loading your settings…" : "Your settings are unavailable."}</p>
    </div> : <>
      <section className="profile-card customer-settings-card" aria-labelledby="notification-settings-title" aria-busy={Boolean(pending)}>
        <header><span className="customer-settings-icon"><Bell size={22} aria-hidden="true" /></span><div><h2 id="notification-settings-title">Notification Settings</h2><p>Choose which restaurant updates you receive.</p></div></header>
        <p className="customer-settings-security"><ShieldCheck size={19} aria-hidden="true" />Security, account protection, failed payments, and restaurant suspension notices remain active.</p>
        {groups.map(([title, Icon, fields]) => <fieldset key={title} className="customer-settings-group">
          <legend><Icon size={17} aria-hidden="true" />{title}</legend>
          {fields.map(([key, label, help]) => <ToggleSetting key={key} label={label} help={help} checked={settings.notifications[key]}
            disabled={disabled} saving={pending === key} onChange={(value) => save("notifications", key, value)} />)}
        </fieldset>)}
        <p className="customer-settings-note">Changes apply to new notifications. Existing notifications remain in your notification center. Manager email is currently used for essential account messages, so email delivery has no optional switch.</p>
      </section>
      <GeneralSettingsSection preferences={preferences} portal="Manager Portal" />
    </>}
    <p className="customer-settings-save-state" role="status">{pending ? "Saving your preference…" : settings ? "Changes are saved automatically to your account." : ""}</p>
  </>;
}

export default function ManagerSettingsPage() {
  const preferences = useAccountPreferences();
  return <ManagerLayout title="Settings">
    <div className="manager-dashboard-content customer-settings-page manager-settings-page">
      <PortalBreadcrumb home={{ label: "Home", to: "/manager/dashboard" }} items={[{ label: "Settings" }]} className="manager-breadcrumb" />
      <ManagerSettingsContent preferences={preferences} />
    </div>
  </ManagerLayout>;
}

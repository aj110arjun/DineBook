import { Bell, CreditCard, ShieldCheck, UtensilsCrossed } from "lucide-react";
import Notice from "../../components/auth/Notice.jsx";
import ChefLayout from "../../components/chef/ChefLayout.jsx";
import PortalBreadcrumb from "../../components/PortalBreadcrumb.jsx";
import { useAccountPreferences } from "../../components/preferences/AccountPreferences.jsx";
import { GeneralSettingsSection, ToggleSetting } from "../../components/preferences/SettingsControls.jsx";
import "../../assets/css/ChefSettingsPage.css";

const groups = [
  ["Notification channel", Bell, [
    ["in_app_enabled", "In-app notifications", "Receive optional kitchen and wallet updates in your notification center and pop-up alerts."],
  ]],
  ["Kitchen orders", UtensilsCrossed, [
    ["order_confirmation", "New orders", "An alert when a customer places an order."],
    ["order_status_updates", "Order status updates", "Changes to order acceptance, preparation, and serving status."],
    ["order_completion", "Completed orders", "An update when an order is completed."],
  ]],
  ["Payments and wallet", CreditCard, [
    ["payment_confirmation", "Payment confirmation", "Optional alerts for successful payments."],
    ["refund_updates", "Refund updates", "Updates when a refund is processed."],
    ["wallet_transactions", "Wallet transactions", "Updates when money moves in your chef wallet."],
  ]],
];

export function ChefSettingsContent({ preferences }) {
  const { settings, loading, pending, error, success, load, save } = preferences;
  const disabled = Boolean(pending) || loading;
  return <>
    <header className="customer-settings-heading">
      <h2>Settings</h2>
      <p>Manage your notification preferences and Chef Portal appearance.</p>
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
        <header><span className="customer-settings-icon"><Bell size={22} aria-hidden="true" /></span><div><h2 id="notification-settings-title">Notification Settings</h2><p>Choose how you hear from DineBook.</p></div></header>
        <p className="customer-settings-security"><ShieldCheck size={19} aria-hidden="true" />Security, account protection, failed payments, and restaurant suspension notices remain active.</p>
        {groups.map(([title, Icon, fields]) => <fieldset key={title} className="customer-settings-group">
          <legend><Icon size={17} aria-hidden="true" />{title}</legend>
          {fields.map(([key, label, help]) => <ToggleSetting key={key} label={label} help={help} checked={settings.notifications[key]}
            disabled={disabled} saving={pending === key} onChange={(value) => save("notifications", key, value)} />)}
        </fieldset>)}
        <p className="customer-settings-note">Changes apply to new notifications. Existing notifications remain in your notification center. Chef email is used for essential account messages, so email delivery has no optional switch.</p>
      </section>
      <GeneralSettingsSection preferences={preferences} portal="Chef Portal" />
    </>}
    <p className="customer-settings-save-state" role="status">{pending ? "Saving your preference…" : settings ? "Changes are saved automatically to your account." : ""}</p>
  </>;
}

export default function ChefSettingsPage() {
  const preferences = useAccountPreferences();
  return <ChefLayout title="Settings">
    <div className="customer-settings-page chef-settings-page">
      <PortalBreadcrumb home={{ label: "Home", to: "/chef/dashboard" }} items={[{ label: "Settings" }]} />
      <ChefSettingsContent preferences={preferences} />
    </div>
  </ChefLayout>;
}

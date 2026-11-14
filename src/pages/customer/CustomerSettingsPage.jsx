import { useSelector } from "react-redux";
import { Bell, CalendarDays, CreditCard, ShieldCheck, Star, Tag, UtensilsCrossed } from "lucide-react";
import { useCustomerPreferences } from "../../components/customer/CustomerPreferences.jsx";
import Notice from "../../components/auth/Notice.jsx";
import ChangePasswordSection from "../../components/preferences/ChangePasswordSection.jsx";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import { GeneralSettingsSection, ToggleSetting } from "../../components/preferences/SettingsControls.jsx";
import "../../assets/css/CustomerSettingsPage.css";

const groups = [
  ["Notification channels", Bell, [
    ["email_enabled", "Email notifications", "Receive optional updates in your inbox."],
    ["in_app_enabled", "In-app notifications", "Receive optional updates in your notification center."],
  ]],
  ["Reservations", CalendarDays, [
    ["reservation_confirmation", "Reservation confirmation", "Confirmation when your table is booked."],
    ["reservation_reminders", "Reservation reminders", "Reminders before your visit."],
    ["reservation_updates", "Reservation cancellations and updates", "Changes to your booking."],
  ]],
  ["Orders", UtensilsCrossed, [
    ["order_confirmation", "Order confirmation", "Confirmation when your order is placed."],
    ["order_status_updates", "Order status updates", "Updates while your food is being prepared."],
    ["order_completion", "Order completion", "An update when your order is completed."],
  ]],
  ["Payments", CreditCard, [
    ["payment_confirmation", "Payment confirmation", "Optional payment success alerts."],
    ["refund_updates", "Refund updates", "Updates when a refund is processed."],
    ["wallet_transactions", "Wallet transactions", "Updates when money moves in your wallet."],
  ]],
  ["Offers and promotions", Tag, [
    ["promotional_offers", "Restaurant offers and promotions", "Special offers, discounts, and promotional campaigns."],
  ]],
  ["Reviews", Star, [
    ["review_updates", "Review updates and restaurant responses", "Approval, moderation, and replies to your reviews."],
  ]],
];

export function CustomerSettingsContent({ preferences, user }) {
  const { settings, loading, pending, error, success, load, save } = preferences;
  const disabled = Boolean(pending) || loading;

  return <>
    <header className="customer-settings-heading"><span className="eyebrow">YOUR ACCOUNT</span><h1>Settings</h1>
      <p>Manage your notification preferences and application settings.</p></header>
    {user?.can_change_password && <ChangePasswordSection key={preferences.accountId} role="customer" />}
    <Notice message={success} type="success" />
    {error && <div><Notice message={error.message || "Unable to load or save settings."} />
      {!settings && <button className="db-portal-button db-portal-control" type="button" disabled={loading} onClick={load}>Try again</button>}</div>}
    {!settings ? <div className="customer-settings-loading profile-card" role="status" aria-busy={loading || !error}><span className="loading-mark">D</span><p>{loading || !error ? "Loading your settings…" : "Your settings are unavailable."}</p></div> : <>
      <section className="profile-card customer-settings-card" aria-labelledby="notification-settings-title" aria-busy={Boolean(pending)}>
        <header><span className="customer-settings-icon"><Bell size={22} aria-hidden="true" /></span><div><h2 id="notification-settings-title">Notification Settings</h2><p>Choose how you hear from DineBook.</p></div></header>
        <p className="customer-settings-security"><ShieldCheck size={19} aria-hidden="true" />Security, account protection, and legally required messages remain active.</p>
        {groups.map(([title, Icon, fields]) => <fieldset key={title} className="customer-settings-group"><legend><Icon size={17} aria-hidden="true" />{title}</legend>
          {fields.map(([key, label, help]) => <ToggleSetting key={key} label={label} help={help} checked={settings.notifications[key]}
            disabled={disabled} saving={pending === key} onChange={(value) => save("notifications", key, value)} />)}</fieldset>)}
        <p className="customer-settings-note">Categories apply to both channels. Turning a channel off pauses its optional notifications. Delivery depends on the alerts available for each activity.</p>
      </section>
      <GeneralSettingsSection preferences={preferences} />
    </>}
    <p className="customer-settings-save-state" role="status">{pending ? "Saving your preference…" : settings ? "Appearance and notification preferences are saved automatically to your account." : ""}</p>
  </>;
}

export default function CustomerSettingsPage() {
  const user = useSelector((state) => state.customerSession.user);
  const preferences = useCustomerPreferences();
  return <ProfileFrame user={user} active="Settings" variant="customer-settings-page">
    <CustomerSettingsContent preferences={preferences} user={user} />
  </ProfileFrame>;
}

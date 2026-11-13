import { useId, useMemo } from "react";
import { useSelector } from "react-redux";
import { Bell, CalendarDays, CreditCard, Globe2, Monitor, ShieldCheck, Star, Tag, UtensilsCrossed } from "lucide-react";
import { useCustomerPreferences } from "../../components/customer/CustomerPreferences.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { ProfileFrame } from "./CustomerReservationsPage.jsx";
import { browserTimezone, timezoneOptions } from "../../lib/customerSettings.js";
import { formatLocalDateTime } from "../../lib/localDate.js";
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

function ToggleSetting({ label, help, checked, disabled, saving, onChange }) {
  const id = useId();
  return <div className="customer-setting-row">
    <div><label id={`${id}-label`} htmlFor={id}>{label}</label><p id={`${id}-help`}>{help}</p></div>
    <button id={id} type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-help`} aria-busy={saving} className="customer-setting-switch" disabled={disabled}
      onClick={() => onChange(!checked)}><span /></button>
  </div>;
}

function SelectSetting({ label, help, value, disabled, onChange, children }) {
  const id = useId();
  return <div className="customer-setting-select">
    <label htmlFor={id}>{label}</label><p id={`${id}-help`}>{help}</p>
    <select id={id} value={value} disabled={disabled} aria-describedby={`${id}-help`} onChange={(event) => onChange(event.target.value)}>{children}</select>
  </div>;
}

export default function CustomerSettingsPage() {
  const user = useSelector((state) => state.customerSession.user);
  const { settings, loading, pending, error, success, load, save } = useCustomerPreferences();
  const zones = useMemo(timezoneOptions, []);
  const general = settings?.general;
  const disabled = Boolean(pending) || loading;
  const updateGeneral = (key) => (value) => save("general", key, value);

  return <ProfileFrame user={user} active="Settings" variant="customer-settings-page">
    <header className="customer-settings-heading"><span className="eyebrow">YOUR ACCOUNT</span><h1>Settings</h1>
      <p>Manage your notification preferences and application settings.</p></header>
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
      <section className="profile-card customer-settings-card" aria-labelledby="general-settings-title" aria-busy={Boolean(pending)}>
        <header><span className="customer-settings-icon"><Monitor size={22} aria-hidden="true" /></span><div><h2 id="general-settings-title">General Settings</h2><p>Make DineBook feel like yours.</p></div></header>
        <div className="customer-settings-selects">
          <SelectSetting label="Theme" help="Use a light or dark appearance across the Customer Portal." value={general.theme} disabled={disabled} onChange={updateGeneral("theme")}>
            <option value="light">Light</option><option value="dark">Dark</option><option value="system">System Default</option></SelectSetting>
          <SelectSetting label="Language" help="More translations can be added as they become available." value={general.language} disabled={disabled} onChange={updateGeneral("language")}>
            <option value="en">English</option></SelectSetting>
          <SelectSetting label="Date format" help="Used for dates throughout the Customer Portal." value={general.date_format} disabled={disabled} onChange={updateGeneral("date_format")}>
            {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((format) => <option key={format} value={format}>{format}</option>)}</SelectSetting>
          <SelectSetting label="Time format" help="Used for booking times and activity timestamps." value={general.time_format} disabled={disabled} onChange={updateGeneral("time_format")}>
            <option value="12h">12-hour (AM/PM)</option><option value="24h">24-hour</option></SelectSetting>
          <SelectSetting label="Timezone" help="Activity timestamps use this timezone. Reservation dates and times stay in restaurant local time." value={general.timezone || ""} disabled={disabled} onChange={(value) => save("general", "timezone", value || null)}>
            <option value="">Browser default ({browserTimezone()})</option>{[...new Set([...zones, ...(general.timezone ? [general.timezone] : [])])].sort().map((zone) => <option key={zone} value={zone}>{zone}</option>)}</SelectSetting>
        </div>
        <div className="customer-settings-preview"><Globe2 size={18} aria-hidden="true" /><div><span>Current date and time</span><strong>{formatLocalDateTime(new Date())}</strong></div></div>
      </section>
    </>}
    <p className="customer-settings-save-state" role="status">{pending ? "Saving your preference…" : settings ? "Changes are saved automatically to your account." : ""}</p>
  </ProfileFrame>;
}

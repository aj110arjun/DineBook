import { useId, useMemo } from "react";
import { Globe2, Monitor } from "lucide-react";
import { browserTimezone, timezoneOptions } from "../../lib/customerSettings.js";
import { formatLocalDateTime } from "../../lib/localDate.js";
import "../../assets/css/CustomerSettingsPage.css";

export function ToggleSetting({ label, help, checked, disabled, saving, onChange }) {
  const id = useId();
  return <div className="customer-setting-row">
    <div><label id={`${id}-label`} htmlFor={id}>{label}</label><p id={`${id}-help`}>{help}</p></div>
    <button id={id} type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-help`} aria-busy={saving} className="customer-setting-switch" disabled={disabled}
      onClick={() => onChange(!checked)}><span /></button>
  </div>;
}

export function SelectSetting({ label, help, value, disabled, onChange, children }) {
  const id = useId();
  return <div className="customer-setting-select">
    <label htmlFor={id}>{label}</label><p id={`${id}-help`}>{help}</p>
    <select id={id} value={value} disabled={disabled} aria-describedby={`${id}-help`} onChange={(event) => onChange(event.target.value)}>{children}</select>
  </div>;
}

export function GeneralSettingsSection({ preferences, portal = "Customer Portal" }) {
  const { settings, pending, loading, save } = preferences;
  const zones = useMemo(timezoneOptions, []);
  const general = settings.general;
  const disabled = Boolean(pending) || loading;
  const update = (key) => (value) => save("general", key, value);
  return <section className="profile-card customer-settings-card" aria-labelledby="general-settings-title" aria-busy={Boolean(pending)}>
    <header><span className="customer-settings-icon"><Monitor size={22} aria-hidden="true" /></span><div><h2 id="general-settings-title">General Settings</h2><p>Make DineBook feel like yours.</p></div></header>
    <div className="customer-settings-selects">
      <SelectSetting label="Theme" help={`Use a light or dark appearance across the ${portal}.`} value={general.theme} disabled={disabled} onChange={update("theme")}>
        <option value="light">Light</option><option value="dark">Dark</option><option value="system">System Default</option>
      </SelectSetting>
      <SelectSetting label="Language" help="More translations can be added as they become available." value={general.language} disabled={disabled} onChange={update("language")}>
        <option value="en">English</option>
      </SelectSetting>
      <SelectSetting label="Date format" help={`Used for dates throughout the ${portal}.`} value={general.date_format} disabled={disabled} onChange={update("date_format")}>
        {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((format) => <option key={format} value={format}>{format}</option>)}
      </SelectSetting>
      <SelectSetting label="Time format" help="Used for booking times and activity timestamps." value={general.time_format} disabled={disabled} onChange={update("time_format")}>
        <option value="12h">12-hour (AM/PM)</option><option value="24h">24-hour</option>
      </SelectSetting>
      <SelectSetting label="Timezone" help="Activity timestamps use this timezone. Reservation dates and times stay in restaurant local time." value={general.timezone || ""} disabled={disabled} onChange={(value) => save("general", "timezone", value || null)}>
        <option value="">Browser default ({browserTimezone()})</option>
        {[...new Set([...zones, ...(general.timezone ? [general.timezone] : [])])].sort().map((zone) => <option key={zone} value={zone}>{zone}</option>)}
      </SelectSetting>
    </div>
    <div className="customer-settings-preview"><Globe2 size={18} aria-hidden="true" /><div><span>Current date and time</span><strong>{formatLocalDateTime(new Date())}</strong></div></div>
  </section>;
}

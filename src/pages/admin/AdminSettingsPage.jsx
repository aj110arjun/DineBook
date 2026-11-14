import { Bell, ShieldCheck } from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout.jsx";
import Notice from "../../components/auth/Notice.jsx";
import ChangePasswordSection from "../../components/preferences/ChangePasswordSection.jsx";
import { useAccountPreferences } from "../../components/preferences/AccountPreferences.jsx";
import { GeneralSettingsSection, ToggleSetting } from "../../components/preferences/SettingsControls.jsx";
import "../../assets/css/AdminSettingsPage.css";

const notificationFields = [
  ["in_app_enabled", "In-app notifications", "Receive optional admin updates in your notification center and pop-up alerts."],
  ["approval_updates", "Restaurant requests", "Alerts when a new restaurant application needs your review."],
  ["review_updates", "Reviews and reports", "Alerts when a restaurant review is reported for moderation."],
  ["wallet_transactions", "Wallet activity", "Updates for credits, debits, refunds, and commission entries in your admin wallet."],
  ["system_updates", "Optional system updates", "Nonessential platform notices when available."],
];

export function AdminSettingsContent({ preferences }) {
  const { settings, loading, pending, error, success, load, save } = preferences;
  const disabled = Boolean(pending) || loading;

  return (
    <>
      <header className="customer-settings-heading">
        <h2>Settings</h2>
        <p>Manage your preferences and the appearance of the Admin Portal.</p>
      </header>

      <ChangePasswordSection key={preferences.accountId} role="admin" />

      <Notice message={success} type="success" />

      {error && (
        <div>
          <Notice message={error.message || "Unable to load or save your settings."} />
          {!settings && (
            <button
              type="button"
              className="db-portal-button db-portal-control"
              disabled={loading}
              onClick={load}
            >
              Try again
            </button>
          )}
        </div>
      )}

      {!settings ? (
        <div
          className="profile-card customer-settings-loading"
          role="status"
          aria-busy={loading || !error}
        >
          <span className="loading-mark">D</span>
          <p>{loading || !error ? "Loading your settings…" : "Your settings are unavailable."}</p>
        </div>
      ) : (
        <>
          <GeneralSettingsSection preferences={preferences} portal="Admin Portal" />

          <section
            className="profile-card customer-settings-card"
            aria-labelledby="admin-notification-settings-title"
            aria-busy={Boolean(pending)}
          >
            <header>
              <span className="customer-settings-icon"><Bell size={22} aria-hidden="true" /></span>
              <div>
                <h2 id="admin-notification-settings-title">Notification Settings</h2>
                <p>Choose which admin updates you receive.</p>
              </div>
            </header>

            <p className="customer-settings-security">
              <ShieldCheck size={19} aria-hidden="true" />
              Security, account protection, failed-payment alerts, suspension notices, and system incidents remain active.
            </p>

            <fieldset className="customer-settings-group">
              <legend>Delivery preferences</legend>
              {notificationFields.map(([key, label, help]) => (
                <ToggleSetting
                  key={key}
                  label={label}
                  help={help}
                  checked={settings.notifications[key]}
                  disabled={disabled}
                  saving={pending === key}
                  onChange={(value) => save("notifications", key, value)}
                />
              ))}
            </fieldset>

            <p className="customer-settings-note">
              Preferences apply to newly created notifications. Existing notifications stay in your notification center.
              These switches control in-app delivery.
            </p>
          </section>
        </>
      )}

      <p className="customer-settings-save-state" role="status">
        {pending ? "Saving your preference…" : settings ? "Appearance and notification preferences are saved automatically to your account." : ""}
      </p>
    </>
  );
}

export default function AdminSettingsPage() {
  const preferences = useAccountPreferences();
  return (
    <AdminLayout title="Settings">
      <div className="admin-dashboard-content customer-settings-page admin-settings-page">
        <AdminSettingsContent preferences={preferences} />
      </div>
    </AdminLayout>
  );
}

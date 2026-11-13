import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Bell,
  CalendarDays,
  Camera,
  CreditCard,
  Heart,
  LogOut,
  Pencil,
  UserRound,
  Wallet,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CustomerHeader from "../../components/landing/CustomerHeader.jsx";
import LandingFooter from "../../components/landing/LandingFooter.jsx";
import ConfirmActionDialog from "../../components/ConfirmActionDialog.jsx";
import ImageCropDialog from "../../components/manager/ImageCropDialog.jsx";
import Notice from "../../components/auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import {
  profileForm,
  profilePatch,
  saveCustomerProfile,
  validateAvatar,
  validateProfile,
} from "../../lib/customerProfile.js";
import {
  clearCustomerSession,
  refreshCustomerSession,
} from "../../state/customerSession.js";
import { demoCustomer, demoSessionKey } from "../../data/demoCustomer.js";
import "../../assets/css/CustomerProfilePage.css";

const preferenceDefaults = {
  cuisines: [],
  dietary: [],
  seating: "No Preference",
};
const cuisines = [
  "Modern Indian",
  "Contemporary Japanese",
  "Neapolitan Italian",
  "Nordic Minimalist",
  "Seafood & Coastal",
  "French Classical",
];
const diets = [
  "Gluten-Free",
  "Vegan",
  "Keto Friendly",
  "Nut Allergy",
  "Lactose Intolerant",
  "Halal",
];
const navItems = [
  ["Personal Information", UserRound, "/customer/profile#personal"],
  ["Saved Restaurants", Heart, "/customer/saved-restaurants"],
  ["Booking History", CalendarDays, "/customer/profile/reservations"],
  ["Payment Transactions", CreditCard, "/customer/profile/transactions"],
  ["Notification Settings", Bell, "/customer/profile#notifications"],
  ["Wallet", Wallet, "/customer/profile/wallet"],
];

function readPreferences() {
  try {
    const value = JSON.parse(
      localStorage.getItem("dinebook-profile-preferences"),
    );
    if (Array.isArray(value?.cuisines) && Array.isArray(value?.dietary))
      return { ...preferenceDefaults, ...value };
  } catch {
    /* Use empty preferences until the customer chooses them. */
  }
  return preferenceDefaults;
}

function readNotifications() {
  try {
    return {
      reservationUpdates: true,
      offers: true,
      ...JSON.parse(localStorage.getItem("dinebook-notification-settings")),
    };
  } catch {
    return { reservationUpdates: true, offers: true };
  }
}

function Avatar({ user, src = user?.avatar_url, small = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  return (
    <div className={`profile-avatar${small ? " small" : ""}`}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={`${user?.name || "Your"} profile`}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <UserRound size={small ? 30 : 42} aria-label="Default profile avatar" />
      )}
    </div>
  );
}

function PersonalInformation({ user, onPersist, onSessionExpired }) {
  const [form, setForm] = useState(() => profileForm(user));
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const busyRef = useRef(false);
  const inputRef = useRef(null);
  const nameRef = useRef(null);
  const demo = user.id === demoCustomer.id;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function startEditing() {
    setForm(profileForm(user));
    setEditing(true);
    setError("");
    setSuccess("");
    setErrors({});
    window.setTimeout(() => nameRef.current?.focus(), 0);
  }

  function cancelEditing() {
    setEditing(false);
    setForm(profileForm(user));
    setFile(null);
    setCropFile(null);
    setPreview("");
    setRemoveAvatar(false);
    setErrors({});
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function selectPhoto(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    const message = validateAvatar(selected);
    setErrors((current) => ({ ...current, avatar: message }));
    event.target.value = "";
    if (message) return;
    setCropFile(selected);
  }

  function acceptCroppedPhoto(cropped) {
    const message = validateAvatar(cropped);
    if (message) throw new Error(message);
    setFile(cropped);
    setPreview(URL.createObjectURL(cropped));
    setCropFile(null);
    setRemoveAvatar(false);
    setErrors((current) => ({ ...current, avatar: "" }));
    setSuccess("");
  }

  async function save(event) {
    event.preventDefault();
    if (busyRef.current) return;
    const validation = {
      ...validateProfile(form),
      avatar: errors.avatar || validateAvatar(file),
    };
    setErrors(validation);
    const firstInvalid = Object.keys(validation).find((key) => validation[key]);
    if (firstInvalid) {
      document.getElementById(`profile-${firstInvalid}`)?.focus();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    let detailsSaved = false;
    try {
      const result = await saveCustomerProfile({
        current: user,
        form,
        file,
        removeAvatar,
        request: requestJson,
        onPersist: (value) => {
          detailsSaved = true;
          onPersist(value);
        },
      });
      setForm(profileForm(result));
      setFile(null);
      setPreview("");
      setRemoveAvatar(false);
      setEditing(false);
      setSuccess("Your profile has been updated.");
    } catch (reason) {
      if (reason.status === 401) onSessionExpired();
      else
        setError(
          `${detailsSaved ? "Your details were saved, but the photo change could not be completed. " : ""}${reason.message}`,
        );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const photo = file ? preview : removeAvatar ? null : user.avatar_url;
  const changed =
    Object.keys(profilePatch(user, form)).length > 0 ||
    Boolean(file) ||
    (removeAvatar && Boolean(user.avatar_url));
  const joined =
    user.created_at && !Number.isNaN(Date.parse(user.created_at))
      ? new Date(user.created_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <section
      className="profile-card personal-card"
      id="personal"
      aria-busy={busy}
    >
      <div className="profile-card-title">
        <div>
          <h1>Personal Information</h1>
          <p>Manage your contact details and profile photo.</p>
        </div>
        {!editing && (
          <button
            className="profile-upload"
            type="button"
            onClick={startEditing}
            disabled={demo}
          >
            <Pencil size={14} /> Edit Profile
          </button>
        )}
      </div>
      <Notice message={error} />
      <Notice message={success} type="success" />
      {demo && (
        <p className="profile-help">
          Sign in to your customer account to save profile changes.
        </p>
      )}
      <form onSubmit={save} noValidate>
        <div className="profile-photo-row">
          <Avatar user={user} src={photo} small />
          <div className="profile-photo-controls">
            {editing ? (
              <>
                <div className="profile-photo-buttons">
                  <button
                    id="profile-avatar"
                    className="profile-upload"
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                    aria-describedby="profile-photo-help profile-avatar-error"
                  >
                    <Camera size={14} />{" "}
                    {photo ? "Change Photo" : "Upload Photo"}
                  </button>
                  {(file || (user.avatar_url && !removeAvatar)) && (
                    <button
                      className="profile-remove"
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmRemove(true)}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={selectPhoto}
                  disabled={busy}
                  aria-label="Choose profile photo"
                />
                <small id="profile-photo-help">
                  JPEG, PNG, or WebP. Up to 5 MB. Crop and preview your photo
                  before saving.
                </small>
                {errors.avatar && (
                  <small
                    className="profile-field-error"
                    id="profile-avatar-error"
                    role="alert"
                  >
                    {errors.avatar}
                  </small>
                )}
                {removeAvatar && (
                  <small>
                    Your photo will be removed when you save changes.
                  </small>
                )}
              </>
            ) : (
              <>
                <strong>{user.name}</strong>
                <small>
                  {joined ? `Member since ${joined}` : "Customer account"}
                </small>
              </>
            )}
          </div>
        </div>
        <div className="profile-fields">
          <label htmlFor="profile-name">
            Full Name
            <input
              ref={nameRef}
              id="profile-name"
              name="name"
              autoComplete="name"
              value={editing ? form.name : user.name}
              readOnly={!editing}
              disabled={busy}
              required
              minLength={2}
              maxLength={120}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "profile-name-error" : undefined}
              onChange={(event) => {
                setForm({ ...form, name: event.target.value });
                setErrors({ ...errors, name: "" });
              }}
            />
            {errors.name && (
              <small className="profile-field-error" id="profile-name-error">
                {errors.name}
              </small>
            )}
          </label>
          <label htmlFor="profile-email">
            Email Address
            <input
              id="profile-email"
              type="email"
              value={user.email}
              autoComplete="email"
              readOnly
              aria-describedby="profile-email-help"
            />
            <small id="profile-email-help">
              Your sign-in email is read-only.
            </small>
          </label>
          <label htmlFor="profile-phone">
            Phone Number
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={editing ? form.phone : user.phone || ""}
              placeholder={editing ? "+91 98765 43210" : "Not provided"}
              readOnly={!editing}
              disabled={busy}
              maxLength={20}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby="profile-phone-help profile-phone-error"
              onChange={(event) => {
                setForm({ ...form, phone: event.target.value });
                setErrors({ ...errors, phone: "" });
              }}
            />
            <small id="profile-phone-help">
              Optional. Include your country code for international numbers.
            </small>
            {errors.phone && (
              <small className="profile-field-error" id="profile-phone-error">
                {errors.phone}
              </small>
            )}
          </label>
          <div className="profile-account-created">
            <span>Account Created</span>
            <strong>{joined || "Not available"}</strong>
          </div>
        </div>
        {editing && (
          <div className="profile-actions profile-edit-actions">
            <button
              className="profile-cancel"
              type="button"
              onClick={cancelEditing}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="profile-save"
              type="submit"
              disabled={busy || !changed}
            >
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </form>
      {cropFile && (
        <ImageCropDialog
          file={cropFile}
          title="Crop profile photo"
          description="Drag to position your photo and adjust the zoom. Your square crop will appear in a circle on your profile."
          aspectRatio={1}
          outputWidth={512}
          outputHeight={512}
          outputName="profile-avatar.jpg"
          confirmLabel="Use this photo"
          onCancel={() => setCropFile(null)}
          onCropped={acceptCroppedPhoto}
        />
      )}
      {confirmRemove && (
        <ConfirmActionDialog
          action="remove"
          title="Remove your profile photo?"
          description="Your default avatar will appear instead. Save Changes applies the removal; Cancel keeps your current photo."
          onCancel={() => setConfirmRemove(false)}
          onConfirm={() => {
            setFile(null);
            setPreview("");
            setRemoveAvatar(true);
            setConfirmRemove(false);
            setErrors((current) => ({ ...current, avatar: "" }));
          }}
        />
      )}
    </section>
  );
}

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.customerSession.user);
  const [prefs, setPrefs] = useState(readPreferences);
  const [notifications, setNotifications] = useState(readNotifications);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const section =
    location.hash === "#notifications"
      ? "Notification Settings"
      : "Personal Information";

  function sessionExpired() {
    dispatch(clearCustomerSession());
    navigate("/customer/login", { replace: true, state: { from: location } });
  }

  async function logout() {
    if (
      import.meta.env.DEV &&
      sessionStorage.getItem(demoSessionKey) === "active"
    ) {
      sessionStorage.removeItem(demoSessionKey);
    } else {
      await requestJson("/api/auth/logout", { method: "POST" }).catch(() => {});
    }
    sessionExpired();
  }

  function toggle(key, value) {
    setPreferencesMessage("");
    setPrefs((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  if (!user)
    return (
      <main className="landing-loading" role="status">
        <span className="loading-mark">D</span>
        <p>Loading your profile…</p>
      </main>
    );

  return (
    <div className="customer-home profile-page customer-profile-module">
      <CustomerHeader user={user} onLogout={sessionExpired} />
      <main className="profile-shell">
        <nav className="profile-crumb" aria-label="Breadcrumb">
          <Link to="/customer">Home</Link>
          <span>/</span>
          <span>Account</span>
          <span>/</span>
          <strong>{section}</strong>
        </nav>
        <div className="profile-layout">
          <aside className="profile-sidebar">
            <div className="profile-identity">
              <Avatar user={user} />
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <nav className="profile-menu" aria-label="Account navigation">
              {navItems.map(([label, Icon, to]) => (
                <Link
                  className={section === label ? "selected" : ""}
                  aria-current={section === label ? "page" : undefined}
                  key={label}
                  to={to}
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </nav>
            <button className="profile-logout" onClick={logout}>
              <LogOut size={17} />
              Logout Account
            </button>
          </aside>
          <div className="profile-content">
            <PersonalInformation
              user={user}
              onPersist={(value) => dispatch(refreshCustomerSession(value))}
              onSessionExpired={sessionExpired}
            />
            <section className="profile-card preference-card">
              <h2>Dining Preferences</h2>
              <p className="profile-help">Saved on this device.</p>
              <div className="preference-block">
                <h3>Preferred Cuisines</h3>
                <div className="cuisine-options">
                  {cuisines.map((item) => (
                    <label key={item}>
                      <input
                        type="checkbox"
                        checked={prefs.cuisines.includes(item)}
                        onChange={() => toggle("cuisines", item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div className="preference-block">
                <h3>Dietary Restrictions / Allergies</h3>
                <div className="diet-options">
                  {diets.map((item) => (
                    <button
                      type="button"
                      className={prefs.dietary.includes(item) ? "active" : ""}
                      aria-pressed={prefs.dietary.includes(item)}
                      key={item}
                      onClick={() => toggle("dietary", item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="preference-block">
                <h3>Preferred Seating Zone</h3>
                <div className="seating-options">
                  {["Indoor (AC)", "Rooftop / Outdoor", "No Preference"].map(
                    (item) => (
                      <label key={item}>
                        <input
                          type="radio"
                          name="seating"
                          checked={prefs.seating === item}
                          onChange={() => setPrefs({ ...prefs, seating: item })}
                        />
                        {item}
                      </label>
                    ),
                  )}
                </div>
              </div>
              <Notice message={preferencesMessage} type="success" />
              <div className="profile-actions">
                <button
                  type="button"
                  className="profile-cancel"
                  onClick={() => {
                    setPrefs(readPreferences());
                    setPreferencesMessage("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="profile-save"
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        "dinebook-profile-preferences",
                        JSON.stringify(prefs),
                      );
                      setPreferencesMessage(
                        "Preferences saved on this device.",
                      );
                    } catch {
                      setPreferencesMessage(
                        "Device storage is unavailable. Your preferences could not be saved.",
                      );
                    }
                  }}
                >
                  Save Preferences
                </button>
              </div>
            </section>
            <section
              className="profile-card preference-card"
              id="notifications"
            >
              <h2>Notification Settings</h2>
              <p>Choose which updates you want to receive on this device.</p>
              <div className="seating-options">
                {[
                  ["reservationUpdates", "Reservation updates"],
                  ["offers", "Offers and restaurant news"],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={notifications[key]}
                      onChange={(event) => {
                        const next = {
                          ...notifications,
                          [key]: event.target.checked,
                        };
                        setNotifications(next);
                        try {
                          localStorage.setItem(
                            "dinebook-notification-settings",
                            JSON.stringify(next),
                          );
                        } catch {
                          /* Settings still apply for this visit. */
                        }
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

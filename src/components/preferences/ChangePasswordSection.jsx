import { useEffect, useId, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import CustomForm from "../forms/CustomForm.jsx";
import { PasswordField } from "../auth/FormField.jsx";
import Notice from "../auth/Notice.jsx";
import { requestJson } from "../../lib/authApi.js";
import { refreshRealtimeSession } from "../../lib/useRealtimeEvents.js";
import { passwordChangeRequest, validatePasswordChange } from "../../lib/passwordChange.js";
import "../../assets/css/ChangePasswordSection.css";

export default function ChangePasswordSection({ role }) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const sectionRef = useRef(null);
  const triggerRef = useRef(null);
  const returnFocus = useRef(false);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (editing) sectionRef.current?.querySelector("input")?.focus();
    else if (returnFocus.current) {
      triggerRef.current?.focus();
      returnFocus.current = false;
    }
  }, [editing]);

  function open() {
    setError("");
    setSuccess("");
    setEditing(true);
  }

  function cancel() {
    setError("");
    returnFocus.current = true;
    setEditing(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (requestRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = {
      current_password: String(data.get(`${id}-current`) || ""),
      new_password: String(data.get(`${id}-new`) || ""),
      confirm_password: String(data.get(`${id}-confirm`) || ""),
    };
    const validation = validatePasswordChange(values);
    setError(validation);
    setSuccess("");
    if (validation) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    try {
      const { path, options } = passwordChangeRequest(role, values);
      await requestJson(path, {
        ...options,
        signal: controller.signal,
        fallbackMessage: "Unable to update your password. Please try again.",
      });
      if (controller.signal.aborted) return;
      form.reset();
      refreshRealtimeSession();
      returnFocus.current = true;
      setEditing(false);
      setSuccess("Your password has been updated. Other sessions will need to sign in again.");
    } catch (reason) {
      if (controller.signal.aborted) return;
      setError(reason.message || "Unable to update your password. Please try again.");
      if ([401, 403].includes(reason.status)) {
        form.reset();
        setEditing(false);
        setSessionExpired(true);
      }
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <section
      ref={sectionRef}
      className="profile-card customer-settings-card password-settings"
      aria-labelledby={`${id}-title`}
      aria-busy={busy}
    >
      <header>
        <span className="customer-settings-icon"><LockKeyhole size={22} aria-hidden="true" /></span>
        <div>
          <h2 id={`${id}-title`}>Security</h2>
          <p>Update the password you use to sign in to DineBook.</p>
        </div>
      </header>

      <Notice message={error} />
      <Notice message={success} type="success" />

      {sessionExpired ? (
        <a className="db-portal-button db-portal-control" href={`/${role}/login`}>Return to sign in</a>
      ) : editing ? (
        <CustomForm id={`${id}-form`} className="password-settings-form" onSubmit={submit}>
          <p id={`${id}-policy`} className="password-settings-help">
            Use 8–128 characters, including a letter and a number or symbol. Choose a password different from your current one.
          </p>
          <fieldset disabled={busy} aria-describedby={`${id}-policy`}>
            <PasswordField id={`${id}-current`} label="Current password" autoComplete="current-password" minLength={1} maxLength={128} required />
            <PasswordField id={`${id}-new`} label="New password" autoComplete="new-password" minLength={8} maxLength={128} required />
            <PasswordField id={`${id}-confirm`} label="Confirm new password" autoComplete="new-password" minLength={8} maxLength={128} required />
            <div className="password-settings-actions">
              <button type="submit" className="db-portal-button db-portal-control">{busy ? "Updating password…" : "Update password"}</button>
              <button type="button" className="password-settings-cancel db-portal-control" onClick={cancel}>Cancel</button>
            </div>
          </fieldset>
          <p className="password-settings-help"><a href={`/${role}/recovery`}>Forgot your current password?</a></p>
          {role === "customer" && <p className="password-settings-help">If you do not have a DineBook password yet, use password recovery to set one.</p>}
        </CustomForm>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className="password-settings-open db-portal-button db-portal-control"
          aria-expanded={editing}
          aria-controls={`${id}-form`}
          onClick={open}
        >
          Change password
        </button>
      )}
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { PasswordField } from '../../components/auth/FormField.jsx';
import Notice from '../../components/auth/Notice.jsx';
import { API_BASE, requestJson } from '../../lib/authApi.js';

export default function CustomerChangePasswordPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/api/customer/me`, { credentials: 'include', signal: controller.signal })
      .then(response => {
        if (!response.ok) navigate('/customer/login', { replace: true });
      })
      .catch(reason => {
        if (reason.name !== 'AbortError') navigate('/customer/login', { replace: true });
      })
      .finally(() => setChecking(false));
    return () => controller.abort();
  }, [navigate]);

  const hasLength = newPassword.length >= 10;
  const hasMix = /[A-Za-z]/.test(newPassword) && /[\d\W]/.test(newPassword);
  const strength = !newPassword ? 0 : Number(hasLength) + Number(hasMix) + Number(newPassword.length >= 14);

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!formElement.reportValidity()) return;
    setError('');
    setSuccess('');

    const form = new FormData(formElement);
    if (form.get('newPassword') !== form.get('confirmPassword')) {
      setError('Your new passwords don’t match.');
      return;
    }
    if (!hasLength || !hasMix) {
      setError('Choose a password with at least 10 characters, including a letter and a number or symbol.');
      return;
    }

    setBusy(true);
    try {
      await requestJson('/api/auth/customer/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: form.get('currentPassword'),
          new_password: form.get('newPassword'),
          confirm_password: form.get('confirmPassword'),
        }),
        fallbackMessage: 'We couldn’t update your password. Please try again.',
      });
      setSuccess('Your password has been updated.');
      formElement.reset();
      setNewPassword('');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <div className="grid min-h-screen place-items-center bg-cream px-6 font-sans text-sm text-stone-500">Verifying your customer session…</div>;

  return (
    <AuthLayout view="password">
      <h2 className="font-display text-3xl font-semibold text-ink">Change Password</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">Please verify your current credentials and choose a strong new password.</p>
      <form onSubmit={handleSubmit}>
        <PasswordField id="currentPassword" label="Current Password" placeholder="Enter current password" autoComplete="current-password" minLength={10} />
        <PasswordField id="newPassword" label="New Password" placeholder="At least 10 characters" autoComplete="new-password" minLength={10} value={newPassword} onChange={event => setNewPassword(event.target.value)} />
        <div className="mb-2 flex gap-1.5" data-level={strength} aria-label={`Password strength ${strength} of 3`}>{[0, 1, 2].map(level => <i key={level} className={`h-1.5 flex-1 rounded-full ${strength > level ? 'bg-emerald-500' : 'bg-stone-200'}`} />)}</div>
        <ul className="mb-5 space-y-1 text-xs text-stone-500">
          <li className={hasLength ? 'text-emerald-700' : ''}>At least 10 characters long</li>
          <li className={hasMix ? 'text-emerald-700' : ''}>Includes letters and a number or symbol</li>
        </ul>
        <PasswordField id="confirmPassword" label="Confirm New Password" placeholder="Enter your new password again" autoComplete="new-password" minLength={10} />
        <Notice message={error} />
        <Notice message={success} type="success" />
        <button className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>
          {busy ? 'Saving password…' : 'Save New Password'}{!busy && <Check size={16} />}
        </button>
        <Link className="mt-5 block text-center text-sm font-semibold text-wine hover:underline" to="/customer/login">Cancel and Return</Link>
      </form>
    </AuthLayout>
  );
}

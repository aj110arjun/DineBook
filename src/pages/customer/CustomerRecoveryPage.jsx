import { useState } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import AdminAuthLayout from '../../components/auth/AdminAuthLayout.jsx';
import ManagerAuthLayout from '../../components/auth/ManagerAuthLayout.jsx';
import ChefAuthLayout from '../../components/auth/ChefAuthLayout.jsx';
import { FormField, PasswordField } from '../../components/auth/FormField.jsx';
import Notice from '../../components/auth/Notice.jsx';
import { requestJson } from '../../lib/authApi.js';

const portalSettings = {
  customer: { label: 'customer', endpoint: '/api/auth/customer', login: '/customer/login', Layout: AuthLayout, view: 'recovery' },
  admin: { label: 'administrator', endpoint: '/api/auth/admin', login: '/admin/login', Layout: AdminAuthLayout },
  manager: { label: 'manager', endpoint: '/api/auth/manager', login: '/manager/login', Layout: ManagerAuthLayout },
  chef: { label: 'chef', endpoint: '/api/auth/chef', login: '/chef/login', Layout: ChefAuthLayout },
};

export default function CustomerRecoveryPage({ role = 'customer' }) {
  const navigate = useNavigate();
  const config = portalSettings[role] || portalSettings.customer;
  const Layout = config.Layout;
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function requestCode(event) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      await requestJson(`${config.endpoint}/forgot-password`, {
        method: 'POST', body: JSON.stringify({ email }),
        fallbackMessage: 'We couldn’t send a reset code. Please try again.',
      });
      setCodeSent(true);
      setNotice('If an account exists, a reset code has been sent. The code expires in 2 minutes.');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function resetPassword(event) {
    event.preventDefault(); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    const code = String(form.get('code') || '').trim();
    const newPassword = String(form.get('newPassword') || '');
    const confirmPassword = String(form.get('confirmPassword') || '');
    if (!/^\d{6}$/.test(code)) { setError('Enter the six digit code from your email.'); return; }
    if (newPassword !== confirmPassword) { setError('Your new passwords don’t match.'); return; }
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/[\d\W]/.test(newPassword)) {
      setError('Choose a password with at least 10 characters, including a letter and a number or symbol.'); return;
    }
    setBusy(true);
    try {
      await requestJson(`${config.endpoint}/reset-password`, {
        method: 'POST', body: JSON.stringify({ email, code, new_password: newPassword }),
        fallbackMessage: 'We couldn’t reset your password. Check the code and try again.',
      });
      navigate(config.login, { replace: true, state: { notice: 'Your password has been reset. You can now sign in.' } });
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  return (
    <Layout {...(config.view ? { view: config.view } : {})}>
      <h2 className="font-display text-3xl font-semibold text-ink">Forgot Password?</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
        {codeSent ? <>Enter the reset code sent to <strong>{email}</strong> and choose a new password. The code expires in 2 minutes.</> : `Enter the email address registered with your DineBook ${config.label} account.`}
      </p>
      {!codeSent ? (
        <form onSubmit={requestCode}>
          <FormField id="recoveryEmail" label="Registered Email" type="email" placeholder="alex@example.com" autoComplete="email" icon={Mail} value={email} onChange={event => setEmail(event.target.value)} required />
          <Notice message={error || notice} type={error ? 'error' : 'success'} />
          <button disabled={busy} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:opacity-60" type="submit">{busy ? 'Sending…' : 'Send Reset Code'} <ArrowRight size={16} /></button>
        </form>
      ) : (
        <form onSubmit={resetPassword}>
          <label className="mb-2 block text-sm font-medium text-ink" htmlFor="reset-code">Six digit reset code</label>
          <input id="reset-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required onChange={event => { event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6); }} className="mb-4 h-12 w-full rounded-lg border border-stone-200 bg-white px-4 text-center font-mono text-xl tracking-[0.4em] text-ink outline-none focus:border-wine" />
          <PasswordField id="newPassword" name="newPassword" label="New Password" autoComplete="new-password" required />
          <PasswordField id="confirmPassword" name="confirmPassword" label="Confirm New Password" autoComplete="new-password" required />
          <Notice message={error || notice} type={error ? 'error' : 'success'} />
          <button disabled={busy} className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:opacity-60" type="submit">{busy ? 'Updating…' : 'Reset Password'} <ArrowRight size={16} /></button>
          <button disabled={busy} type="button" onClick={() => { setCodeSent(false); setError(''); setNotice(''); }} className="mt-3 w-full text-sm font-semibold text-wine hover:underline">Send another code</button>
        </form>
      )}
      <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-wine hover:underline" to={config.login}><ArrowLeft size={14} /> Back to Sign In</Link>
    </Layout>
  );
}

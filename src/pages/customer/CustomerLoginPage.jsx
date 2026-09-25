import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { FormField, PasswordField } from '../../components/auth/FormField.jsx';
import Notice from '../../components/auth/Notice.jsx';
import { requestJson } from '../../lib/authApi.js';
import { demoSessionKey } from '../../data/demoCustomer.js';

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  function enterDemoCustomer() {
    sessionStorage.setItem(demoSessionKey, 'active');
    navigate('/customer');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setError('');
    setSuccess('');
    setBusy(true);

    const form = new FormData(event.currentTarget);
    try {
      const user = await requestJson('/api/auth/customer/login', {
        method: 'POST',
        body: JSON.stringify({
          email: form.get('email').trim().toLowerCase(),
          password: form.get('password'),
        }),
        fallbackMessage: 'Invalid email or password.',
      });
      setSuccess(`Welcome back, ${user.name || 'DineBook guest'}. Your sign-in was successful.`);
      window.setTimeout(() => navigate('/customer'), 500);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout view="login">
      <h2 className="font-display text-3xl font-semibold text-ink">Sign In</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">Please enter your credentials to access your DineBook account.</p>
      <form onSubmit={handleSubmit} noValidate>
        <FormField id="email" label="Email Address" type="email" placeholder="alex@example.com" autoComplete="email" icon={Mail} />
        <PasswordField id="password" label="Password" placeholder="Enter your password" autoComplete="current-password" minLength={8} />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 text-stone-600"><input className="accent-wine" type="checkbox" name="remember" /> Remember me</label>
          <span className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="font-medium text-wine hover:underline" to="/customer/recovery">Forgot Password?</Link>
            <Link className="font-medium text-wine hover:underline" to="/customer/change-password">Change Password</Link>
          </span>
        </div>
        <Notice message={error} />
        <Notice message={success} type="success" />
        <button className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in as Customer'}{!busy && <ArrowRight size={16} />}
        </button>
        {import.meta.env.DEV && (
          <button className="demo-login-button" type="button" onClick={enterDemoCustomer}>
            <span className="demo-tag">DEV PREVIEW</span>
            Continue as Demo Customer
          </button>
        )}
      </form>
      <p className="mt-7 border-t border-stone-100 pt-5 text-center text-sm text-stone-500">New to DineBook? <Link className="font-semibold text-wine hover:underline" to="/customer/register">Create an Account</Link></p>
    </AuthLayout>
  );
}

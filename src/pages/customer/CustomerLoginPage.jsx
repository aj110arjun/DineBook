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
      <h2>Sign In</h2>
      <p className="lead">Please enter your credentials to access your DineBook account.</p>
      <form onSubmit={handleSubmit} noValidate>
        <FormField id="email" label="Email Address" type="email" placeholder="alex@example.com" autoComplete="email" icon={Mail} />
        <PasswordField id="password" label="Password" placeholder="Enter your password" autoComplete="current-password" minLength={10} />
        <div className="form-options">
          <label className="check"><input type="checkbox" name="remember" /> Remember me</label>
          <span className="password-links">
            <Link to="/customer/recovery">Forgot Password?</Link>
            <Link to="/customer/change-password">Change Password</Link>
          </span>
        </div>
        <Notice message={error} />
        <Notice message={success} type="success" />
        <button className="button-primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in as Customer'}{!busy && <ArrowRight size={16} />}
        </button>
        {import.meta.env.DEV && (
          <button className="demo-login-button" type="button" onClick={enterDemoCustomer}>
            <span className="demo-tag">DEV PREVIEW</span>
            Continue as Demo Customer
          </button>
        )}
      </form>
      <p className="footnote">New to DineBook? <Link to="/customer/register">Create an Account</Link></p>
    </AuthLayout>
  );
}

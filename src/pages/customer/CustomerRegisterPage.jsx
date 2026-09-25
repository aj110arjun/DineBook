import { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { FormField, PasswordField } from '../../components/auth/FormField.jsx';
import Notice from '../../components/auth/Notice.jsx';
import { requestJson } from '../../lib/authApi.js';

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    setError('');
    setSuccess('');

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = form.get('password');
    const confirmation = form.get('confirmPassword');
    if (password !== confirmation) {
      setError('Your passwords don’t match. Check both fields and try again.');
      return;
    }

    setBusy(true);
    try {
      await requestJson('/api/auth/customer/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name').trim(),
          email: form.get('email').trim().toLowerCase(),
          password,
          confirm_password: confirmation,
        }),
        fallbackMessage: 'We couldn’t create the account. Please check your details.',
      });
      formElement.reset();
      setSuccess('Your DineBook account is ready. You can now sign in.');
      window.setTimeout(() => navigate('/customer/login'), 1100);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout view="register">
      <h2>Create Account</h2>
      <p className="lead">Create your guest profile and start planning your next dining experience.</p>
      <form onSubmit={handleSubmit} noValidate>
        <FormField id="name" label="Full Name" placeholder="Alex Morgan" autoComplete="name" minLength={2} />
        <FormField id="email" label="Email Address" type="email" placeholder="alex@example.com" autoComplete="email" icon={Mail} />
        <PasswordField id="password" label="Create Password" placeholder="At least 10 characters" autoComplete="new-password" minLength={10} />
        <PasswordField id="confirmPassword" label="Confirm Password" placeholder="Enter your password again" autoComplete="new-password" minLength={10} />
        <Notice message={error} />
        <Notice message={success} type="success" />
        <button className="button-primary" type="submit" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create Customer Account'}{!busy && <ArrowRight size={16} />}
        </button>
      </form>
      <p className="footnote">Already have an account? <Link to="/customer/login">Sign In</Link></p>
    </AuthLayout>
  );
}

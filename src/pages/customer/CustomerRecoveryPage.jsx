import { useState } from 'react';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import { FormField } from '../../components/auth/FormField.jsx';
import Notice from '../../components/auth/Notice.jsx';

export default function CustomerRecoveryPage() {
  const [notice, setNotice] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setNotice('Secure email recovery is not configured yet. Please contact DineBook support.');
  }

  return (
    <AuthLayout view="recovery">
      <h2 className="font-display text-3xl font-semibold text-ink">Forgot Password?</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">Enter the email address registered with your DineBook account.</p>
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Password recovery will be available once secure email recovery is connected to your account.</div>
      <form onSubmit={handleSubmit}>
        <FormField id="recoveryEmail" label="Registered Email" type="email" placeholder="alex@example.com" autoComplete="email" icon={Mail} />
        <Notice message={notice} type="success" />
        <button className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20" type="submit">Request Recovery Link <ArrowRight size={16} /></button>
      </form>
      <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-wine hover:underline" to="/customer/login"><ArrowLeft size={14} /> Back to Sign In</Link>
    </AuthLayout>
  );
}

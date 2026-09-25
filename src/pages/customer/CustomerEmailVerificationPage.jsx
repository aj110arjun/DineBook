import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout.jsx';
import Notice from '../../components/auth/Notice.jsx';
import { requestJson } from '../../lib/authApi.js';

export default function CustomerEmailVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || sessionStorage.getItem('dinebook-verification-email') || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!email) {
      setError('Please register first so we know which email address to verify.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six digit code from your email.');
      inputRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      await requestJson('/api/auth/customer/verify-email', {
        method: 'POST', body: JSON.stringify({ email, code }),
        fallbackMessage: 'We couldn’t verify your email. Check the code and try again.',
      });
      sessionStorage.removeItem('dinebook-verification-email');
      setNotice('Your email is confirmed. You can now sign in.');
      window.setTimeout(() => navigate('/customer/login', { replace: true }), 1000);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  async function resend() {
    setError(''); setNotice(''); setBusy(true);
    try {
      await requestJson('/api/auth/customer/resend-verification', {
        method: 'POST', body: JSON.stringify({ email }),
        fallbackMessage: 'We couldn’t send a new code. Please try again.',
      });
      setNotice('A new confirmation code is on its way.');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  return (
    <AuthLayout view="verification">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-wine/10 text-wine"><Mail size={21} /></div>
      <h2 className="font-display text-3xl font-semibold text-ink">Confirm your email</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-stone-500">
        We sent a six digit confirmation code to <span className="font-semibold text-ink">{email || 'your email address'}</span>. Enter it below to finish setting up your account.
      </p>
      <form onSubmit={submit} noValidate>
        <label className="mb-2 block text-sm font-medium text-ink" htmlFor="verification-code">Confirmation code</label>
        <input
          ref={inputRef} id="verification-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
          pattern="[0-9]{6}" maxLength={6} placeholder="000000" required value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="mb-2 h-14 w-full rounded-lg border border-stone-200 bg-white px-4 text-center font-mono text-2xl tracking-[0.55em] text-ink outline-none transition placeholder:text-stone-300 focus:border-wine focus:ring-2 focus:ring-wine/10"
          aria-describedby="code-hint"
        />
        <p id="code-hint" className="mb-5 text-xs text-stone-500">The code expires after 10 minutes.</p>
        <Notice message={error} />
        <Notice message={notice} type="success" />
        <button className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-wine px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink focus:outline-none focus:ring-4 focus:ring-wine/20 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={busy}>
          {busy ? 'Confirming…' : 'Confirm Email'} {!busy && <ArrowRight size={16} />}
        </button>
      </form>
      <div className="mt-6 text-center text-sm text-stone-500">Didn’t receive the email?{' '}
        <button type="button" onClick={resend} disabled={busy || !email} className="font-semibold text-wine hover:underline disabled:opacity-50">Send a new code</button>
      </div>
      <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-wine hover:underline" to="/customer/register"><ArrowLeft size={14} /> Back to registration</Link>
      <div className="mt-6 flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-500"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-wine" /> Your account is ready once you confirm that this email address belongs to you.</div>
    </AuthLayout>
  );
}

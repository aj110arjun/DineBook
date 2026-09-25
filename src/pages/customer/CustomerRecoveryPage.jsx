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
      <h2>Forgot Password?</h2>
      <p className="lead">Enter the email address registered with your DineBook account.</p>
      <div className="recovery-copy">Password recovery will be available once secure email recovery is connected to your account.</div>
      <form onSubmit={handleSubmit}>
        <FormField id="recoveryEmail" label="Registered Email" type="email" placeholder="alex@example.com" autoComplete="email" icon={Mail} />
        <Notice message={notice} type="success" />
        <button className="button-primary" type="submit">Request Recovery Link <ArrowRight size={16} /></button>
      </form>
      <Link className="back-link" to="/customer/login"><ArrowLeft size={14} /> Back to Sign In</Link>
    </AuthLayout>
  );
}

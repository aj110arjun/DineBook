import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerChangePasswordPage from './pages/customer/CustomerChangePasswordPage.jsx';
import CustomerLoginPage from './pages/customer/CustomerLoginPage.jsx';
import CustomerRecoveryPage from './pages/customer/CustomerRecoveryPage.jsx';
import CustomerRegisterPage from './pages/customer/CustomerRegisterPage.jsx';
import CustomerLandingPage from './pages/customer/CustomerLandingPage.jsx';
import CustomerEmailVerificationPage from './pages/customer/CustomerEmailVerificationPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer" replace />} />
      <Route path="/customer" element={<CustomerLandingPage />} />
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/register" element={<CustomerRegisterPage />} />
      <Route path="/customer/verify-email" element={<CustomerEmailVerificationPage />} />
      <Route path="/customer/recovery" element={<CustomerRecoveryPage />} />
      <Route path="/customer/change-password" element={<CustomerChangePasswordPage />} />
      <Route path="*" element={<Navigate to="/customer/login" replace />} />
    </Routes>
  );
}

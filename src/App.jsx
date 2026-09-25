import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerChangePasswordPage from './pages/customer/CustomerChangePasswordPage.jsx';
import CustomerLoginPage from './pages/customer/CustomerLoginPage.jsx';
import CustomerRecoveryPage from './pages/customer/CustomerRecoveryPage.jsx';
import CustomerRegisterPage from './pages/customer/CustomerRegisterPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer/login" replace />} />
      <Route path="/customer/login" element={<CustomerLoginPage />} />
      <Route path="/customer/register" element={<CustomerRegisterPage />} />
      <Route path="/customer/recovery" element={<CustomerRecoveryPage />} />
      <Route path="/customer/change-password" element={<CustomerChangePasswordPage />} />
      <Route path="*" element={<Navigate to="/customer/login" replace />} />
    </Routes>
  );
}

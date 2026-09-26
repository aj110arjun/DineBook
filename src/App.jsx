import { Navigate, Route, Routes } from "react-router-dom";
import CustomerChangePasswordPage from "./pages/customer/CustomerChangePasswordPage.jsx";
import CustomerLoginPage from "./pages/customer/CustomerLoginPage.jsx";
import CustomerRecoveryPage from "./pages/customer/CustomerRecoveryPage.jsx";
import CustomerRegisterPage from "./pages/customer/CustomerRegisterPage.jsx";
import CustomerLandingPage from "./pages/customer/CustomerLandingPage.jsx";
import CustomerEmailVerificationPage from "./pages/customer/CustomerEmailVerificationPage.jsx";
import GuestOnlyRoute from "./components/auth/GuestOnlyRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import AdminProtectedRoute from "./components/auth/AdminProtectedRoute.jsx";
import AdminLoginPage from "./pages/admin/AdminLoginPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/customer" replace />} />
      <Route path="/customer" element={<CustomerLandingPage />} />
      <Route
        path="/customer/login"
        element={
          <GuestOnlyRoute>
            <CustomerLoginPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/customer/register"
        element={
          <GuestOnlyRoute>
            <CustomerRegisterPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/customer/verify-email"
        element={<CustomerEmailVerificationPage />}
      />
      <Route path="/customer/recovery" element={<CustomerRecoveryPage />} />
      <Route
        path="/customer/change-password"
        element={<CustomerChangePasswordPage />}
      />
      <Route path="*" element={<Navigate to="/customer/login" replace />} />

      <Route
        path="/admin/login"
        element={
          <GuestOnlyRoute>
            <AdminLoginPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminDashboardPage />
          </AdminProtectedRoute>
        }
      />
    </Routes>
  );
}
